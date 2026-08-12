#!/usr/bin/env node

import { execFile } from "node:child_process";
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
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { DINOSAUR_PRONUNCIATION_ITEMS } from "../app/dinosaur-pronunciation-data.ts";

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORK_ROOT = join(ROOT, "work", "dinosaur-pronunciation-audio");
const MANIFEST_PATH = join(WORK_ROOT, "manifest.json");
const STANDARD_ROOT = join(ROOT, "public", "dinosaur-pronunciation-audio-standard");
const CHILD_ROOT = join(ROOT, "public", "dinosaur-pronunciation-audio");
const MODEL = "gemini-2.5-pro-preview-tts";
const VOICE = "Aoede";
const PROMPT_VERSION = "dinosaur-name-aoede-us-v1";
const CHILD_TEMPO = 0.88;
const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";
const DIRECT_URL = `${API_ROOT}/models/${MODEL}:generateContent`;
const BATCH_URL = `${API_ROOT}/models/${MODEL}:batchGenerateContent`;
const REQUEST_TIMEOUT_MS = 180_000;
const POLL_INTERVAL_MS = 15_000;
const BATCH_MAX_JOBS = 35;
const sensitiveValues = new Set();

const DINOSAURS = DINOSAUR_PRONUNCIATION_ITEMS.map((item) => ({
  id: item.id,
  name: item.name,
  pronunciationGuide: item.pronunciation,
  coachText: item.coachScript,
  descriptionText: item.description.join(" "),
  chunks: item.chunks.map((chunk) => ({ ...chunk })),
}));

function usage() {
  return [
    "Generate prepared Aoede pronunciation audio for the Dinosaur Pronunciation Lab.",
    "",
    "Usage:",
    "  node scripts/generate-dinosaur-pronunciation-audio.mjs",
    "  node scripts/generate-dinosaur-pronunciation-audio.mjs --batch",
    "  node scripts/generate-dinosaur-pronunciation-audio.mjs --submit-batches",
    "  node scripts/generate-dinosaur-pronunciation-audio.mjs --direct",
    "  node scripts/generate-dinosaur-pronunciation-audio.mjs --dry-run",
    "",
    "Default mode is auto: try synchronous generation, then move unfinished jobs to",
    `the resumable Gemini Batch API in groups of at most ${BATCH_MAX_JOBS} when synchronous quota is exhausted.`,
    "--submit-batches only creates/reuses journals and submits prepared groups;",
    "it never polls, downloads, installs audio, or changes the manifest.",
    "Credentials: GEMINI_API_KEY, or GEMINI_KEY_PROJECT + GEMINI_KEY_NAME.",
  ].join("\n");
}

function parseArguments(argv) {
  const options = { mode: "auto", dryRun: false };
  for (const argument of argv) {
    if (argument === "--batch") options.mode = "batch";
    else if (argument === "--submit-batches") options.mode = "submit-batches";
    else if (argument === "--direct") options.mode = "direct";
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--help" || argument === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}\n\n${usage()}`);
    }
  }
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

async function apiKey() {
  const direct = process.env.GEMINI_API_KEY?.trim();
  if (direct) {
    sensitiveValues.add(direct);
    return direct;
  }
  const project = process.env.GEMINI_KEY_PROJECT?.trim();
  const keyName = process.env.GEMINI_KEY_NAME?.trim();
  if (!project || !keyName) {
    throw new Error("No Gemini credential is configured. Set GEMINI_API_KEY, or both GEMINI_KEY_PROJECT and GEMINI_KEY_NAME.");
  }
  let stdout;
  try {
    ({ stdout } = await run(
      "gcloud",
      [
        "services", "api-keys", "get-key-string", keyName,
        "--project", project,
        "--format=value(keyString)",
        "--quiet",
      ],
      { encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 },
    ));
  } catch {
    throw new Error("gcloud could not retrieve the configured Gemini API key.");
  }
  const key = stdout.trim();
  if (!key || /\s/.test(key) || key.length < 20) throw new Error("gcloud returned an invalid Gemini API key.");
  sensitiveValues.add(key);
  return key;
}

