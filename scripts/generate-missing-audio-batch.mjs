#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import * as storyAudio from "./generate-new-book-audio.mjs";
import * as wordAudio from "./generate-word-audio.mjs";

const ROOT = storyAudio.ROOT;
const MODEL = storyAudio.MODEL;
const VOICE = storyAudio.VOICE;
const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";
const CREATE_URL = `${API_ROOT}/models/${MODEL}:batchGenerateContent`;
const REQUEST_TIMEOUT_MS = 180_000;
const MAX_BATCH_SIZE = 20;
const TERMINAL_STATES = new Set([
  "JOB_STATE_SUCCEEDED",
  "JOB_STATE_FAILED",
  "JOB_STATE_CANCELLED",
  "JOB_STATE_EXPIRED",
  "BATCH_STATE_SUCCEEDED",
  "BATCH_STATE_FAILED",
  "BATCH_STATE_CANCELLED",
  "BATCH_STATE_EXPIRED",
]);
const ACTIVE_PHASES = new Set([
  "prepared",
  "submitted",
  "polling",
  "processing",
  "processing_failed",
]);
const sensitiveValues = new Set();

function usage() {
  return [
    "Generate only missing picture-book or word audio through Gemini Batch API.",
    "",
    "Usage:",
    "  node scripts/generate-missing-audio-batch.mjs --scope story",
    "  node scripts/generate-missing-audio-batch.mjs --scope story --id-prefix dinosaur-close-reading/page-12/",
    "  node scripts/generate-missing-audio-batch.mjs --scope word",
    "  node scripts/generate-missing-audio-batch.mjs --scope story --dry-run",
    "",
    "Credentials: GEMINI_API_KEY, or GEMINI_KEY_PROJECT + GEMINI_KEY_NAME.",
    "Each Batch creation is journaled before POST so an uncertain submission is never repeated.",
  ].join("\n");
}

