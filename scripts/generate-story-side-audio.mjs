#!/usr/bin/env node

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
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
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { BOOKS } from "../app/book-data.ts";
import { buildStoryNarrationSegments, prepareSpeechText } from "../app/narration.ts";
import {
  CHILD_TRANSFORM_VERSION,
  MODEL,
  PROMPT_VERSION as SOURCE_PROMPT_VERSION,
  VOICE,
  apiKey,
  inspect,
  makeChild,
  makeStandard,
  requestFor as storyRequestFor,
  safeMessage,
  sha256,
  stableJson,
} from "./generate-new-book-audio.mjs";

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORK_ROOT = join(ROOT, "work", "story-side-audio");
const JOURNAL_ROOT = join(WORK_ROOT, "batch-runs");
const MANIFEST_PATH = join(WORK_ROOT, "manifest.json");
const STANDARD_ROOT = join(ROOT, "public", "audio-standard");
const CHILD_ROOT = join(ROOT, "public", "audio");
const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";
const BATCH_URL = `${API_ROOT}/models/${MODEL}:batchGenerateContent`;
const PROMPT_VERSION = `story-side-audio-v1+${SOURCE_PROMPT_VERSION}`;
const TOOL_VERSION = "story-side-audio-batch-v1";
// Completed inline Batch responses can contain dozens of PCM clips and take
// several minutes to download even when the status request itself succeeds.
const REQUEST_TIMEOUT_MS = 600_000;
const POLL_INTERVAL_MS = 15_000;
const BATCH_MAX_JOBS = 35;
const SIDES = ["left", "right"];
const JOB_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\/\d{2,3}-(?:left|right)$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

function usage() {
  return [
    "Generate only the optional left/right story-page recordings.",
    "",
    "Usage:",
    "  node scripts/generate-story-side-audio.mjs --dry-run",
    "  node scripts/generate-story-side-audio.mjs --submit-batches",
    "  node scripts/generate-story-side-audio.mjs --batch",
    "",
    "--dry-run plans jobs without credentials, network access, file writes, or audio tools.",
    "--submit-batches journals and submits unclaimed groups, but never polls or installs audio.",
    "--batch resumes safe journals, polls, installs both paces, and checkpoints the manifest.",
    "Credentials: GEMINI_API_KEY, or GEMINI_KEY_PROJECT + GEMINI_KEY_NAME.",
  ].join("\n");
}