function promptFor(job) {
  if (job.kind === "whole") {
    return [
      "Say the supplied dinosaur name as a warm, patient Primary 1 English teacher.",
      "Use clear, natural General American English pronunciation.",
      `The intended classroom pronunciation is ${job.pronunciationGuide}; use this only as guidance.`,
      "Say only the dinosaur name, exactly once. Do not add an article, definition, spelling, introduction, or closing sound.",
      "TARGET NAME START",
      job.name,
      "TARGET NAME END",
    ].join("\n");
  }
  if (job.kind === "coach") return [
    "Read the supplied pronunciation-coach script as a warm, patient Primary 1 English teacher.",
    "Use clear, natural General American English pronunciation.",
    `The whole dinosaur name follows the common pronunciation ${job.pronunciationGuide}.`,
    "Pause briefly between the short sound chunks. Say the first and final whole name smoothly.",
    "Read exactly the script and add no introduction, explanation, encouragement, or closing sound.",
    "SCRIPT START",
    job.spokenText,
    "SCRIPT END",
  ].join("\n");
  if (job.kind === "description") return [
    "Read the supplied three-sentence dinosaur description as a warm, engaging Primary 1 nonfiction narrator.",
    "Use clear, natural General American English pronunciation and a calm child-friendly pace.",
    "Keep each sentence expressive and pause naturally between sentences.",
    "Read exactly the supplied description. Do not add an introduction, definition, encouragement, or closing sound.",
    "DESCRIPTION START",
    job.spokenText,
    "DESCRIPTION END",
  ].join("\n");
  return [
    "Say the supplied sound chunk as a warm, patient Primary 1 English teacher.",
    "Use clear, natural General American English pronunciation.",
    `This sound chunk comes from ${job.name}, pronounced ${job.pronunciationGuide}.`,
    "Say only the chunk cue, exactly once. Do not say its spelling, the whole dinosaur name, an introduction, or a closing sound.",
    "TARGET CHUNK START",
    job.spokenText,
    "TARGET CHUNK END",
  ].join("\n");
}

function requestFor(job) {
  return {
    contents: [{ parts: [{ text: promptFor(job) }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } },
      },
    },
  };
}

function planJobs() {
  const jobs = DINOSAURS.flatMap((dinosaur) => [
    { ...dinosaur, kind: "whole", spokenText: dinosaur.name, fileName: "whole.mp3" },
    { ...dinosaur, kind: "coach", spokenText: dinosaur.coachText, fileName: "coach.mp3" },
    { ...dinosaur, kind: "description", spokenText: dinosaur.descriptionText, fileName: "description.mp3" },
    ...dinosaur.chunks.map((chunk) => ({
      ...dinosaur,
      kind: `chunk-${chunk.id}`,
      spokenText: chunk.cue,
      fileName: `chunk-${chunk.id}.mp3`,
      chunk,
    })),
  ]).map((job) => {
    const id = `${job.id}/${job.kind}`;
    const planned = {
      ...job,
      id,
      standardPath: `dinosaur-pronunciation-audio-standard/${job.id}/${job.fileName}`,
      childPath: `dinosaur-pronunciation-audio/${job.id}/${job.fileName}`,
    };
    planned.promptSha256 = sha256(promptFor(planned));
    planned.requestSha256 = sha256(stableJson(requestFor(planned)));
    return planned;
  });
  const expected = DINOSAURS.reduce((total, dinosaur) => total + 3 + dinosaur.chunks.length, 0);
  if (jobs.length !== expected || new Set(jobs.map((job) => job.id)).size !== jobs.length) {
    throw new Error("Dinosaur pronunciation plan is incomplete or contains duplicate IDs.");
  }
  for (const job of jobs) {
    if (!/^[a-z0-9-]+\/(?:whole|coach|description|chunk-[a-z0-9-]+)$/.test(job.id)) throw new Error(`Unsafe job ID: ${job.id}`);
  }
  return jobs;
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
  const rate = Number(mimeType.match(/rate=(\d+)/i)?.[1] || 24_000);
  if (rate !== 24_000) throw new Error(`Unexpected PCM sample rate for ${id}: ${rate}`);
  const pcm = Buffer.from(encoded, "base64");
  if (pcm.length < 1_024 || pcm.length % 2 !== 0) throw new Error(`Invalid PCM length for ${id}.`);
  if (candidate?.finishReason !== "STOP") throw new Error(`Unexpected finish reason for ${id}.`);
  if (payload?.modelVersion && payload.modelVersion !== MODEL) {
    throw new Error(`Unexpected model version for ${id}: ${safeMessage(payload.modelVersion)}`);
  }
  return {
    pcm,
    mimeType,
    modelVersion: payload?.modelVersion || null,
    responseId: payload?.responseId || null,
    usageMetadata: payload?.usageMetadata || null,
  };
}