function positiveInteger(value, name) {
  if (!/^\d+$/.test(value || "") || Number(value) < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return Number(value);
}

function parseArguments(argv) {
  const options = {
    scope: null,
    batchSize: 10,
    pollIntervalMs: 15_000,
    maxBatches: Number.POSITIVE_INFINITY,
    dryRun: false,
    idPrefix: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--scope") options.scope = argv[++index];
    else if (argument === "--batch-size") options.batchSize = positiveInteger(argv[++index], argument);
    else if (argument === "--poll-interval") options.pollIntervalMs = positiveInteger(argv[++index], argument) * 1_000;
    else if (argument === "--max-batches") options.maxBatches = positiveInteger(argv[++index], argument);
    else if (argument === "--id-prefix") {
      options.idPrefix = argv[++index];
      if (!options.idPrefix || /[\r\n\0]/.test(options.idPrefix)) throw new Error("--id-prefix must be a non-empty job ID prefix.");
    }
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--help" || argument === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    } else throw new Error(`Unknown option: ${argument}\n\n${usage()}`);
  }
  if (!["story", "word"].includes(options.scope)) throw new Error("--scope must be story or word.");
  if (options.batchSize > MAX_BATCH_SIZE) throw new Error(`--batch-size cannot exceed ${MAX_BATCH_SIZE}.`);
  return options;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function safeMessage(value) {
  let safe = String(value || "Unknown error")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted Google API key]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
  for (const secret of sensitiveValues) safe = safe.split(secret).join("[redacted]");
  return safe.replace(/[\r\n]+/g, " ").slice(0, 700);
}

function wait(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
}

async function getApiKey() {
  const key = await storyAudio.apiKey();
  sensitiveValues.add(key);
  return key;
}

function planSha256(jobs) {
  return sha256(stableJson(jobs.map((job) => ({ id: job.id, requestSha256: job.requestSha256 }))));
}

async function verifiedRecord(record, job, inspect) {
  if (!record || record.requestSha256 !== job.requestSha256) return false;
  const standardPath = join(ROOT, "public", job.standardPath);
  const childPath = join(ROOT, "public", job.childPath);
  if (!(await exists(standardPath)) || !(await exists(childPath))) return false;
  const [standard, child] = await Promise.all([inspect(standardPath), inspect(childPath)]);
  return standard.sha256 === record.standard?.sha256 && child.sha256 === record.child?.sha256;
}

async function saveStoryState(state) {
  state.manifest.jobs = state.jobs.map((job) => state.records.get(job.id)).filter(Boolean);
  state.manifest.expectedJobs = state.jobs.length;
  state.manifest.planSha256 = planSha256(state.jobs);
  state.manifest.updatedAt = new Date().toISOString();
  if (state.manifest.jobs.length === state.jobs.length) {
    state.manifest.completedAt = state.manifest.completedAt || new Date().toISOString();
  } else {
    delete state.manifest.completedAt;
  }
  await storyAudio.atomicJson(storyAudio.MANIFEST_PATH, state.manifest);
}

async function saveWordState(state) {
  state.manifest.jobs = state.jobs.map((job) => state.records.get(job.id)).filter(Boolean);
  state.manifest.expectedJobs = state.jobs.length;
  state.manifest.planSha256 = planSha256(state.jobs);
  state.manifest.updatedAt = new Date().toISOString();
  if (state.manifest.jobs.length === state.jobs.length) {
    state.manifest.completedAt = state.manifest.completedAt || new Date().toISOString();
  } else {
    delete state.manifest.completedAt;
  }
  await wordAudio.atomicJson(wordAudio.MANIFEST_PATH, state.manifest);
}

async function loadStoryState({ applyCopies }) {
  const jobs = storyAudio.planJobs();
  const loaded = JSON.parse(await readFile(storyAudio.MANIFEST_PATH, "utf8"));
  if (
    loaded?.schemaVersion !== 1 ||
    loaded?.model !== storyAudio.MODEL ||
    loaded?.voice !== storyAudio.VOICE ||
    loaded?.promptVersion !== storyAudio.PROMPT_VERSION ||
    loaded?.childTransformVersion !== storyAudio.CHILD_TRANSFORM_VERSION ||
    !Number.isInteger(loaded?.expectedJobs) ||
    loaded.expectedJobs > jobs.length ||
    !Array.isArray(loaded?.jobs)
  ) throw new Error("New-book audio manifest identity does not match the current plan.");

  const state = {
    scope: "story",
    jobs,
    manifest: { ...loaded, expectedJobs: jobs.length },
    records: new Map(),
    inspect: storyAudio.inspect,
    save: saveStoryState,
  };
  const loadedById = new Map(loaded.jobs.map((record) => [record.id, record]));
  const reusable = new Map();
  for (const job of jobs) {
    const record = loadedById.get(job.id);
    if (await verifiedRecord(record, job, storyAudio.inspect)) {
      state.records.set(job.id, record);
      reusable.set(job.requestSha256, record);
    }
  }
  for (const job of jobs) {
    if (state.records.has(job.id)) continue;
    const canonical = reusable.get(job.requestSha256);
    if (!canonical) continue;
    if (!applyCopies) {
      state.records.set(job.id, { ...job, dryRunCopy: true });
      continue;
    }
    const standardPath = join(ROOT, "public", job.standardPath);
    const childPath = join(ROOT, "public", job.childPath);
    await Promise.all([mkdir(dirname(standardPath), { recursive: true }), mkdir(dirname(childPath), { recursive: true })]);
    await Promise.all([
      copyFile(join(ROOT, "public", canonical.standardPath), standardPath),
      copyFile(join(ROOT, "public", canonical.childPath), childPath),
    ]);
    const [standard, child] = await Promise.all([storyAudio.inspect(standardPath), storyAudio.inspect(childPath)]);
    const record = {
      ...job,
      model: storyAudio.MODEL,
      voice: storyAudio.VOICE,
      promptVersion: storyAudio.PROMPT_VERSION,
      pacing: canonical.pacing,
      standard,
      child,
      source: { type: "verified-copy", canonicalId: canonical.id },
      usageMetadata: null,
      generatedAt: new Date().toISOString(),
    };
    state.records.set(job.id, record);
    reusable.set(job.requestSha256, record);
  }
  if (applyCopies) await state.save(state);
  return state;
}

async function loadWordState({ applyCopies }) {
  const jobs = wordAudio.planJobs();
  const loaded = JSON.parse(await readFile(wordAudio.MANIFEST_PATH, "utf8"));
  if (
    loaded?.schemaVersion !== 1 ||
    loaded?.model !== wordAudio.MODEL ||
    loaded?.voice !== wordAudio.VOICE ||
    loaded?.promptVersion !== wordAudio.PROMPT_VERSION ||
    !Number.isInteger(loaded?.expectedJobs) ||
    loaded.expectedJobs > jobs.length ||
    !Array.isArray(loaded?.jobs)
  ) throw new Error("Word-audio manifest identity does not match the current plan.");

  const state = {
    scope: "word",
    jobs,
    manifest: { ...loaded, expectedJobs: jobs.length },
    records: new Map(),
    inspect: wordAudio.inspect,
    save: saveWordState,
  };
  const loadedById = new Map(loaded.jobs.map((record) => [record.id, record]));
  const reusable = new Map();
  for (const job of jobs) {
    const record = loadedById.get(job.id);
    if (await verifiedRecord(record, job, wordAudio.inspect)) {
      state.records.set(job.id, record);
      reusable.set(job.requestSha256, record);
    }
  }
  for (const job of jobs) {
    if (state.records.has(job.id)) continue;
    const canonical = reusable.get(job.requestSha256);
    if (!canonical) continue;
    if (!applyCopies) {
      state.records.set(job.id, { ...job, dryRunCopy: true });
      continue;
    }
    const standardPath = join(ROOT, "public", job.standardPath);
    const childPath = join(ROOT, "public", job.childPath);
    await Promise.all([mkdir(dirname(standardPath), { recursive: true }), mkdir(dirname(childPath), { recursive: true })]);
    await Promise.all([
      copyFile(join(ROOT, "public", canonical.standardPath), standardPath),
      copyFile(join(ROOT, "public", canonical.childPath), childPath),
    ]);
    const [standard, child] = await Promise.all([wordAudio.inspect(standardPath), wordAudio.inspect(childPath)]);
    const record = {
      ...job,
      model: job.sourceModel,
      voice: wordAudio.VOICE,
      promptVersion: wordAudio.PROMPT_VERSION,
      standard,
      child,
      source: { type: "verified-copy", canonicalId: canonical.id },
      signalRepair: job.signalRepair,
      usageMetadata: null,
      generatedAt: new Date().toISOString(),
    };
    state.records.set(job.id, record);
    reusable.set(job.requestSha256, record);
  }
  if (applyCopies) await state.save(state);
  return state;
}

async function loadState(scope, options = {}) {
  return scope === "story" ? loadStoryState(options) : loadWordState(options);
}

function remainingEntries(state, idPrefix = null) {
  return state.jobs
    .filter((job) => !idPrefix || job.id.startsWith(idPrefix))
    .filter((job) => !state.records.has(job.id))
    .map((job) => {
      if (state.scope === "word" && job.sourceModel !== MODEL) {
        throw new Error(`Missing word ${job.id} requires unsupported Batch model ${job.sourceModel}.`);
      }
      return {
        key: `${state.scope}:${job.id}`,
        scope: state.scope,
        id: job.id,
        job,
        request: state.scope === "story" ? storyAudio.requestFor(job) : wordAudio.requestFor(job),
      };
    });
}

function batchRoot(scope) {
  return join(ROOT, "work", "missing-audio-batch", scope);
}

function journalRoot(scope) {
  return join(batchRoot(scope), "batch-runs");
}

function journalPath(scope, requestPlanSha256) {
  return join(journalRoot(scope), `batch-${requestPlanSha256.slice(0, 24)}.json`);
}

async function listJournals(scope) {
  const root = journalRoot(scope);
  if (!(await exists(root))) return [];
  const names = (await readdir(root)).filter((name) => /^batch-[a-f0-9]+\.json$/.test(name));
  const journals = [];
  for (const name of names) {
    const path = join(root, name);
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Unsafe Batch journal: ${path}`);
    journals.push({ path, journal: JSON.parse(await readFile(path, "utf8")) });
  }
  return journals;
}

async function createJournal(path, journal) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(journal, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
}

async function saveJournal(path, journal) {
  journal.updatedAt = new Date().toISOString();
  await atomicJson(path, journal);
}

function createBody(journal, entryByKey) {
  return {
    batch: {
      displayName: `story-sprout-${journal.scope}-${journal.requestPlanSha256.slice(0, 12)}`,
      inputConfig: {
        requests: {
          requests: journal.jobs.map((planned) => {
            const entry = entryByKey.get(planned.key);
            return {
              request: entry.request,
              metadata: {
                jobId: planned.key,
                key: planned.key,
                requestIndex: planned.requestIndex,
                requestSha256: planned.requestSha256,
              },
            };
          }),
        },
      },
    },
  };
}

function makeJournal(state, selected, sequence) {
  const globalPlanSha256 = planSha256(state.jobs);
  const fingerprint = {
    schemaVersion: 1,
    scope: state.scope,
    sequence,
    globalPlanSha256,
    model: MODEL,
    voice: VOICE,
    jobs: selected.map((entry, requestIndex) => ({
      key: entry.key,
      id: entry.id,
      requestIndex,
      requestSha256: entry.job.requestSha256,
    })),
  };
  const requestPlanSha256 = sha256(stableJson(fingerprint));
  const now = new Date().toISOString();
  const journal = {
    ...fingerprint,
    requestPlanSha256,
    createdAt: now,
    updatedAt: now,
    phase: "prepared",
    batchName: null,
    submission: {
      startedAt: null,
      responseAt: null,
      httpStatus: null,
      errorSummary: null,
      requestBody: null,
      requestBodySha256: null,
    },
    poll: { count: 0, lastPolledAt: null, state: null, stats: null, responseShape: null },
    results: {},
    responseSummaries: [],
  };
  const entryByKey = new Map(selected.map((entry) => [entry.key, entry]));
  journal.submission.requestBody = createBody(journal, entryByKey);
  journal.submission.requestBodySha256 = sha256(stableJson(journal.submission.requestBody));
  return journal;
}

async function activeOrBlockingJournal(state) {
  const globalPlanSha256 = planSha256(state.jobs);
  const all = (await listJournals(state.scope)).filter(({ journal }) => journal.globalPlanSha256 === globalPlanSha256);
  const uncertain = all.find(({ journal }) => ["submitting", "submission_uncertain"].includes(journal.phase) && !journal.batchName);
  if (uncertain) {
    throw new Error(`Batch submission is uncertain in ${uncertain.path}; refusing an automatic duplicate.`);
  }
  const rejected = all.find(({ journal }) => ["creation_rejected", "batch_failed"].includes(journal.phase));
  if (rejected) throw new Error(`Prior Batch journal requires review: ${rejected.path} (${rejected.journal.phase}).`);
  const active = all.filter(({ journal }) => ACTIVE_PHASES.has(journal.phase));
  if (active.length > 1) throw new Error(`More than one active ${state.scope} Batch journal exists.`);
  return { active: active[0] || null, all };
}

function extractBatchName(payload) {
  return [payload?.name, payload?.metadata?.name, payload?.response?.name, payload?.response?.metadata?.name]
    .find((value) => typeof value === "string" && /^batches\/[A-Za-z0-9_-]+$/.test(value));
}

async function submitBatch(key, journal, path, entryByKey) {
  const body = createBody(journal, entryByKey);
  if (
    journal.submission.requestBodySha256 !== sha256(stableJson(body)) ||
    stableJson(journal.submission.requestBody) !== stableJson(body)
  ) throw new Error("Persisted Batch request body does not match the current exact plan.");
  journal.phase = "submitting";
  journal.submission.startedAt = new Date().toISOString();
  await saveJournal(path, journal);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(CREATE_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(journal.submission.requestBody),
      signal: controller.signal,
    });
  } catch (error) {
    journal.phase = "submission_uncertain";
    journal.submission.errorSummary = safeMessage(
      error?.name === "AbortError" ? "Batch creation timed out after the request may have been sent." : error?.message,
    );
    await saveJournal(path, journal);
    throw new Error(`Batch creation outcome is uncertain; refusing resubmission: ${journal.submission.errorSummary}`);
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = {};
  }
  journal.submission.responseAt = new Date().toISOString();
  journal.submission.httpStatus = response.status;
  if (!response.ok) {
    journal.phase = "creation_rejected";
    journal.submission.errorSummary = safeMessage(payload?.error?.message || `HTTP ${response.status}`);
    await saveJournal(path, journal);
    throw new Error(`Batch creation was rejected: ${journal.submission.errorSummary}`);
  }
  const batchName = extractBatchName(payload);
  if (!batchName) {
    journal.phase = "submission_uncertain";
    journal.submission.errorSummary = "Successful creation response contained no recoverable batches/* name.";
    await saveJournal(path, journal);
    throw new Error(journal.submission.errorSummary);
  }
  journal.batchName = batchName;
  journal.phase = "submitted";
  await saveJournal(path, journal);
  process.stdout.write(`Created ${batchName} for ${journal.jobs.length} ${journal.scope} request(s).\n`);
}

function extractState(payload) {
  const state = [payload?.state, payload?.metadata?.state, payload?.response?.state, payload?.response?.metadata?.state]
    .find((value) => typeof value === "string");
  if (state) return state;
  if (payload?.done === true) return payload?.error ? "JOB_STATE_FAILED" : "JOB_STATE_SUCCEEDED";
  return "JOB_STATE_PENDING";
}

function extractStats(payload) {
  return payload?.batchStats || payload?.metadata?.batchStats || payload?.response?.batchStats ||
    payload?.response?.metadata?.batchStats || null;
}

function responseShape(payload) {
  const candidates = [
    "dest.inlinedResponses",
    "response.dest.inlinedResponses",
    "response.inlinedResponses",
    "response.inlinedResponses.inlinedResponses",
    "output.inlinedResponses.inlinedResponses",
    "response.output.inlinedResponses.inlinedResponses",
    "metadata.output.inlinedResponses.inlinedResponses",
  ];
  return candidates.find((shape) => {
    const value = shape.split(".").reduce((current, key) => current?.[key], payload);
    return Array.isArray(value);
  }) || null;
}

function inlineResponses(payload) {
  const shape = responseShape(payload);
  return {
    shape,
    responses: shape ? shape.split(".").reduce((current, key) => current?.[key], payload) : null,
  };
}

async function getBatch(key, batchName) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${API_ROOT}/${batchName}`, {
      headers: { "x-goog-api-key": key },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Batch poll returned non-JSON (HTTP ${response.status}).`);
  }
  if (!response.ok) throw new Error(`Batch poll failed (HTTP ${response.status}): ${safeMessage(payload?.error?.message)}`);
  return payload;
}

async function pollToTerminal(key, journal, path, intervalMs) {
  let transientFailures = 0;
  while (true) {
    let payload;
    try {
      payload = await getBatch(key, journal.batchName);
      transientFailures = 0;
    } catch (error) {
      transientFailures += 1;
      if (transientFailures > 8) throw error;
      const delay = Math.min(2_000 * 2 ** (transientFailures - 1), 60_000);
      process.stdout.write(`Poll failed safely; retrying in ${Math.ceil(delay / 1000)}s.\n`);
      await wait(delay);
      continue;
    }
    const { shape, responses } = inlineResponses(payload);
    const summary = {
      observedAt: new Date().toISOString(),
      state: extractState(payload),
      stats: extractStats(payload),
      responseShape: shape,
      responseCount: Array.isArray(responses) ? responses.length : null,
      errorSummary: payload?.error ? safeMessage(payload.error.message || JSON.stringify(payload.error)) : null,
    };
    journal.phase = "polling";
    journal.poll.count += 1;
    journal.poll.lastPolledAt = summary.observedAt;
    journal.poll.state = summary.state;
    journal.poll.stats = summary.stats;
    journal.poll.responseShape = summary.responseShape;
    journal.responseSummaries = [...journal.responseSummaries.slice(-19), summary];
    await saveJournal(path, journal);
    process.stdout.write(`${journal.batchName}: ${summary.state}${summary.stats ? ` ${JSON.stringify(summary.stats)}` : ""}\n`);
    if (TERMINAL_STATES.has(summary.state)) return payload;
    await wait(intervalMs);
  }
}

function structValue(metadata, key) {
  if (!metadata || typeof metadata !== "object") return null;
  if (["string", "number"].includes(typeof metadata[key])) return metadata[key];
  const field = metadata.fields?.[key];
  return field?.stringValue ?? field?.numberValue ?? null;
}

function inlineMetadata(entry) {
  return entry?.metadata || entry?.output?.metadata || entry?.response?.metadata || null;
}

function inlineError(entry) {
  return entry?.error || entry?.output?.error || null;
}

function inlineGenerateResponse(entry) {
  return entry?.response || entry?.output?.response || null;
}

function decodePcm(payload, id) {
  const candidate = payload?.candidates?.[0];
  const audioPart = candidate?.content?.parts?.find((part) => typeof part?.inlineData?.data === "string");
  const encoded = audioPart?.inlineData?.data?.replace(/\s/g, "");
  const mimeType = audioPart?.inlineData?.mimeType || "";
  if (!encoded || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
    throw new Error(`No valid PCM audio returned for ${id}.`);
  }
  if (!/^audio\//i.test(mimeType) || !/(?:pcm|l16)/i.test(mimeType)) {
    throw new Error(`Unexpected audio type for ${id}: ${safeMessage(mimeType)}`);
  }
  const declaredRate = mimeType.match(/rate=(\d+)/i)?.[1];
  if (declaredRate && declaredRate !== "24000") throw new Error(`Unexpected PCM sample rate for ${id}: ${declaredRate}`);
  const pcm = Buffer.from(encoded, "base64");
  if (pcm.length < 1_024 || pcm.length % 2) throw new Error(`Invalid PCM length for ${id}.`);
  if (candidate?.finishReason !== "STOP") throw new Error(`Unexpected finish reason for ${id}.`);
  if (payload?.modelVersion && payload.modelVersion !== MODEL) {
    throw new Error(`Unexpected modelVersion for ${id}: ${safeMessage(payload.modelVersion)}`);
  }
  return {
    pcm,
    mimeType,
    modelVersion: payload?.modelVersion || null,
    responseId: payload?.responseId || null,
    usageMetadata: payload?.usageMetadata || null,
  };
}

function mapResponses(payload, journal) {
  const { shape, responses } = inlineResponses(payload);
  if (!responses || responses.length !== journal.jobs.length) {
    throw new Error(`Batch response count did not match ${journal.jobs.length} requests.`);
  }
  const plannedByKey = new Map(journal.jobs.map((job) => [job.key, job]));
  const metadataFlags = responses.map((entry) => Boolean(inlineMetadata(entry)));
  if (!metadataFlags.every(Boolean) && !metadataFlags.every((value) => !value)) {
    throw new Error("Batch responses contained partially missing metadata.");
  }
  let mapped;
  if (metadataFlags.every(Boolean)) {
    mapped = responses.map((entry) => {
      const metadata = inlineMetadata(entry);
      const key = String(structValue(metadata, "jobId") || structValue(metadata, "key") || "");
      const requestIndex = Number(structValue(metadata, "requestIndex"));
      const planned = plannedByKey.get(key);
      if (!planned || !Number.isInteger(requestIndex) || requestIndex !== planned.requestIndex) {
        throw new Error(`Batch response metadata mismatch for ${key || "(empty)"}.`);
      }
      if (structValue(metadata, "requestSha256") !== planned.requestSha256) {
        throw new Error(`Batch response request hash mismatch for ${key}.`);
      }
      return { entry, planned, mapping: "metadata" };
    });
  } else {
    const stats = extractStats(payload);
    if (
      Number(stats?.requestCount) !== journal.jobs.length ||
      Number(stats?.successfulRequestCount) !== responses.length
    ) throw new Error("Metadata-free Batch response could not be validated by request order.");
    mapped = responses.map((entry, requestIndex) => ({
      entry,
      planned: journal.jobs[requestIndex],
      mapping: "official-request-order-fallback",
    }));
  }
  if (new Set(mapped.map(({ planned }) => planned.key)).size !== mapped.length) {
    throw new Error("Batch response mapping contained duplicate job keys.");
  }
  return { shape, mapped };
}

async function processStoryResponse({ state, job, decoded, journal, planned, mapping, temporaryRoot }) {
  const existing = state.records.get(job.id);
  if (await verifiedRecord(existing, job, storyAudio.inspect)) return existing;
  const standardPath = join(ROOT, "public", job.standardPath);
  const childPath = join(ROOT, "public", job.childPath);
  const pcmPath = join(temporaryRoot, `${randomUUID()}.pcm`);
  await writeFile(pcmPath, decoded.pcm, { flag: "wx", mode: 0o600 });
  await storyAudio.makeStandard(pcmPath, standardPath);
  const pacing = await storyAudio.makeChild(job, standardPath, childPath);
  const [standard, child] = await Promise.all([storyAudio.inspect(standardPath), storyAudio.inspect(childPath)]);
  if (child.durationSeconds + 0.02 < standard.durationSeconds) {
    throw new Error(`Child version is unexpectedly shorter for ${job.id}.`);
  }
  const record = {
    ...job,
    model: storyAudio.MODEL,
    voice: storyAudio.VOICE,
    promptVersion: storyAudio.PROMPT_VERSION,
    pacing,
    standard,
    child,
    source: {
      type: "gemini-batch",
      batchName: journal.batchName,
      requestPlanSha256: journal.requestPlanSha256,
      requestIndex: planned.requestIndex,
      mapping,
      modelVersion: decoded.modelVersion,
      responseId: decoded.responseId,
    },
    usageMetadata: decoded.usageMetadata,
    generatedAt: new Date().toISOString(),
  };
  state.records.set(job.id, record);
  await state.save(state);
  return record;
}

async function processWordResponse({ state, job, decoded, journal, planned, mapping, temporaryRoot }) {
  const existing = state.records.get(job.id);
  if (await verifiedRecord(existing, job, wordAudio.inspect)) return existing;
  const standardPath = join(ROOT, "public", job.standardPath);
  const childPath = join(ROOT, "public", job.childPath);
  const pcmPath = join(temporaryRoot, `${randomUUID()}.pcm`);
  await writeFile(pcmPath, decoded.pcm, { flag: "wx", mode: 0o600 });
  await wordAudio.makeStandard(pcmPath, standardPath);
  await wordAudio.applySignalRepair(job, standardPath);
  await wordAudio.makeChild(standardPath, childPath);
  const [standard, child] = await Promise.all([wordAudio.inspect(standardPath), wordAudio.inspect(childPath)]);
  if (child.durationSeconds <= standard.durationSeconds) {
    throw new Error(`Child version is not slower for ${job.id}.`);
  }
  const record = {
    ...job,
    model: job.sourceModel,
    voice: wordAudio.VOICE,
    promptVersion: wordAudio.PROMPT_VERSION,
    standard,
    child,
    source: {
      type: "gemini-batch",
      batchName: journal.batchName,
      requestPlanSha256: journal.requestPlanSha256,
      requestIndex: planned.requestIndex,
      mapping,
      requestedModel: job.sourceModel,
      modelVersion: decoded.modelVersion,
      responseId: decoded.responseId,
    },
    signalRepair: job.signalRepair,
    usageMetadata: decoded.usageMetadata,
    generatedAt: new Date().toISOString(),
  };
  state.records.set(job.id, record);
  await state.save(state);
  return record;
}

async function applyBatch(payload, state, journal, path, entryByKey) {
  const { shape, mapped } = mapResponses(payload, journal);
  journal.phase = "processing";
  journal.poll.responseShape = shape;
  await saveJournal(path, journal);
  const temporaryRoot = await mkdtemp(join(tmpdir(), `story-sprout-${state.scope}-batch-`));
  let inlineFailures = 0;
  try {
    for (const { entry, planned, mapping } of mapped) {
      const selected = entryByKey.get(planned.key);
      if (!selected) throw new Error(`Journal referenced an unknown current job: ${planned.key}`);
      const itemError = inlineError(entry);
      if (itemError) {
        inlineFailures += 1;
        journal.results[planned.key] = {
          status: "inline-error",
          mapping,
          errorSummary: safeMessage(itemError.message || JSON.stringify(itemError)),
        };
        await saveJournal(path, journal);
        continue;
      }
      try {
        const response = inlineGenerateResponse(entry);
        if (!response) throw new Error(`Batch item contained neither response nor error for ${planned.key}.`);
        const decoded = decodePcm(response, planned.key);
        const record = state.scope === "story"
          ? await processStoryResponse({ state, job: selected.job, decoded, journal, planned, mapping, temporaryRoot })
          : await processWordResponse({ state, job: selected.job, decoded, journal, planned, mapping, temporaryRoot });
        journal.results[planned.key] = {
          status: "complete",
          mapping,
          standardSha256: record.standard.sha256,
          childSha256: record.child.sha256,
        };
        await saveJournal(path, journal);
        process.stdout.write(`${planned.key}: complete\n`);
      } catch (error) {
        journal.phase = "processing_failed";
        journal.results[planned.key] = { status: "processing-failed", mapping, errorSummary: safeMessage(error.message) };
        await saveJournal(path, journal);
        throw error;
      }
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
  journal.phase = inlineFailures ? "applied_with_errors" : "applied";
  journal.completedAt = new Date().toISOString();
  journal.failureCount = inlineFailures;
  await saveJournal(path, journal);
  return { completed: mapped.length - inlineFailures, failures: inlineFailures };
}

async function runOneBatch(options, state, key) {
  const remaining = remainingEntries(state, options.idPrefix);
  if (!remaining.length) return { done: true, completed: 0 };
  const { active, all } = await activeOrBlockingJournal(state);
  let journal;
  let path;
  if (active) {
    ({ journal, path } = active);
    process.stdout.write(`Resuming ${path} at phase ${journal.phase}.\n`);
  } else {
    const selected = remaining.slice(0, options.batchSize);
    journal = makeJournal(state, selected, all.length + 1);
    path = journalPath(state.scope, journal.requestPlanSha256);
    await createJournal(path, journal);
  }

  const currentByKey = new Map(remainingEntries(state, options.idPrefix).map((entry) => [entry.key, entry]));
  const selected = journal.jobs.map((planned) => {
    const entry = currentByKey.get(planned.key);
    if (!entry || entry.job.requestSha256 !== planned.requestSha256) {
      const existingJob = state.jobs.find((job) => `${state.scope}:${job.id}` === planned.key);
      const existingRecord = existingJob ? state.records.get(existingJob.id) : null;
      if (existingJob && existingRecord?.requestSha256 === planned.requestSha256) {
        return {
          key: planned.key,
          scope: state.scope,
          id: existingJob.id,
          job: existingJob,
          request: state.scope === "story" ? storyAudio.requestFor(existingJob) : wordAudio.requestFor(existingJob),
        };
      }
      throw new Error(`Journal no longer matches current request ${planned.key}.`);
    }
    return entry;
  });
  const entryByKey = new Map(selected.map((entry) => [entry.key, entry]));
  const recomputedBody = createBody(journal, entryByKey);
  if (
    stableJson(recomputedBody) !== stableJson(journal.submission.requestBody) ||
    sha256(stableJson(recomputedBody)) !== journal.submission.requestBodySha256
  ) throw new Error("Batch journal request body failed exact recovery validation.");

  if (journal.phase === "prepared") await submitBatch(key, journal, path, entryByKey);
  if (!journal.batchName) throw new Error("Active Batch journal has no recoverable batch name.");
  const payload = await pollToTerminal(key, journal, path, options.pollIntervalMs);
  const finalState = extractState(payload);
  if (!/[A-Z_]*SUCCEEDED$/.test(finalState)) {
    journal.phase = "batch_failed";
    journal.completedAt = new Date().toISOString();
    journal.batchErrorSummary = safeMessage(
      payload?.error?.message || payload?.metadata?.error?.message || `Terminal state ${finalState}`,
    );
    await saveJournal(path, journal);
    throw new Error(`Batch ended in ${finalState}: ${journal.batchErrorSummary}`);
  }
  const result = await applyBatch(payload, state, journal, path, entryByKey);
  if (result.failures) {
    throw new Error(`${result.failures} Batch item(s) failed; rerun after reviewing ${path}.`);
  }
  return { done: false, completed: result.completed };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const state = await loadState(options.scope, { applyCopies: !options.dryRun });
  const scopedJobs = options.idPrefix
    ? state.jobs.filter((job) => job.id.startsWith(options.idPrefix))
    : state.jobs;
  const missing = remainingEntries(state, options.idPrefix);
  const complete = scopedJobs.length - missing.length;
  process.stdout.write(
    `${options.scope}${options.idPrefix ? ` (${options.idPrefix}*)` : ""}: ${complete}/${scopedJobs.length} records reusable; ${missing.length} Batch request(s) remain.\n`,
  );
  if (options.dryRun || !missing.length) return;

  const key = await getApiKey();
  let batches = 0;
  let generated = 0;
  while (batches < options.maxBatches) {
    const result = await runOneBatch(options, state, key);
    if (result.done) break;
    batches += 1;
    generated += result.completed;
    process.stdout.write(
      `${options.scope} checkpoint: ${state.records.size}/${state.jobs.length}; ${batches} Batch job(s) applied this run.\n`,
    );
  }
  await state.save(state);
  const remaining = remainingEntries(state, options.idPrefix).length;
  process.stdout.write(
    `${options.scope} Batch run finished: ${generated} generated, ${remaining} request(s) remain.\n`,
  );
  if (remaining && batches >= options.maxBatches) process.stdout.write("Stopped at --max-batches limit.\n");
}

main().catch((error) => {
  process.stderr.write(`${safeMessage(error?.stack || error?.message)}\n`);
  process.exitCode = 1;
});