function parseArguments(argv) {
  const options = { mode: "batch", dryRun: false };
  for (const argument of argv) {
    if (argument === "--batch") options.mode = "batch";
    else if (argument === "--submit-batches") options.mode = "submit-batches";
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${argument}\n\n${usage()}`);
  }
  return options;
}

function within(candidate, parent) {
  const path = relative(resolve(parent), resolve(candidate));
  return path === "" || (path !== ".." && !path.startsWith(`..${sep}`));
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
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, path);
}

function sideTranscript(side) {
  if (typeof side === "string") return side.trim();
  if (side && typeof side === "object" && typeof side.transcript === "string") {
    return side.transcript.trim();
  }
  return "";
}

function sideAudioSource(side) {
  return side && typeof side === "object" && typeof side.audioSrc === "string"
    ? side.audioSrc
    : null;
}

function wordCount(text) {
  return text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length || 0;
}

function requestFor(job) {
  return storyRequestFor(job);
}

function planJobs(books = BOOKS) {
  const jobs = [];
  for (const book of books) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(book?.slug || "")) {
      throw new Error(`Unsafe book slug: ${book?.slug || "(missing)"}`);
    }
    if (!Array.isArray(book.pages)) throw new Error(`Book ${book.slug} has no pages array.`);
    for (const [index, page] of book.pages.entries()) {
      const pageNumber = String(index + 1).padStart(2, "0");
      for (const sideName of SIDES) {
        const side = page?.sides?.[sideName];
        const displayText = sideTranscript(side);
        if (!displayText) continue;
        const fileName = `${pageNumber}-${sideName}.mp3`;
        const expectedAudioSrc = `/audio/${book.slug}/${fileName}`;
        const declaredAudioSrc = sideAudioSource(side);
        if (declaredAudioSrc && declaredAudioSrc !== expectedAudioSrc) {
          throw new Error(
            `${book.slug}/${pageNumber}-${sideName} must use ${expectedAudioSrc}; received ${declaredAudioSrc}.`,
          );
        }
        const spokenText = buildStoryNarrationSegments(displayText, "story")
          .map((segment) => segment.text)
          .join(" ");
        const ttsText = prepareSpeechText(displayText);
        const id = `${book.slug}/${pageNumber}-${sideName}`;
        const job = {
          id,
          bookSlug: book.slug,
          bookTitle: book.title,
          pageNumber: index + 1,
          side: sideName,
          kind: "story",
          taskType: null,
          displayText,
          spokenText,
          ttsText,
          wordCount: wordCount(spokenText),
          standardPath: `audio-standard/${book.slug}/${fileName}`,
          childPath: `audio/${book.slug}/${fileName}`,
          displayTextSha256: sha256(displayText),
          spokenTextSha256: sha256(spokenText),
        };
        if (!JOB_ID_PATTERN.test(job.id)) throw new Error(`Unsafe side-audio job ID: ${job.id}`);
        if (!job.spokenText || !job.ttsText || job.wordCount < 1) {
          throw new Error(`Empty side-audio job: ${job.id}`);
        }
        job.requestSha256 = sha256(stableJson({
          model: MODEL,
          voice: VOICE,
          promptVersion: PROMPT_VERSION,
          request: requestFor(job),
        }));
        jobs.push(job);
      }
    }
  }
  if (new Set(jobs.map((job) => job.id)).size !== jobs.length) {
    throw new Error("The story-side audio plan contains duplicate IDs.");
  }
  return jobs;
}

function decodePcm(payload, id) {
  const candidate = payload?.candidates?.[0];
  const audioPart = candidate?.content?.parts?.find(
    (part) => typeof part?.inlineData?.data === "string",
  );
  const encoded = audioPart?.inlineData?.data?.replace(/\s/g, "");
  const mimeType = audioPart?.inlineData?.mimeType || "";
  if (
    candidate?.finishReason !== "STOP"
    || !encoded
    || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)
    || encoded.length % 4 !== 0
    || !/^audio\//i.test(mimeType)
    || !/(?:pcm|l16)/i.test(mimeType)
  ) {
    throw new Error(`Gemini returned no usable PCM audio for ${id}.`);
  }
  const rate = Number(mimeType.match(/rate=(\d+)/i)?.[1] || 24_000);
  if (rate !== 24_000) throw new Error(`Unexpected PCM sample rate for ${id}: ${rate}`);
  const pcm = Buffer.from(encoded, "base64");
  if (pcm.length < 1_024 || pcm.length % 2 !== 0) {
    throw new Error(`Invalid PCM length for ${id}.`);
  }
  return {
    pcm,
    mimeType,
    modelVersion: payload?.modelVersion || null,
    responseId: payload?.responseId || null,
    usageMetadata: payload?.usageMetadata || null,
  };
}

async function fetchJson(url, options, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    throw new Error(`${label} request failed: ${safeMessage(error?.message)}`);
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
  if (!response.ok) {
    const error = new Error(
      `${label} failed (HTTP ${response.status}): ${safeMessage(payload?.error?.message || response.statusText)}`,
    );
    error.status = response.status;
    throw error;
  }
  return payload;
}

function inlineResponses(payload) {
  const candidates = [
    payload?.dest?.inlinedResponses,
    payload?.response?.dest?.inlinedResponses,
    payload?.response?.inlinedResponses,
    payload?.response?.inlinedResponses?.inlinedResponses,
    payload?.output?.inlinedResponses?.inlinedResponses,
    payload?.response?.output?.inlinedResponses?.inlinedResponses,
    payload?.metadata?.output?.inlinedResponses?.inlinedResponses,
  ];
  return candidates.find(Array.isArray) || null;
}

function batchState(payload) {
  return [
    payload?.state,
    payload?.metadata?.state,
    payload?.response?.state,
    payload?.response?.metadata?.state,
  ].find((value) => typeof value === "string")
    || (payload?.done ? "JOB_STATE_SUCCEEDED" : "JOB_STATE_PENDING");
}

function batchName(payload) {
  return [
    payload?.name,
    payload?.metadata?.name,
    payload?.response?.name,
    payload?.response?.metadata?.name,
  ].find((value) => typeof value === "string" && /^batches\/[A-Za-z0-9_-]+$/.test(value));
}

function batchPlanIdentity(jobs) {
  const planSha256 = sha256(stableJson(jobs.map((job) => ({
    id: job.id,
    requestSha256: job.requestSha256,
  }))));
  return {
    planSha256,
    journalName: `batch-${planSha256.slice(0, 24)}.json`,
  };
}

function batchRequestBody(jobs, planSha256) {
  return {
    batch: {
      displayName: `story-garden-page-sides-${planSha256.slice(0, 12)}`,
      inputConfig: {
        requests: {
          requests: jobs.map((job, requestIndex) => ({
            request: requestFor(job),
            metadata: {
              jobId: job.id,
              requestIndex,
              requestSha256: job.requestSha256,
            },
          })),
        },
      },
    },
  };
}

function batchJournalAction(journal) {
  if (journal?.phase === "prepared") return "submit";
  if (["submitted", "received", "received-partial", "applied"].includes(journal?.phase)) {
    return "skip-submission";
  }
  if ([
    "submitting",
    "submission-uncertain",
    "submission_uncertain",
    "failed",
    "batch_failed",
  ].includes(journal?.phase)) {
    throw new Error(`Batch journal is ${journal.phase}; refusing automatic submission or resubmission.`);
  }
  throw new Error(`Unsupported Batch journal phase: ${safeMessage(journal?.phase)}`);
}

function validateBatchJournal(journal, jobs, planSha256) {
  if (
    journal?.schemaVersion !== 1
    || journal?.toolVersion !== TOOL_VERSION
    || journal?.planSha256 !== planSha256
    || journal?.model !== MODEL
    || journal?.voice !== VOICE
    || journal?.promptVersion !== PROMPT_VERSION
    || !Array.isArray(journal?.jobs)
    || journal.jobs.length !== jobs.length
    || !jobs.every((job, index) => (
      journal.jobs[index]?.id === job.id
      && journal.jobs[index]?.requestSha256 === job.requestSha256
    ))
  ) {
    throw new Error("Existing Batch journal belongs to a different story-side request plan.");
  }
  const action = batchJournalAction(journal);
  if (action === "submit") {
    if (journal.name) throw new Error("Prepared Batch journal unexpectedly has a batch name.");
    if (!journal.body || journal.bodySha256 !== sha256(stableJson(journal.body))) {
      throw new Error("Prepared Batch journal body hash mismatch.");
    }
  } else if (!/^batches\/[A-Za-z0-9_-]+$/.test(journal.name || "")) {
    throw new Error(`Batch journal in phase ${journal.phase} has no recoverable batch name.`);
  }
  return action;
}

async function readBatchJournalEntries(journalRoot = JOURNAL_ROOT) {
  if (!(await exists(journalRoot))) return [];
  const names = (await readdir(journalRoot))
    .filter((name) => /^batch-[a-f0-9]{24}\.json$/.test(name))
    .sort();
  return Promise.all(names.map(async (name) => {
    const path = join(journalRoot, name);
    let journal;
    try {
      journal = JSON.parse(await readFile(path, "utf8"));
    } catch {
      throw new Error(`Unreadable Batch journal: ${path}`);
    }
    return { path, journal };
  }));
}

function assertBatchJournalSetSafe(entries) {
  const names = new Map();
  for (const { journal, path } of entries) {
    if (
      journal?.schemaVersion !== 1
      || journal?.toolVersion !== TOOL_VERSION
      || journal?.model !== MODEL
      || journal?.voice !== VOICE
      || journal?.promptVersion !== PROMPT_VERSION
      || !Array.isArray(journal?.jobs)
      || journal.jobs.some((job) => (
        !JOB_ID_PATTERN.test(job?.id || "")
        || !HASH_PATTERN.test(job?.requestSha256 || "")
      ))
    ) {
      throw new Error(`Incompatible Batch journal requires review: ${path}`);
    }
    const action = batchJournalAction(journal);
    if (action === "submit") {
      if (journal.name || !journal.body || journal.bodySha256 !== sha256(stableJson(journal.body))) {
        throw new Error(`Prepared Batch journal failed its integrity check: ${path}`);
      }
      continue;
    }
    if (!/^batches\/[A-Za-z0-9_-]+$/.test(journal.name || "")) {
      throw new Error(`Batch journal has no recoverable batch name: ${path}`);
    }
    const previousPath = names.get(journal.name);
    if (previousPath && previousPath !== path) {
      throw new Error(`Batch name ${journal.name} is claimed by more than one journal.`);
    }
    names.set(journal.name, path);
  }
  return names;
}

async function prepareBatchJournal(jobs, journalRoot = JOURNAL_ROOT) {
  if (!jobs.length || jobs.length > BATCH_MAX_JOBS) {
    throw new Error(`A Batch journal must contain between 1 and ${BATCH_MAX_JOBS} jobs.`);
  }
  const { planSha256, journalName } = batchPlanIdentity(jobs);
  const path = join(journalRoot, journalName);
  if (await exists(path)) {
    const journal = JSON.parse(await readFile(path, "utf8"));
    validateBatchJournal(journal, jobs, planSha256);
    return { path, journal, created: false };
  }

  const body = batchRequestBody(jobs, planSha256);
  const journal = {
    schemaVersion: 1,
    toolVersion: TOOL_VERSION,
    planSha256,
    model: MODEL,
    voice: VOICE,
    promptVersion: PROMPT_VERSION,
    phase: "prepared",
    name: null,
    body,
    bodySha256: sha256(stableJson(body)),
    jobs: jobs.map(({ id, requestSha256 }) => ({ id, requestSha256 })),
    preparedAt: new Date().toISOString(),
  };
  await atomicJson(path, journal);
  return { path, journal, created: true };
}

async function submitPreparedBatch(key, entry, knownBatchNames) {
  const { path, journal } = entry;
  if (validateBatchJournal(
    journal,
    journal.jobs,
    journal.planSha256,
  ) !== "submit") return entry;

  journal.phase = "submitting";
  journal.submissionStartedAt = new Date().toISOString();
  await atomicJson(path, journal);
  let payload;
  try {
    payload = await fetchJson(
      BATCH_URL,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(journal.body),
      },
      "Batch creation",
    );
  } catch (error) {
    if (Number.isInteger(error?.status)) {
      // An explicit non-2xx HTTP response means the API rejected the request;
      // unlike a dropped connection, it cannot have created an unreported Batch.
      // Keep the durable prepared body so a later pass can retry after quota frees.
      journal.phase = "prepared";
      journal.lastSubmissionError = safeMessage(error?.message);
      journal.lastSubmissionFailedAt = new Date().toISOString();
      delete journal.submissionStartedAt;
      await atomicJson(path, journal);
      throw error;
    }
    journal.phase = "submission-uncertain";
    journal.error = safeMessage(error?.message);
    await atomicJson(path, journal);
    throw new Error(
      `Batch submission outcome is uncertain; it will not be repeated automatically: ${journal.error}`,
    );
  }

  const name = batchName(payload);
  if (!name) {
    journal.phase = "submission-uncertain";
    journal.error = "Batch creation returned no recoverable batch name.";
    await atomicJson(path, journal);
    throw new Error(journal.error);
  }
  const previousPath = knownBatchNames.get(name);
  if (previousPath && previousPath !== path) {
    journal.phase = "submission-uncertain";
    journal.returnedName = name;
    journal.error = "Batch creation returned a name already claimed by another journal.";
    await atomicJson(path, journal);
    throw new Error(`${journal.error} Refusing to continue.`);
  }

  journal.name = name;
  journal.phase = "submitted";
  journal.submittedAt = new Date().toISOString();
  delete journal.body;
  await atomicJson(path, journal);
  knownBatchNames.set(name, path);
  process.stdout.write(`Created ${name} for ${journal.jobs.length} side clip(s).\n`);
  return entry;
}

function partitionStableBatchGroups(jobs, reusableIds = new Set(), claimedSignatures = new Set()) {
  const groups = [];
  const groupCount = Math.ceil(jobs.length / BATCH_MAX_JOBS);
  for (let offset = 0; offset < jobs.length; offset += BATCH_MAX_JOBS) {
    const plannedJobs = jobs.slice(offset, offset + BATCH_MAX_JOBS);
    const unfinishedJobs = plannedJobs.filter((job) => (
      !reusableIds.has(job.id)
      && !claimedSignatures.has(`${job.id}\u0000${job.requestSha256}`)
    ));
    groups.push({
      groupNumber: Math.floor(offset / BATCH_MAX_JOBS) + 1,
      groupCount,
      plannedJobs,
      unfinishedJobs,
    });
  }
  return groups;
}

async function submitAllPreparedBatchGroups(key, jobs, records) {
  const entries = await readBatchJournalEntries();
  const knownBatchNames = assertBatchJournalSetSafe(entries);
  const claimedSignatures = new Set(
    entries
      .filter(({ journal }) => ["submitted", "received", "received-partial", "applied"].includes(journal.phase))
      .flatMap(({ journal }) => {
        const failed = new Set(
          (journal.failedJobs || []).map((job) => `${job.id}\u0000${job.requestSha256}`),
        );
        return journal.jobs
          .map((job) => `${job.id}\u0000${job.requestSha256}`)
          .filter((signature) => !failed.has(signature));
      }),
  );
  const reusableIds = new Set(records.keys());
  let submittedGroups = 0;
  let alreadyClaimedJobs = 0;

  for (const group of partitionStableBatchGroups(jobs, reusableIds, claimedSignatures)) {
    const manifestMissing = group.plannedJobs.filter((job) => !reusableIds.has(job.id));
    alreadyClaimedJobs += manifestMissing.length - group.unfinishedJobs.length;
    if (!group.unfinishedJobs.length) continue;
    const entry = await prepareBatchJournal(group.unfinishedJobs);
    const existingIndex = entries.findIndex(({ path }) => path === entry.path);
    if (existingIndex >= 0) entries[existingIndex] = entry;
    else entries.push(entry);
    const action = validateBatchJournal(
      entry.journal,
      group.unfinishedJobs,
      batchPlanIdentity(group.unfinishedJobs).planSha256,
    );
    if (action === "submit") {
      await submitPreparedBatch(key, entry, knownBatchNames);
      submittedGroups += 1;
    } else {
      process.stdout.write(
        `Kept ${entry.journal.name}; phase=${entry.journal.phase}, so it was not resubmitted.\n`,
      );
    }
    for (const job of entry.journal.jobs) {
      claimedSignatures.add(`${job.id}\u0000${job.requestSha256}`);
    }
  }
  process.stdout.write(
    `Submit-only complete: ${submittedGroups} group(s) submitted; ${alreadyClaimedJobs} clip(s) already safely claimed. No polling or installation was performed.\n`,
  );
}

async function waitForBatch(key, name) {
  let transientFailures = 0;
  while (true) {
    let payload;
    try {
      payload = await fetchJson(
        `${API_ROOT}/${name}`,
        { headers: { "x-goog-api-key": key } },
        "Batch poll",
      );
      transientFailures = 0;
    } catch (error) {
      transientFailures += 1;
      if (transientFailures > 8 || (error?.status && ![429, 500, 502, 503, 504].includes(error.status))) {
        throw error;
      }
      process.stdout.write(
        `Batch ${name}: temporary poll failure ${transientFailures}/8; retrying safely.\n`,
      );
      await new Promise((resolvePromise) => setTimeout(resolvePromise, POLL_INTERVAL_MS));
      continue;
    }
    const state = batchState(payload);
    process.stdout.write(`Batch ${name}: ${state}\n`);
    if (/(?:SUCCEEDED|FAILED|CANCELLED|EXPIRED)$/.test(state)) return payload;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, POLL_INTERVAL_MS));
  }
}

function decodeBatchResponses(responses, jobs) {
  const decoded = [];
  const failures = [];
  for (let index = 0; index < jobs.length; index += 1) {
    const entry = responses[index];
    try {
      if (entry?.error || entry?.output?.error) {
        throw new Error(entry?.error?.message || entry?.output?.error?.message);
      }
      const response = entry?.response || entry?.output?.response;
      if (!response) throw new Error("Batch item returned no response.");
      decoded.push(decodePcm(response, jobs[index].id));
    } catch (error) {
      decoded.push(null);
      failures.push({
        id: jobs[index].id,
        requestSha256: jobs[index].requestSha256,
        error: safeMessage(error?.message),
      });
    }
  }
  return { decoded, failures };
}

async function runBatch(key, jobs) {
  const entry = await prepareBatchJournal(jobs);
  const { path, journal } = entry;
  const knownBatchNames = assertBatchJournalSetSafe(await readBatchJournalEntries());
  if (batchJournalAction(journal) === "submit") {
    await submitPreparedBatch(key, entry, knownBatchNames);
  }
  if (!journal.name) throw new Error(`Cannot resume Batch journal in phase ${journal.phase}.`);

  const payload = await waitForBatch(key, journal.name);
  const state = batchState(payload);
  if (!/SUCCEEDED$/.test(state)) {
    journal.phase = "failed";
    journal.error = safeMessage(payload?.error?.message || `Terminal state ${state}`);
    await atomicJson(path, journal);
    throw new Error(`Batch ended in ${state}: ${journal.error}`);
  }
  const responses = inlineResponses(payload);
  if (!responses || responses.length !== jobs.length) {
    throw new Error(`Batch returned ${responses?.length ?? 0} responses for ${jobs.length} jobs.`);
  }
  const { decoded, failures } = decodeBatchResponses(responses, jobs);
  journal.phase = failures.length ? "received-partial" : "received";
  if (failures.length) journal.failedJobs = failures;
  else delete journal.failedJobs;
  journal.completedAt = new Date().toISOString();
  await atomicJson(path, journal);
  return { decoded, failures, journalPath: path, journal, batchName: journal.name };
}

async function recoverCompletedBatch(key, jobs) {
  const entries = await readBatchJournalEntries();
  assertBatchJournalSetSafe(entries);
  for (const { path, journal } of entries) {
    if (
      !journal?.name
      || !["received", "received-partial", "applied"].includes(journal.phase)
      || !Array.isArray(journal.jobs)
    ) continue;
    const planned = new Map(
      journal.jobs.map((item, index) => [item.id, { ...item, index }]),
    );
    if (!jobs.every((job) => planned.get(job.id)?.requestSha256 === job.requestSha256)) continue;
    const payload = await fetchJson(
      `${API_ROOT}/${journal.name}`,
      { headers: { "x-goog-api-key": key } },
      "Completed Batch recovery",
    );
    if (!/SUCCEEDED$/.test(batchState(payload))) continue;
    const responses = inlineResponses(payload);
    if (!responses || responses.length !== journal.jobs.length) continue;
    const selected = jobs.map((job) => responses[planned.get(job.id).index]);
    const { decoded, failures } = decodeBatchResponses(selected, jobs);
    process.stdout.write(`Recovered ${jobs.length} side clip(s) from ${journal.name}.\n`);
    return { decoded, failures, journalPath: path, journal, batchName: journal.name };
  }
  return null;
}

async function recoverClaimedBatchJournals(key, jobs, records, manifest) {
  const entries = await readBatchJournalEntries();
  assertBatchJournalSetSafe(entries);
  const jobsById = new Map(jobs.map((job) => [job.id, job]));

  for (const { path, journal } of entries) {
    if (
      !journal?.name
      || !["submitted", "received", "received-partial", "applied"].includes(journal.phase)
      || !Array.isArray(journal.jobs)
    ) continue;

    const knownFailures = new Set(
      (journal.failedJobs || []).map((failure) => (
        `${failure.id}\u0000${failure.requestSha256}`
      )),
    );
    const recoverableJobs = journal.jobs.flatMap((planned) => {
      const current = jobsById.get(planned.id);
      if (
        !current
        || current.requestSha256 !== planned.requestSha256
        || records.has(current.id)
        || knownFailures.has(`${planned.id}\u0000${planned.requestSha256}`)
      ) return [];
      return [current];
    });
    if (!recoverableJobs.length) continue;

    const payload = journal.phase === "submitted"
      ? await waitForBatch(key, journal.name)
      : await fetchJson(
          `${API_ROOT}/${journal.name}`,
          { headers: { "x-goog-api-key": key } },
          "Claimed Batch recovery",
        );
    const state = batchState(payload);
    if (!/SUCCEEDED$/.test(state)) {
      if (/(?:FAILED|CANCELLED|EXPIRED)$/.test(state)) {
        journal.phase = "failed";
        journal.error = safeMessage(payload?.error?.message || `Terminal state ${state}`);
        await atomicJson(path, journal);
        throw new Error(`Claimed Batch ended in ${state}: ${journal.error}`);
      }
      throw new Error(`Claimed Batch ${journal.name} is not ready: ${state}`);
    }
    const responses = inlineResponses(payload);
    if (!responses || responses.length !== journal.jobs.length) {
      throw new Error(
        `Claimed Batch returned ${responses?.length ?? 0} responses for ${journal.jobs.length} jobs.`,
      );
    }

    if (journal.phase === "submitted") {
      const completePlanJobs = journal.jobs.map((planned) => (
        jobsById.get(planned.id) || {
          id: planned.id,
          requestSha256: planned.requestSha256,
        }
      ));
      const completeResult = decodeBatchResponses(responses, completePlanJobs);
      journal.phase = completeResult.failures.length ? "received-partial" : "received";
      if (completeResult.failures.length) journal.failedJobs = completeResult.failures;
      else delete journal.failedJobs;
      journal.completedAt = new Date().toISOString();
      await atomicJson(path, journal);
    }

    const responseIndexById = new Map(
      journal.jobs.map((planned, index) => [planned.id, index]),
    );
    const selectedResponses = recoverableJobs.map(
      (job) => responses[responseIndexById.get(job.id)],
    );
    const selectedResult = decodeBatchResponses(selectedResponses, recoverableJobs);
    for (let index = 0; index < recoverableJobs.length; index += 1) {
      const decoded = selectedResult.decoded[index];
      if (!decoded) continue;
      const job = recoverableJobs[index];
      const record = await installDecoded(job, decoded, {
        type: "gemini-batch-recovery",
        batchName: journal.name,
      });
      records.set(job.id, record);
      await saveManifest(manifest, jobs, records);
      process.stdout.write(`${job.id}: recovered both paces from ${journal.name}\n`);
    }
  }
}

function defaultManifest(jobs) {
  return {
    schemaVersion: 1,
    toolVersion: TOOL_VERSION,
    model: MODEL,
    voice: VOICE,
    promptVersion: PROMPT_VERSION,
    sourcePromptVersion: SOURCE_PROMPT_VERSION,
    childTransformVersion: CHILD_TRANSFORM_VERSION,
    expectedJobs: jobs.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    jobs: [],
  };
}

async function loadManifest(jobs) {
  if (!(await exists(MANIFEST_PATH))) return defaultManifest(jobs);
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  if (
    manifest?.schemaVersion !== 1
    || manifest?.toolVersion !== TOOL_VERSION
    || manifest?.model !== MODEL
    || manifest?.voice !== VOICE
    || manifest?.promptVersion !== PROMPT_VERSION
    || manifest?.sourcePromptVersion !== SOURCE_PROMPT_VERSION
    || manifest?.childTransformVersion !== CHILD_TRANSFORM_VERSION
    || !Array.isArray(manifest?.jobs)
    || !Number.isInteger(manifest?.expectedJobs)
    || manifest.expectedJobs > jobs.length
  ) {
    throw new Error("Existing story-side audio manifest has an incompatible identity.");
  }
  return { ...manifest, expectedJobs: jobs.length };
}

async function reusableRecord(record, job) {
  if (!record || record.requestSha256 !== job.requestSha256) return false;
  const standardPath = join(ROOT, "public", job.standardPath);
  const childPath = join(ROOT, "public", job.childPath);
  if (!(await exists(standardPath)) || !(await exists(childPath))) return false;
  const [standard, child] = await Promise.all([inspect(standardPath), inspect(childPath)]);
  return standard.sha256 === record.standard?.sha256 && child.sha256 === record.child?.sha256;
}

async function saveManifest(manifest, jobs, records) {
  manifest.jobs = jobs.map((job) => records.get(job.id)).filter(Boolean);
  manifest.expectedJobs = jobs.length;
  manifest.planSha256 = sha256(stableJson(jobs.map((job) => ({
    id: job.id,
    requestSha256: job.requestSha256,
  }))));
  manifest.updatedAt = new Date().toISOString();
  if (manifest.jobs.length === jobs.length) manifest.completedAt ||= new Date().toISOString();
  else delete manifest.completedAt;
  await atomicJson(MANIFEST_PATH, manifest);
}

async function installDecoded(job, decoded, source) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "story-garden-side-audio-"));
  const standardPath = join(ROOT, "public", job.standardPath);
  const childPath = join(ROOT, "public", job.childPath);
  try {
    const pcmPath = join(temporaryRoot, "source.pcm");
    await writeFile(pcmPath, decoded.pcm, { flag: "wx", mode: 0o600 });
    await makeStandard(pcmPath, standardPath);
    const pacing = await makeChild(job, standardPath, childPath);
    const [standard, child] = await Promise.all([inspect(standardPath), inspect(childPath)]);
    if (child.durationSeconds + 0.02 < standard.durationSeconds) {
      throw new Error(`Child version is unexpectedly shorter for ${job.id}.`);
    }
    return {
      ...job,
      model: MODEL,
      voice: VOICE,
      promptVersion: PROMPT_VERSION,
      pacing,
      standard,
      child,
      source: {
        type: source.type,
        batchName: source.batchName || null,
        modelVersion: decoded.modelVersion,
        responseId: decoded.responseId,
      },
      usageMetadata: decoded.usageMetadata,
      generatedAt: new Date().toISOString(),
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function markJournalApplied(batchResult) {
  if (!batchResult?.journalPath || !batchResult?.journal) return;
  const { journal } = batchResult;
  if (batchResult.failures?.length) {
    journal.phase = "received-partial";
  } else {
    journal.phase = "applied";
    journal.appliedAt = new Date().toISOString();
  }
  await atomicJson(batchResult.journalPath, journal);
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const jobs = planJobs();
  process.stdout.write(
    `Plan: ${jobs.length} left/right clip(s), each with one standard and one child-slow file.\n`,
  );
  if (options.dryRun || !jobs.length) return;

  if (![WORK_ROOT, JOURNAL_ROOT, STANDARD_ROOT, CHILD_ROOT].every((path) => within(path, ROOT))) {
    throw new Error("A story-side audio output root escapes the project.");
  }
  await Promise.all(["ffmpeg", "ffprobe"].map((command) => run(command, ["-version"], {
    encoding: "utf8",
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
  })));
  await Promise.all([
    mkdir(WORK_ROOT, { recursive: true }),
    mkdir(JOURNAL_ROOT, { recursive: true }),
    mkdir(STANDARD_ROOT, { recursive: true }),
    mkdir(CHILD_ROOT, { recursive: true }),
  ]);

  const manifest = await loadManifest(jobs);
  const loadedRecords = new Map(manifest.jobs.map((record) => [record.id, record]));
  const records = new Map();
  for (const job of jobs) {
    const record = loadedRecords.get(job.id);
    if (await reusableRecord(record, job)) records.set(job.id, record);
  }
  if (options.mode !== "submit-batches") await saveManifest(manifest, jobs, records);
  const missing = jobs.filter((job) => !records.has(job.id));
  process.stdout.write(`${records.size}/${jobs.length} side clip(s) reusable; ${missing.length} remain.\n`);
  if (!missing.length) return;

  const key = await apiKey();
  if (options.mode === "submit-batches") {
    await submitAllPreparedBatchGroups(key, jobs, records);
    return;
  }

  // Recover every safely claimed request before creating new groups. This
  // prevents duplicate submissions even if page-side data was appended and
  // stable group boundaries changed after an earlier submit-only pass.
  await recoverClaimedBatchJournals(key, jobs, records, manifest);
  const isolatedRepairSignatures = new Set(
    (await readBatchJournalEntries()).flatMap(({ journal }) => (
      (journal.failedJobs || []).map((failure) => (
        `${failure.id}\u0000${failure.requestSha256}`
      ))
    )),
  );

  const groupCount = Math.ceil(jobs.length / BATCH_MAX_JOBS);
  for (let offset = 0; offset < jobs.length; offset += BATCH_MAX_JOBS) {
    const plannedGroup = jobs.slice(offset, offset + BATCH_MAX_JOBS);
    const batchJobs = plannedGroup.filter((job) => (
      !records.has(job.id)
      && !isolatedRepairSignatures.has(`${job.id}\u0000${job.requestSha256}`)
    ));
    if (!batchJobs.length) continue;
    const groupNumber = Math.floor(offset / BATCH_MAX_JOBS) + 1;
    process.stdout.write(`Batch group ${groupNumber}/${groupCount}: ${batchJobs.length} unfinished clip(s).\n`);
    const batchResult = await recoverCompletedBatch(key, batchJobs) ?? await runBatch(key, batchJobs);
    for (let index = 0; index < batchJobs.length; index += 1) {
      const job = batchJobs[index];
      const decoded = batchResult.decoded[index];
      if (!decoded) {
        isolatedRepairSignatures.add(`${job.id}\u0000${job.requestSha256}`);
        process.stdout.write(`${job.id}: unusable Batch result; queued for isolated repair.\n`);
        continue;
      }
      const record = await installDecoded(job, decoded, {
        type: "gemini-batch",
        batchName: batchResult.batchName,
      });
      records.set(job.id, record);
      await saveManifest(manifest, jobs, records);
      process.stdout.write(`${job.id}: installed both paces\n`);
    }
    await markJournalApplied(batchResult);
  }

  let unfinished = jobs.filter((job) => !records.has(job.id));
  for (const job of unfinished) {
    process.stdout.write(`${job.id}: isolated Batch repair\n`);
    const result = await runBatch(key, [job]);
    const decoded = result.decoded[0];
    if (!decoded) throw new Error(`Isolated Batch repair returned unusable audio for ${job.id}.`);
    const record = await installDecoded(job, decoded, {
      type: "gemini-batch-repair",
      batchName: result.batchName,
    });
    records.set(job.id, record);
    await saveManifest(manifest, jobs, records);
    await markJournalApplied(result);
  }

  unfinished = jobs.filter((job) => !records.has(job.id));
  if (unfinished.length) throw new Error(`${unfinished.length} story-side clip(s) remain unfinished.`);
  process.stdout.write(
    `Complete: ${jobs.length} standard side clips and ${jobs.length} child-slow side clips.\n`,
  );
}

export {
  BATCH_MAX_JOBS,
  CHILD_ROOT,
  JOURNAL_ROOT,
  MANIFEST_PATH,
  MODEL,
  PROMPT_VERSION,
  ROOT,
  STANDARD_ROOT,
  TOOL_VERSION,
  VOICE,
  assertBatchJournalSetSafe,
  batchJournalAction,
  batchPlanIdentity,
  decodeBatchResponses,
  main,
  parseArguments,
  partitionStableBatchGroups,
  planJobs,
  prepareBatchJournal,
  requestFor,
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${safeMessage(error?.stack || error?.message)}\n`);
    process.exitCode = 1;
  });
}