async function inspect(path) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size < 4_000 || info.size > 500_000) {
    throw new Error(`Unsafe MP3 at ${path}.`);
  }
  const { stdout } = await run(
    "ffprobe",
    [
      "-v", "error",
      "-show_entries", "stream=codec_name,sample_rate,channels:format=duration",
      "-of", "json",
      path,
    ],
    { encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 },
  );
  const probe = JSON.parse(stdout);
  const stream = probe?.streams?.[0];
  const durationSeconds = Number(probe?.format?.duration);
  if (
    probe?.streams?.length !== 1
    || stream?.codec_name !== "mp3"
    || Number(stream?.sample_rate) !== 24_000
    || Number(stream?.channels) !== 1
    || durationSeconds < 0.6
    || durationSeconds > 30
  ) {
    throw new Error(`Invalid MP3 format or duration at ${path}.`);
  }
  await run("ffmpeg", ["-nostdin", "-v", "error", "-i", path, "-f", "null", "-"], {
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  });
  return {
    bytes: info.size,
    durationSeconds: Number(durationSeconds.toFixed(3)),
    sha256: sha256(await readFile(path)),
  };
}

async function makeStandard(pcmPath, destination) {
  await mkdir(dirname(destination), { recursive: true });
  await run(
    "ffmpeg",
    [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
      "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", pcmPath,
      "-vn", "-af", "adelay=120,apad=pad_dur=0.28,loudnorm=I=-18:TP=-2:LRA=7",
      "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "64k",
      "-ar", "24000", "-ac", "1", destination,
    ],
    { encoding: "utf8", timeout: 120_000, maxBuffer: 4 * 1024 * 1024 },
  );
}

async function makeChild(standard, destination) {
  await mkdir(dirname(destination), { recursive: true });
  await run(
    "ffmpeg",
    [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", standard,
      "-vn", "-af", `atempo=${CHILD_TEMPO},adelay=100,apad=pad_dur=0.16,loudnorm=I=-18:TP=-2:LRA=7`,
      "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "64k",
      "-ar", "24000", "-ac", "1", destination,
    ],
    { encoding: "utf8", timeout: 120_000, maxBuffer: 4 * 1024 * 1024 },
  );
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
    const error = new Error(`${label} failed (HTTP ${response.status}): ${safeMessage(payload?.error?.message || response.statusText)}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function generateDirect(key, job) {
  const payload = await fetchJson(
    DIRECT_URL,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(requestFor(job)),
    },
    job.id,
  );
  return decodePcm(payload, job.id);
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
  return [payload?.state, payload?.metadata?.state, payload?.response?.state, payload?.response?.metadata?.state]
    .find((value) => typeof value === "string") || (payload?.done ? "JOB_STATE_SUCCEEDED" : "JOB_STATE_PENDING");
}

function batchName(payload) {
  return [payload?.name, payload?.metadata?.name, payload?.response?.name, payload?.response?.metadata?.name]
    .find((value) => typeof value === "string" && /^batches\/[A-Za-z0-9_-]+$/.test(value));
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
      displayName: `story-garden-dinosaur-pronunciation-${planSha256.slice(0, 12)}`,
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
  if (["submitted", "received", "received-partial", "applied"].includes(journal?.phase)) return "skip-submission";
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
    || journal?.planSha256 !== planSha256
    || journal?.model !== MODEL
    || journal?.voice !== VOICE
    || !Array.isArray(journal?.jobs)
    || journal.jobs.length !== jobs.length
    || !jobs.every((job, index) => (
      journal.jobs[index]?.id === job.id
      && journal.jobs[index]?.requestSha256 === job.requestSha256
    ))
  ) {
    throw new Error("Existing Batch journal belongs to a different unfinished request plan.");
  }
  const action = batchJournalAction(journal);
  if (action === "submit") {
    if (journal.name) throw new Error("Prepared Batch journal unexpectedly already has a batch name.");
    if (!journal.body || journal.bodySha256 !== sha256(stableJson(journal.body))) {
      throw new Error("Batch journal body hash mismatch.");
    }
  } else if (!/^batches\/[A-Za-z0-9_-]+$/.test(journal.name || "")) {
    throw new Error(`Batch journal in phase ${journal.phase} has no recoverable batch name.`);
  }
  return action;
}

async function readBatchJournalEntries(workRoot = WORK_ROOT) {
  if (!(await exists(workRoot))) return [];
  const names = (await readdir(workRoot))
    .filter((name) => /^batch-[a-z0-9-]+\.json$/.test(name))
    .sort();
  return Promise.all(names.map(async (name) => {
    const path = join(workRoot, name);
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
  for (const entry of entries) {
    const { journal, path } = entry;
    if (
      journal?.schemaVersion !== 1
      || journal?.model !== MODEL
      || journal?.voice !== VOICE
      || !Array.isArray(journal?.jobs)
      || journal.jobs.some((job) => (
        typeof job?.id !== "string"
        || !/^[a-f0-9]{64}$/.test(job?.requestSha256 || "")
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

async function prepareBatchJournal(jobs, workRoot = WORK_ROOT) {
  if (!jobs.length || jobs.length > BATCH_MAX_JOBS) {
    throw new Error(`A Batch journal must contain between 1 and ${BATCH_MAX_JOBS} jobs.`);
  }
  const { planSha256, journalName } = batchPlanIdentity(jobs);
  const path = join(workRoot, journalName);
  if (await exists(path)) {
    const journal = JSON.parse(await readFile(path, "utf8"));
    validateBatchJournal(journal, jobs, planSha256);
    return { path, journal, created: false };
  }

  const body = batchRequestBody(jobs, planSha256);
  const journal = {
    schemaVersion: 1,
    planSha256,
    model: MODEL,
    voice: VOICE,
    jobs: jobs.map((job) => ({ id: job.id, requestSha256: job.requestSha256 })),
    body,
    bodySha256: sha256(stableJson(body)),
    phase: "prepared",
    name: null,
    createdAt: new Date().toISOString(),
  };
  await atomicJson(path, journal);
  return { path, journal, created: true };
}

async function submitPreparedBatch(key, entry, knownBatchNames) {
  const { journal, path } = entry;
  if (batchJournalAction(journal) !== "submit") {
    throw new Error(`Only a prepared Batch journal may be submitted: ${path}`);
  }
  if (!journal.body || journal.bodySha256 !== sha256(stableJson(journal.body))) {
    throw new Error("Batch journal body hash mismatch.");
  }

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
    journal.phase = "submission-uncertain";
    journal.error = safeMessage(error?.message);
    await atomicJson(path, journal);
    throw new Error(`Batch submission outcome is uncertain; it will not be repeated automatically: ${journal.error}`);
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
  process.stdout.write(`Created ${name} for ${journal.jobs.length} clips.\n`);
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

    process.stdout.write(
      `Submit-only group ${group.groupNumber}/${group.groupCount}: ${group.unfinishedJobs.length} unclaimed clip(s).\n`,
    );
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
      process.stdout.write(`Kept ${entry.journal.name}; phase=${entry.journal.phase}, so it was not resubmitted.\n`);
    }
    for (const job of entry.journal.jobs) {
      claimedSignatures.add(`${job.id}\u0000${job.requestSha256}`);
    }
  }

  process.stdout.write(
    `Submit-only complete: ${submittedGroups} prepared group(s) submitted; ${alreadyClaimedJobs} clip(s) already covered by safe journals. No polling or audio installation was performed.\n`,
  );
}

async function waitForBatch(key, name) {
  while (true) {
    const payload = await fetchJson(
      `${API_ROOT}/${name}`,
      { headers: { "x-goog-api-key": key } },
      "Batch poll",
    );
    const state = batchState(payload);
    process.stdout.write(`Batch ${state}\n`);
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
  const { path: batchJournalPath, journal } = entry;
  const knownBatchNames = assertBatchJournalSetSafe(await readBatchJournalEntries());
  if (batchJournalAction(journal) === "submit") {
    await submitPreparedBatch(key, entry, knownBatchNames);
  }
  if (!journal.name) throw new Error(`Cannot safely resume Batch journal in phase ${journal.phase}.`);

  const payload = await waitForBatch(key, journal.name);
  const state = batchState(payload);
  if (!/SUCCEEDED$/.test(state)) {
    journal.phase = "failed";
    journal.error = safeMessage(payload?.error?.message || `Terminal state ${state}`);
    await atomicJson(batchJournalPath, journal);
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
  await atomicJson(batchJournalPath, journal);
  if (failures.length) {
    process.stdout.write(
      `Batch ${journal.name} returned ${failures.length} unusable clip(s); valid clips will be installed before targeted repair.\n`,
    );
  }
  return { decoded, failures, batchJournalPath, batchName: journal.name };
}

async function recoverCompletedBatch(key, jobs) {
  if (!(await exists(WORK_ROOT))) return null;
  const names = (await readdir(WORK_ROOT))
    .filter((name) => /^batch-[a-f0-9]+\.json$/.test(name));
  for (const name of names) {
    const path = join(WORK_ROOT, name);
    const journal = JSON.parse(await readFile(path, "utf8"));
    if (!journal?.name || !["received", "received-partial", "applied"].includes(journal.phase) || !Array.isArray(journal.jobs)) continue;
    const planned = new Map(journal.jobs.map((item, index) => [item.id, { ...item, index }]));
    if (!jobs.every((job) => planned.get(job.id)?.requestSha256 === job.requestSha256)) continue;
    const payload = await fetchJson(
      `${API_ROOT}/${journal.name}`,
      { headers: { "x-goog-api-key": key } },
      "Completed Batch recovery",
    );
    if (!/SUCCEEDED$/.test(batchState(payload))) continue;
    const responses = inlineResponses(payload);
    if (!responses || responses.length !== journal.jobs.length) continue;
    const selectedResponses = jobs.map((job) => {
      const index = planned.get(job.id).index;
      return responses[index];
    });
    const { decoded, failures } = decodeBatchResponses(selectedResponses, jobs);
    process.stdout.write(`Recovered ${jobs.length} unfinished clip(s) from ${journal.name}.\n`);
    return { decoded, failures, batchJournalPath: path, batchName: journal.name };
  }
  return null;
}

async function defaultManifest(jobs) {
  return {
    schemaVersion: 1,
    model: MODEL,
    voice: VOICE,
    promptVersion: PROMPT_VERSION,
    expectedJobs: jobs.length,
    childTransform: { version: "dinosaur-child-atempo-v1", atempo: CHILD_TEMPO },
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
    || manifest?.model !== MODEL
    || manifest?.voice !== VOICE
    || manifest?.promptVersion !== PROMPT_VERSION
    || !Array.isArray(manifest?.jobs)
    || !Number.isInteger(manifest?.expectedJobs)
    || manifest.expectedJobs > jobs.length
  ) {
    throw new Error("Existing dinosaur pronunciation manifest has an incompatible identity.");
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
  manifest.planSha256 = sha256(stableJson(jobs.map((job) => ({ id: job.id, requestSha256: job.requestSha256 }))));
  manifest.updatedAt = new Date().toISOString();
  if (manifest.jobs.length === jobs.length) manifest.completedAt ||= new Date().toISOString();
  else delete manifest.completedAt;
  await atomicJson(MANIFEST_PATH, manifest);
}

async function installDecoded(job, decoded, source) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "story-garden-dinosaur-pronunciation-"));
  const standardPath = join(ROOT, "public", job.standardPath);
  const childPath = join(ROOT, "public", job.childPath);
  try {
    const pcmPath = join(temporaryRoot, "source.pcm");
    await writeFile(pcmPath, decoded.pcm, { flag: "wx", mode: 0o600 });
    await makeStandard(pcmPath, standardPath);
    await makeChild(standardPath, childPath);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
  const [standard, child] = await Promise.all([inspect(standardPath), inspect(childPath)]);
  if (child.durationSeconds <= standard.durationSeconds) {
    throw new Error(`Child version is not slower for ${job.id}.`);
  }
  return {
    ...job,
    model: MODEL,
    voice: VOICE,
    promptVersion: PROMPT_VERSION,
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
}

function equivalentChunkJob(job, jobs, records) {
  if (!job.kind.startsWith("chunk-")) return null;
  return jobs.find((candidate) => (
    candidate.id !== job.id
    && candidate.name === job.name
    && candidate.kind.startsWith("chunk-")
    && candidate.spokenText.trim().toLowerCase() === job.spokenText.trim().toLowerCase()
    && records.has(candidate.id)
  )) || null;
}

async function reuseEquivalentChunk(job, jobs, records) {
  const equivalent = equivalentChunkJob(job, jobs, records);
  if (!equivalent) return null;

  const sourceRecord = records.get(equivalent.id);
  const sourceStandard = join(ROOT, "public", sourceRecord.standardPath);
  const sourceChild = join(ROOT, "public", sourceRecord.childPath);
  const destinationStandard = join(ROOT, "public", job.standardPath);
  const destinationChild = join(ROOT, "public", job.childPath);
  await Promise.all([
    mkdir(dirname(destinationStandard), { recursive: true }),
    mkdir(dirname(destinationChild), { recursive: true }),
  ]);
  await Promise.all([
    copyFile(sourceStandard, destinationStandard),
    copyFile(sourceChild, destinationChild),
  ]);
  const [standard, child] = await Promise.all([
    inspect(destinationStandard),
    inspect(destinationChild),
  ]);
  if (child.durationSeconds <= standard.durationSeconds) {
    throw new Error(`Equivalent child version is not slower for ${job.id}.`);
  }
  return {
    ...job,
    model: MODEL,
    voice: VOICE,
    promptVersion: PROMPT_VERSION,
    standard,
    child,
    source: {
      type: "equivalent-chunk-reuse",
      derivedFrom: equivalent.id,
      batchName: sourceRecord.source?.batchName || null,
      modelVersion: sourceRecord.source?.modelVersion || null,
      responseId: sourceRecord.source?.responseId || null,
    },
    usageMetadata: sourceRecord.usageMetadata || null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  for (const command of ["ffmpeg", "ffprobe"]) {
    await run(command, ["-version"], { encoding: "utf8", timeout: 15_000, maxBuffer: 1024 * 1024 });
  }
  if (![WORK_ROOT, STANDARD_ROOT, CHILD_ROOT].every((path) => within(path, ROOT))) {
    throw new Error("An output root escapes the project.");
  }
  await Promise.all([mkdir(WORK_ROOT, { recursive: true }), mkdir(STANDARD_ROOT, { recursive: true }), mkdir(CHILD_ROOT, { recursive: true })]);

  const jobs = planJobs();
  const manifest = await loadManifest(jobs);
  const records = new Map();
  const loadedRecords = new Map(manifest.jobs.map((record) => [record.id, record]));
  for (const job of jobs) {
    const record = loadedRecords.get(job.id);
    if (await reusableRecord(record, job)) records.set(job.id, record);
  }
  if (options.mode !== "submit-batches") await saveManifest(manifest, jobs, records);
  let missing = jobs.filter((job) => !records.has(job.id));
  process.stdout.write(`${records.size}/${jobs.length} clips reusable; ${missing.length} remain.\n`);
  if (options.dryRun || !missing.length) return;

  const key = await apiKey();
  if (options.mode === "submit-batches") {
    await submitAllPreparedBatchGroups(key, jobs, records);
    return;
  }
  if (options.mode !== "batch") {
    for (const job of [...missing]) {
      try {
        const decoded = await generateDirect(key, job);
        const record = await installDecoded(job, decoded, { type: "gemini-direct" });
        records.set(job.id, record);
        await saveManifest(manifest, jobs, records);
        process.stdout.write(`${job.id}: generated synchronously\n`);
      } catch (error) {
        if (options.mode === "auto" && [429, 500, 503].includes(error?.status)) {
          process.stdout.write(`Synchronous quota unavailable at ${job.id}; moving unfinished clips to Batch.\n`);
          break;
        }
        throw error;
      }
    }
  }

  missing = jobs.filter((job) => !records.has(job.id));
  if (missing.length && options.mode !== "direct") {
    const batchGroupCount = Math.ceil(jobs.length / BATCH_MAX_JOBS);
    for (let offset = 0; offset < jobs.length; offset += BATCH_MAX_JOBS) {
      // Partition the complete plan, then remove reusable records. Stable plan
      // boundaries let a partially installed Batch recover the remaining items
      // from its existing journal instead of submitting them again after restart.
      const plannedGroup = jobs.slice(offset, offset + BATCH_MAX_JOBS);
      const batchJobs = plannedGroup.filter((job) => !records.has(job.id));
      if (!batchJobs.length) continue;

      const groupNumber = Math.floor(offset / BATCH_MAX_JOBS) + 1;
      process.stdout.write(`Batch group ${groupNumber}/${batchGroupCount}: ${batchJobs.length} unfinished clip(s).\n`);
      const batchResult = await recoverCompletedBatch(key, batchJobs) ?? await runBatch(key, batchJobs);
      for (let index = 0; index < batchJobs.length; index += 1) {
        const job = batchJobs[index];
        const decoded = batchResult.decoded[index];
        if (!decoded) {
          process.stdout.write(`${job.id}: Batch audio was unusable; queued for targeted repair.\n`);
          continue;
        }
        const record = await installDecoded(job, decoded, {
          type: "gemini-batch",
          batchName: batchResult.batchName,
        });
        records.set(job.id, record);
        await saveManifest(manifest, jobs, records);
        process.stdout.write(`${job.id}: generated through Batch\n`);
      }
    }
  }

  missing = jobs.filter((job) => !records.has(job.id));
  if (missing.length && options.mode !== "direct") {
    process.stdout.write(`Repair pass: ${missing.length} unfinished clip(s), one isolated request at a time.\n`);
    for (const job of [...missing]) {
      const reused = await reuseEquivalentChunk(job, jobs, records);
      if (reused) {
        records.set(job.id, reused);
        await saveManifest(manifest, jobs, records);
        process.stdout.write(`${job.id}: reused the matching sound from ${reused.source.derivedFrom}\n`);
        continue;
      }
      let decoded;
      let source = { type: "gemini-repair", batchName: null };
      if (options.mode === "batch") {
        const repairResult = await runBatch(key, [job]);
        decoded = repairResult.decoded[0];
        source = { type: "gemini-batch-repair", batchName: repairResult.batchName };
      } else {
        try {
          decoded = await generateDirect(key, job);
        } catch (error) {
          if (![429, 500, 503].includes(error?.status)) throw error;
          const repairResult = await runBatch(key, [job]);
          decoded = repairResult.decoded[0];
          source = { type: "gemini-batch-repair", batchName: repairResult.batchName };
        }
      }
      if (!decoded) throw new Error(`Targeted repair returned unusable audio for ${job.id}.`);
      const record = await installDecoded(job, decoded, source);
      records.set(job.id, record);
      await saveManifest(manifest, jobs, records);
      process.stdout.write(`${job.id}: repaired\n`);
    }
  }

  missing = jobs.filter((job) => !records.has(job.id));
  if (missing.length) throw new Error(`${missing.length} dinosaur pronunciation clip(s) remain unfinished.`);
  process.stdout.write(`Complete: ${jobs.length} standard clips and ${jobs.length} child-slow clips.\n`);
}

export {
  BATCH_MAX_JOBS,
  CHILD_TEMPO,
  CHILD_ROOT,
  DINOSAURS,
  MANIFEST_PATH,
  MODEL,
  PROMPT_VERSION,
  ROOT,
  STANDARD_ROOT,
  VOICE,
  assertBatchJournalSetSafe,
  batchJournalAction,
  batchPlanIdentity,
  decodeBatchResponses,
  equivalentChunkJob,
  inspect,
  parseArguments,
  partitionStableBatchGroups,
  planJobs,
  prepareBatchJournal,
  requestFor,
  reuseEquivalentChunk,
  submitAllPreparedBatchGroups,
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${safeMessage(error?.stack || error?.message)}\n`);
    process.exitCode = 1;
  });
}
