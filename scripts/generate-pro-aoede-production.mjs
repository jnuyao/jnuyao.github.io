#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  link,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { hostname } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { BOOKS } from "../app/book-data.ts";
import { buildStoryNarrationSegments, prepareSpeechText } from "../app/narration.ts";

const run = promisify(execFile);
const SCRIPT_ROOT = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_ROOT, "..");
const WORK_ROOT = join(PROJECT_ROOT, "work");
const PUBLIC_ROOT = join(PROJECT_ROOT, "public");
const RAW_ROOT = join(WORK_ROOT, "aoede-production");
const RAW_MANIFEST_PATH = join(RAW_ROOT, "manifest.json");
const STAGING_ROOT = join(WORK_ROOT, "pro-aoede-production");
const MANIFEST_PATH = join(STAGING_ROOT, "manifest.json");
const SOURCE_PLAN_PATH = join(STAGING_ROOT, "source-plan.json");
const BATCH_RUNS_ROOT = join(STAGING_ROOT, "batch-runs");
const LOCK_ROOT = join(STAGING_ROOT, ".generate.lock");
const SOURCE_MODEL_NAME = "gemini-2.5-flash-preview-tts";
const MODEL_NAME = "gemini-2.5-pro-preview-tts";
const MODEL_RESOURCE = `models/${MODEL_NAME}`;
const VOICE_NAME = "Aoede";
const PROMPT_VERSION = "p1-aoede-v1";
const TOOL_VERSION = "pro-aoede-production-batch-v1";
const GENERATOR_VERSION = "pro-aoede-production-v1";
const CREATE_URL = `https://generativelanguage.googleapis.com/v1beta/${MODEL_RESOURCE}:batchGenerateContent`;
const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 180_000;
const DEFAULT_POLL_SECONDS = 15;
const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 10;
const EXPECTED_TOTAL = 134;
const EXPECTED_BOOKS = 10;
const EXPECTED_STORY_PAGES = 94;
const EXPECTED_TASKS = 40;
const MINIMUM_AUDIO_BYTES = 1_024;
const MAXIMUM_AUDIO_BYTES = 500 * 1_024;
const sensitiveValues = new Set();
let activeLock = null;

const BASE_PROMPT = [
  "Read the supplied English text as a warm, patient picture-book storyteller for a Singapore Primary 1 learner.",
  "Use clear, neutral General American English at a gentle pace of about 90 to 100 words per minute.",
  "Use natural phrasing, crisp consonants, and comfortable pauses so a beginning reader can follow each sentence.",
  "Sound warm and engaging, but calm and authentic: no baby talk, no cartoon voice, no sing-song delivery, and no exaggerated character acting.",
  "Speak only the supplied reading text, exactly once, preserving every word and its order.",
  "Do not add, omit, repeat, paraphrase, explain, spell, announce, or introduce anything.",
].join(" ");

const STORY_DIRECTION = [
  "Read this as a continuous story page.",
  "Give dialogue subtly distinct natural intonation without shouting, even when the printed text uses words such as screamed or roared.",
  "Let rhyme, repetition, and sound words be easy to hear, but keep them comfortably quiet and natural.",
].join(" ");

const TASK_DIRECTIONS = {
  listen: "Read this as one clear listening example, with a short natural pause between sentences.",
  speak: "Read this as one warm, fluent model line for the learner to imitate.",
  read: "Read this as a natural short passage, with phrasing that supports meaning.",
  write: "Read this as one calm, complete model sentence.",
};

const PROMPT_WRAPPER =
  "Read only the text between READING TEXT START and READING TEXT END. Do not speak either marker.";
const PROMPT_TEMPLATE_HASH = sha256(stableJson({
  base: BASE_PROMPT,
  story: STORY_DIRECTION,
  tasks: TASK_DIRECTIONS,
  wrapper: PROMPT_WRAPPER,
  markers: ["READING TEXT START", "READING TEXT END"],
}));

const ACTIVE_PHASES = new Set(["prepared", "submitted", "polling", "processing"]);
const TERMINAL_BATCH_STATES = new Set([
  "JOB_STATE_SUCCEEDED",
  "JOB_STATE_FAILED",
  "JOB_STATE_CANCELLED",
  "JOB_STATE_EXPIRED",
  "BATCH_STATE_SUCCEEDED",
  "BATCH_STATE_FAILED",
  "BATCH_STATE_CANCELLED",
  "BATCH_STATE_EXPIRED",
]);

function usage() {
  return [
    "Generate an independent 134-clip Pro+Aoede production set through Gemini Batch API.",
    "",
    "Usage:",
    "  node scripts/generate-pro-aoede-production.mjs --batch-size 10",
    "  node scripts/generate-pro-aoede-production.mjs --dry-run",
    "  node scripts/generate-pro-aoede-production.mjs --poll-interval 15",
    "",
    "Credentials: GEMINI_API_KEY, or both GEMINI_KEY_PROJECT and GEMINI_KEY_NAME.",
    "Batch creation is non-idempotent. A submission journal is atomically recorded before POST.",
    "If submission outcome is uncertain, the script stops and never submits that plan again.",
    "Each invocation creates or resumes at most one batch of 1–10 clips.",
    "The raw Flash manifest is read-only; all writes stay inside work/pro-aoede-production.",
    "The script never reads, writes, renames, links, or deletes public/audio.",
  ].join("\n");
}

function parsePositiveInteger(value, name) {
  if (!/^\d+$/.test(value || "") || Number(value) < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return Number(value);
}

function parseArguments(argv) {
  const options = {
    batchSize: DEFAULT_BATCH_SIZE,
    dryRun: false,
    help: false,
    selfTest: false,
    pollIntervalMs: DEFAULT_POLL_SECONDS * 1_000,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--self-test") options.selfTest = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--batch-size" || argument === "--limit") {
      options.batchSize = parsePositiveInteger(argv[++index], argument);
    }
    else if (argument === "--poll-interval") {
      options.pollIntervalMs = parsePositiveInteger(argv[++index], "--poll-interval") * 1_000;
    } else throw new Error(`Unknown option: ${argument}\n\n${usage()}`);
  }
  if (options.batchSize > MAX_BATCH_SIZE) {
    throw new Error(`--batch-size must be between 1 and ${MAX_BATCH_SIZE}.`);
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
  if (typeof value !== "string") return "No error detail was returned.";
  let safe = value
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted Google API key]");
  for (const secret of sensitiveValues) safe = safe.split(secret).join("[redacted]");
  return safe.replace(/[\r\n]+/g, " ").slice(0, 500);
}

function wait(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function isWithin(candidate, parent) {
  const fromParent = relative(resolve(parent), resolve(candidate));
  return fromParent === "" ||
    (fromParent !== ".." && !fromParent.startsWith(`..${sep}`) && !isAbsolute(fromParent));
}

async function assertNoSymlinksTo(path) {
  const candidate = resolve(path);
  if (!isWithin(candidate, WORK_ROOT)) throw new Error("Target path escapes work/.");
  const parts = relative(WORK_ROOT, candidate).split(sep).filter(Boolean);
  let current = WORK_ROOT;
  for (const part of parts) {
    current = join(current, part);
    let info;
    try { info = await lstat(current); } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    if (info.isSymbolicLink()) throw new Error(`Symbolic link is forbidden in target path: ${current}`);
  }
}

async function assertSafeFixedPaths() {
  if (isWithin(STAGING_ROOT, RAW_ROOT) || isWithin(STAGING_ROOT, PUBLIC_ROOT)) {
    throw new Error("Pro staging root overlaps a protected input/public root.");
  }
  for (const [path, label] of [
    [PROJECT_ROOT, "project root"],
    [WORK_ROOT, "work root"],
    [RAW_ROOT, "raw Flash root"],
    [PUBLIC_ROOT, "public root"],
  ]) {
    const info = await lstat(path);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`${label} must be a real directory.`);
  }
  const [realWork, realRaw, realPublic] = await Promise.all([
    realpath(WORK_ROOT), realpath(RAW_ROOT), realpath(PUBLIC_ROOT),
  ]);
  const projectedTarget = resolve(realWork, relative(WORK_ROOT, STAGING_ROOT));
  if (isWithin(projectedTarget, realRaw) || isWithin(projectedTarget, realPublic)) {
    throw new Error("Pro staging root resolves into a protected input/public root.");
  }
  await assertNoSymlinksTo(STAGING_ROOT);
  if (await pathExists(STAGING_ROOT)) {
    const info = await lstat(STAGING_ROOT);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Pro staging root must be a real directory.");
    const realTarget = await realpath(STAGING_ROOT);
    if (!isWithin(realTarget, realWork) || isWithin(realTarget, realRaw) || isWithin(realTarget, realPublic)) {
      throw new Error("Existing Pro staging root resolves outside its approved isolated location.");
    }
  }
}

async function ensureTargetRoot() {
  await assertSafeFixedPaths();
  try {
    await mkdir(STAGING_ROOT, { mode: 0o700 });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
  }
  await assertSafeFixedPaths();
}

async function acquireLock(sourceManifestSha256) {
  await ensureTargetRoot();
  const nonce = randomUUID();
  const owner = {
    schemaVersion: 1,
    pid: process.pid,
    hostname: hostname(),
    startedAt: new Date().toISOString(),
    nonce,
    sourceManifestSha256,
    model: MODEL_NAME,
  };
  await claimExclusiveLock(LOCK_ROOT, owner);
  activeLock = { nonce };
  return activeLock;
}

async function claimExclusiveLock(lockRoot, owner) {
  try {
    await mkdir(lockRoot, { mode: 0o700 });
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(`Another generator or an unrecovered prior run owns ${lockRoot}; refusing concurrent work.`);
    }
    throw error;
  }
  try {
    await writeFile(join(lockRoot, "owner.json"), `${JSON.stringify(owner, null, 2)}\n`, {
      encoding: "utf8", flag: "wx", mode: 0o600,
    });
  } catch (error) {
    await rm(lockRoot, { recursive: true, force: true });
    throw error;
  }
}

async function releaseExclusiveLock(lockRoot, nonce) {
  let owner;
  try { owner = JSON.parse(await readFile(join(lockRoot, "owner.json"), "utf8")); } catch { return; }
  if (owner?.nonce !== nonce) {
    throw new Error("Lock ownership changed; refusing to remove another process's lock.");
  }
  await rm(lockRoot, { recursive: true });
}

async function releaseLock() {
  if (!activeLock) return;
  await releaseExclusiveLock(LOCK_ROOT, activeLock.nonce);
  activeLock = null;
}

async function atomicWriteJson(path, value) {
  const destination = resolve(path);
  if (!isWithin(destination, STAGING_ROOT)) throw new Error("JSON destination escapes Pro staging root.");
  await assertNoSymlinksTo(dirname(destination));
  if (await pathExists(destination)) {
    const info = await lstat(destination);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`JSON destination is not a regular file: ${destination}`);
  }
  await mkdir(dirname(path), { recursive: true });
  await assertNoSymlinksTo(dirname(destination));
  const temporaryPath = `${path}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

async function getApiKey() {
  const environmentKey = process.env.GEMINI_API_KEY?.trim();
  if (environmentKey) {
    if (/\s/.test(environmentKey) || environmentKey.length < 20) {
      throw new Error("GEMINI_API_KEY is not a valid single-line credential.");
    }
    sensitiveValues.add(environmentKey);
    return environmentKey;
  }
  const project = process.env.GEMINI_KEY_PROJECT?.trim();
  const keyName = process.env.GEMINI_KEY_NAME?.trim();
  if (!project || !keyName) {
    throw new Error("Set GEMINI_API_KEY, or both GEMINI_KEY_PROJECT and GEMINI_KEY_NAME.");
  }
  let stdout;
  try {
    ({ stdout } = await run(
      "gcloud",
      [
        "services", "api-keys", "get-key-string", keyName,
        "--project", project, "--format=value(keyString)", "--quiet",
      ],
      { encoding: "utf8", maxBuffer: 1024 * 1024, timeout: 30_000 },
    ));
  } catch {
    throw new Error("gcloud could not retrieve the configured API key; no credential detail was logged.");
  }
  const apiKey = stdout.trim();
  if (!apiKey || /\s/.test(apiKey) || apiKey.length < 20) {
    throw new Error("gcloud returned an invalid API key.");
  }
  sensitiveValues.add(apiKey);
  return apiKey;
}

async function requireAudioTools() {
  for (const command of ["ffmpeg", "ffprobe"]) {
    try {
      await run(command, ["-version"], {
        encoding: "utf8", timeout: 15_000, maxBuffer: 1024 * 1024,
      });
    } catch {
      throw new Error(`${command} is unavailable.`);
    }
  }
}

function sourceJobs() {
  return BOOKS.flatMap((book) => {
    const pages = book.pages.map((page, index) => ({
      id: `${book.slug}/${String(index + 1).padStart(2, "0")}`,
      bookSlug: book.slug,
      bookTitle: book.title,
      kind: "story",
      pageNumber: index + 1,
      taskType: null,
      displayText: page.transcript,
      outputPath: `audio/${book.slug}/${String(index + 1).padStart(2, "0")}.mp3`,
    }));
    const tasks = [
      ["listen", book.tasks.listen.audioText],
      ["speak", book.tasks.speak.modelLine],
      ["read", book.tasks.read.passage],
      ["write", book.tasks.write.modelSentence],
    ].map(([taskType, displayText]) => ({
      id: `${book.slug}/${taskType}`,
      bookSlug: book.slug,
      bookTitle: book.title,
      kind: "task",
      pageNumber: null,
      taskType,
      displayText,
      outputPath: `audio/${book.slug}/${taskType}.mp3`,
    }));
    return [...pages, ...tasks];
  }).map((job) => {
    const purpose = job.kind === "story" ? "story" : "practice";
    const spokenText = buildStoryNarrationSegments(job.displayText, purpose)
      .map((segment) => segment.text)
      .join(" ");
    const ttsText = prepareSpeechText(job.displayText);
    const enriched = {
      ...job,
      spokenText,
      ttsText,
      segmentCount: buildStoryNarrationSegments(job.displayText, purpose).length,
      displayTextSha256: sha256(job.displayText),
      spokenTextSha256: sha256(spokenText),
      ttsTextSha256: sha256(ttsText),
    };
    enriched.promptSha256 = sha256(promptFor(enriched));
    enriched.requestSha256 = sha256(stableJson(generateContentRequest(enriched)));
    return enriched;
  });
}

function promptFor(job) {
  const direction = job.kind === "story" ? STORY_DIRECTION : TASK_DIRECTIONS[job.taskType];
  return [
    BASE_PROMPT,
    direction,
    PROMPT_WRAPPER,
    "",
    "READING TEXT START",
    job.ttsText,
    "READING TEXT END",
  ].join("\n");
}

function generateContentRequest(job) {
  return {
    contents: [{ parts: [{ text: promptFor(job) }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } },
      },
    },
  };
}

function assertJobPlan(jobs) {
  const pages = jobs.filter((job) => job.kind === "story").length;
  const tasks = jobs.filter((job) => job.kind === "task").length;
  if (
    BOOKS.length !== EXPECTED_BOOKS || pages !== EXPECTED_STORY_PAGES ||
    tasks !== EXPECTED_TASKS || jobs.length !== EXPECTED_TOTAL
  ) throw new Error("Unexpected source plan size.");
  if (new Set(jobs.map((job) => job.id)).size !== jobs.length) {
    throw new Error("Source plan contains duplicate job IDs.");
  }
  if (new Set(jobs.map((job) => job.outputPath)).size !== jobs.length) {
    throw new Error("Source plan contains duplicate output paths.");
  }
  for (const job of jobs) {
    if (!/^[a-z0-9-]+\/(?:\d{2}|listen|speak|read|write)$/.test(job.id)) {
      throw new Error(`Unsafe job ID ${job.id}.`);
    }
    if (!/^audio\/[a-z0-9-]+\/(?:\d{2}|listen|speak|read|write)\.mp3$/.test(job.outputPath)) {
      throw new Error(`Unsafe output path ${job.outputPath}.`);
    }
    if (job.outputPath.slice("audio/".length, -".mp3".length) !== job.id) {
      throw new Error(`Output path does not match ${job.id}.`);
    }
    if (!job.displayText.trim() || !job.spokenText.trim() || !job.ttsText.trim() || job.segmentCount < 1) {
      throw new Error(`Job ${job.id} has empty prepared text.`);
    }
  }
}

async function loadSourceSnapshot() {
  const info = await lstat(RAW_MANIFEST_PATH);
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new Error("Raw Flash manifest must be a regular non-symlink file.");
  }
  if (await realpath(RAW_MANIFEST_PATH) !== RAW_MANIFEST_PATH) {
    throw new Error("Raw Flash manifest realpath does not match its fixed path.");
  }
  const bytes = await readFile(RAW_MANIFEST_PATH);
  let rawManifest;
  try { rawManifest = JSON.parse(bytes.toString("utf8")); } catch { throw new Error("Raw Flash manifest is invalid JSON."); }
  if (
    rawManifest.model !== SOURCE_MODEL_NAME || rawManifest.plan?.model !== SOURCE_MODEL_NAME ||
    rawManifest.voice !== VOICE_NAME || rawManifest.plan?.voice !== VOICE_NAME ||
    rawManifest.promptVersion !== PROMPT_VERSION || !rawManifest.plan?.planSha256 ||
    !Array.isArray(rawManifest.jobs) || rawManifest.jobs.length !== EXPECTED_TOTAL
  ) throw new Error("Raw Flash manifest identity or plan is incompatible.");

  const jobs = sourceJobs();
  assertJobPlan(jobs);
  for (const [index, job] of jobs.entries()) {
    const record = rawManifest.jobs[index];
    if (
      record?.id !== job.id || record?.outputPath !== job.outputPath ||
      record?.displayTextSha256 !== job.displayTextSha256 ||
      record?.spokenTextSha256 !== job.spokenTextSha256 ||
      record?.ttsTextSha256 !== job.ttsTextSha256 ||
      record?.promptSha256 !== job.promptSha256
    ) throw new Error(`Exact raw prompt/text verification failed for ${job.id}.`);
  }
  const sourceManifestSha256 = sha256(bytes);
  const fingerprint = {
    generatorVersion: GENERATOR_VERSION,
    sourceManifestSha256,
    sourcePlanSha256: rawManifest.plan.planSha256,
    model: MODEL_NAME,
    voice: VOICE_NAME,
    promptVersion: PROMPT_VERSION,
    promptTemplateHash: PROMPT_TEMPLATE_HASH,
    audio: { codec: "mp3", sampleRate: 24000, channels: 1, bitrate: "64k", loudnessLufs: -18 },
    jobs: jobs.map((job) => ({
      id: job.id,
      outputPath: job.outputPath,
      displayTextSha256: job.displayTextSha256,
      spokenTextSha256: job.spokenTextSha256,
      ttsTextSha256: job.ttsTextSha256,
      promptSha256: job.promptSha256,
      requestSha256: job.requestSha256,
    })),
  };
  const plan = {
    ...fingerprint,
    counts: { books: EXPECTED_BOOKS, storyPages: EXPECTED_STORY_PAGES, tasks: EXPECTED_TASKS, total: EXPECTED_TOTAL },
    planSha256: sha256(stableJson(fingerprint)),
  };
  return { rawManifest, sourceManifestSha256, jobs, plan };
}

function newManifest(snapshot) {
  const now = new Date().toISOString();
  return {
    version: 1,
    schemaVersion: 1,
    generatorVersion: GENERATOR_VERSION,
    createdAt: now,
    updatedAt: now,
    isolatedProduction: true,
    source: {
      manifestPath: "work/aoede-production/manifest.json",
      manifestSha256: snapshot.sourceManifestSha256,
      planSha256: snapshot.rawManifest.plan.planSha256,
      model: SOURCE_MODEL_NAME,
    },
    model: MODEL_NAME,
    voice: VOICE_NAME,
    promptVersion: PROMPT_VERSION,
    promptTemplateHash: PROMPT_TEMPLATE_HASH,
    plan: snapshot.plan,
    jobs: snapshot.jobs.map((job) => ({
      id: job.id,
      bookSlug: job.bookSlug,
      bookTitle: job.bookTitle,
      kind: job.kind,
      pageNumber: job.pageNumber,
      taskType: job.taskType,
      outputPath: job.outputPath,
      displayText: job.displayText,
      text: job.displayText,
      spokenText: job.spokenText,
      displayTextSha256: job.displayTextSha256,
      spokenTextSha256: job.spokenTextSha256,
      textSha256: job.spokenTextSha256,
      ttsTextSha256: job.ttsTextSha256,
      promptSha256: job.promptSha256,
      requestSha256: job.requestSha256,
      segmentCount: job.segmentCount,
      status: "pending",
      attempts: 0,
      completedAt: null,
      bytes: null,
      durationSeconds: null,
      audioSha256: null,
      fullDecodePassed: null,
      receiptPath: null,
      batchName: null,
      requestIndex: null,
      mapping: null,
      modelVersion: null,
      responseId: null,
      finishReason: null,
      lastError: null,
    })),
  };
}

function validateTargetManifest(manifest, snapshot) {
  if (
    manifest?.schemaVersion !== 1 || manifest?.generatorVersion !== GENERATOR_VERSION ||
    manifest?.model !== MODEL_NAME || manifest?.voice !== VOICE_NAME ||
    manifest?.plan?.planSha256 !== snapshot.plan.planSha256 ||
    manifest?.source?.manifestSha256 !== snapshot.sourceManifestSha256 ||
    !Array.isArray(manifest.jobs) || manifest.jobs.length !== EXPECTED_TOTAL
  ) throw new Error("Existing Pro manifest belongs to a different immutable plan.");
  for (const [index, job] of snapshot.jobs.entries()) {
    const record = manifest.jobs[index];
    if (
      record?.id !== job.id || record?.outputPath !== job.outputPath ||
      record?.promptSha256 !== job.promptSha256 || record?.requestSha256 !== job.requestSha256 ||
      record?.displayTextSha256 !== job.displayTextSha256 ||
      record?.spokenTextSha256 !== job.spokenTextSha256 || record?.ttsTextSha256 !== job.ttsTextSha256
    ) throw new Error(`Existing Pro manifest does not match ${job.id}.`);
  }
}

async function loadOrCreateTarget(snapshot) {
  if (!(await pathExists(SOURCE_PLAN_PATH))) {
    await atomicWriteJson(SOURCE_PLAN_PATH, {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      sourceManifestSha256: snapshot.sourceManifestSha256,
      sourcePlanSha256: snapshot.rawManifest.plan.planSha256,
      proPlanSha256: snapshot.plan.planSha256,
      model: MODEL_NAME,
      voice: VOICE_NAME,
      jobs: snapshot.plan.jobs,
    });
  } else {
    const info = await lstat(SOURCE_PLAN_PATH);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error("source-plan.json must be a regular file.");
    const frozen = JSON.parse(await readFile(SOURCE_PLAN_PATH, "utf8"));
    if (
      frozen.sourceManifestSha256 !== snapshot.sourceManifestSha256 ||
      frozen.sourcePlanSha256 !== snapshot.rawManifest.plan.planSha256 ||
      frozen.proPlanSha256 !== snapshot.plan.planSha256
    ) throw new Error("Frozen source-plan.json does not match the current raw snapshot.");
  }
  let manifest;
  if (!(await pathExists(MANIFEST_PATH))) {
    manifest = newManifest(snapshot);
    await saveManifest(manifest);
  } else {
    const info = await lstat(MANIFEST_PATH);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error("Pro manifest must be a regular file.");
    manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
    validateTargetManifest(manifest, snapshot);
  }
  const enriched = snapshot.jobs.map((job, recordIndex) => ({ ...job, recordIndex, record: manifest.jobs[recordIndex] }));
  return { manifest, enriched };
}

function syncManifestClips(manifest) {
  manifest.clips = manifest.jobs.map((record) => ({
    id: record.id,
    relativePath: record.outputPath,
    displayText: record.displayText,
    spokenText: record.spokenText,
    spokenTextHash: record.spokenTextSha256,
    ttsTextHash: record.ttsTextSha256,
    promptHash: record.promptSha256,
    requestHash: record.requestSha256,
    fileHash: record.audioSha256,
    status: record.status,
    bytes: record.bytes,
    durationSeconds: record.durationSeconds,
    attempts: record.attempts,
    receiptPath: record.receiptPath,
    fullDecodePassed: record.fullDecodePassed,
  }));
}

async function saveManifest(manifest) {
  manifest.updatedAt = new Date().toISOString();
  syncManifestClips(manifest);
  await atomicWriteJson(MANIFEST_PATH, manifest);
}

function makePlan(manifest, selected) {
  const fingerprintInput = {
    toolVersion: TOOL_VERSION,
    manifestPlanSha256: manifest.plan.planSha256,
    sourceManifestSha256: manifest.source.manifestSha256,
    sourcePlanSha256: manifest.source.planSha256,
    model: MODEL_NAME,
    voice: VOICE_NAME,
    jobs: selected.map((job, requestIndex) => ({
      id: job.record.id,
      requestIndex,
      outputPath: job.record.outputPath,
      promptSha256: job.promptSha256,
      requestSha256: job.requestSha256,
    })),
  };
  const requestPlanSha256 = sha256(stableJson(fingerprintInput));
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    toolVersion: TOOL_VERSION,
    createdAt: now,
    updatedAt: now,
    phase: "prepared",
    requestPlanSha256,
    manifestPlanSha256: manifest.plan.planSha256,
    sourceManifestSha256: manifest.source.manifestSha256,
    sourcePlanSha256: manifest.source.planSha256,
    model: MODEL_NAME,
    voice: VOICE_NAME,
    jobs: fingerprintInput.jobs,
    batchName: null,
    submission: {
      startedAt: null,
      responseAt: null,
      httpStatus: null,
      errorSummary: null,
      requestBodySha256: null,
      requestBody: null,
    },
    poll: {
      count: 0,
      lastPolledAt: null,
      state: null,
      done: false,
      stats: null,
      responseShape: null,
    },
    results: {},
    responseSummaries: [],
  };
}

function journalPath(plan) {
  return join(BATCH_RUNS_ROOT, `batch-${plan.requestPlanSha256.slice(0, 20)}.json`);
}

async function saveJournal(path, journal) {
  journal.updatedAt = new Date().toISOString();
  await atomicWriteJson(path, journal);
}

async function createJournal(path, journal) {
  const destination = resolve(path);
  if (!isWithin(destination, BATCH_RUNS_ROOT)) throw new Error("Journal path escapes batch-runs/.");
  await mkdir(dirname(destination), { recursive: true });
  await assertNoSymlinksTo(dirname(destination));
  journal.updatedAt = new Date().toISOString();
  await writeFile(destination, `${JSON.stringify(journal, null, 2)}\n`, {
    encoding: "utf8", flag: "wx", mode: 0o600,
  });
}

async function listJournals() {
  if (!(await pathExists(BATCH_RUNS_ROOT))) return [];
  const rootInfo = await lstat(BATCH_RUNS_ROOT);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) {
    throw new Error("batch-runs must be a real directory.");
  }
  const names = (await readdir(BATCH_RUNS_ROOT)).filter((name) => /^batch-[a-f0-9]+\.json$/.test(name));
  const journals = [];
  for (const name of names) {
    const path = join(BATCH_RUNS_ROOT, name);
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Batch journal is not a regular file: ${name}`);
    const journal = JSON.parse(await readFile(path, "utf8"));
    if (journal.model === MODEL_NAME && journal.manifestPlanSha256) journals.push({ path, journal });
  }
  return journals;
}

async function findBlockingOrActiveJournal(manifestPlanSha256) {
  const journals = (await listJournals()).filter(
    ({ journal }) => journal.manifestPlanSha256 === manifestPlanSha256,
  );
  const unsupported = journals.find(({ journal }) => journal.phase === "unsupported");
  if (unsupported) {
    throw new Error(`Batch API is recorded as unsupported for this exact model: ${unsupported.journal.submission.errorSummary}`);
  }
  const uncertain = journals.find(({ journal }) =>
    ["submitting", "submission_uncertain"].includes(journal.phase) && !journal.batchName,
  );
  if (uncertain) {
    throw new Error(
      `Batch submission outcome is uncertain in ${uncertain.path}. Refusing a duplicate non-idempotent submission.`,
    );
  }
  const reviewRequired = journals.find(({ journal }) =>
    ["creation_rejected", "batch_failed", "applied_with_errors"].includes(journal.phase),
  );
  if (reviewRequired) {
    throw new Error(
      `Prior journal ${reviewRequired.path} is ${reviewRequired.journal.phase}; explicit human review is required before any new Batch submission.`,
    );
  }
  const active = journals.filter(({ journal }) => ACTIVE_PHASES.has(journal.phase));
  if (active.length > 1) throw new Error("More than one active batch journal exists; refusing ambiguous recovery.");
  return active[0] || null;
}

function batchCreateBody(journal, selectedById) {
  return {
    batch: {
      displayName: `story-sprout-aoede-${journal.requestPlanSha256.slice(0, 12)}`,
      inputConfig: {
        requests: {
          requests: journal.jobs.map((planned) => {
            const job = selectedById.get(planned.id);
            return {
              request: generateContentRequest(job),
              metadata: {
                jobId: planned.id,
                key: planned.id,
                requestIndex: planned.requestIndex,
                promptSha256: planned.promptSha256,
                requestSha256: planned.requestSha256,
              },
            };
          }),
        },
      },
    },
  };
}

function isUnsupportedResponse(status, message) {
  return (
    [400, 404, 405, 501].includes(status) &&
    /(?:not supported|unsupported|not found|batchgeneratecontent|unimplemented)/i.test(message)
  );
}

function extractBatchName(payload) {
  const candidates = [
    payload?.name,
    payload?.metadata?.name,
    payload?.response?.name,
    payload?.response?.metadata?.name,
  ];
  return candidates.find((value) => typeof value === "string" && /^batches\/[A-Za-z0-9_-]+$/.test(value));
}

async function submitBatch({ apiKey, journal, path, selectedById }) {
  const computedBody = batchCreateBody(journal, selectedById);
  const computedHash = sha256(stableJson(computedBody));
  if (
    journal.submission.requestBodySha256 !== computedHash ||
    stableJson(journal.submission.requestBody) !== stableJson(computedBody)
  ) throw new Error("Pre-submission journal body/hash does not match the exact Batch request.");
  journal.phase = "submitting";
  journal.submission.startedAt = new Date().toISOString();
  await saveJournal(path, journal);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(CREATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(journal.submission.requestBody),
      signal: controller.signal,
    });
  } catch (error) {
    journal.phase = "submission_uncertain";
    journal.submission.errorSummary = safeMessage(
      error?.name === "AbortError" ? "Batch creation timed out after the request may have been sent." : error?.message,
    );
    await saveJournal(path, journal);
    throw new Error(
      `Batch creation outcome is uncertain; the journal prevents automatic resubmission: ${journal.submission.errorSummary}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  const responseText = await response.text();
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    if (response.ok) {
      journal.phase = "submission_uncertain";
      journal.submission.httpStatus = response.status;
      journal.submission.errorSummary = "Successful HTTP response did not contain valid JSON or a recoverable batch name.";
      await saveJournal(path, journal);
      throw new Error("Batch creation returned unusable JSON; refusing duplicate submission.");
    }
    payload = {};
  }

  journal.submission.responseAt = new Date().toISOString();
  journal.submission.httpStatus = response.status;
  if (!response.ok) {
    const message = safeMessage(payload?.error?.message || `HTTP ${response.status}`);
    journal.submission.errorSummary = `${safeMessage(payload?.error?.status || "HTTP error")}: ${message}`;
    journal.phase = isUnsupportedResponse(response.status, message) ? "unsupported" : "creation_rejected";
    await saveJournal(path, journal);
    if (journal.phase === "unsupported") {
      throw new Error(`Batch API is not supported for ${MODEL_NAME}: ${journal.submission.errorSummary}`);
    }
    throw new Error(`Batch creation was rejected without creating a job: ${journal.submission.errorSummary}`);
  }

  const batchName = extractBatchName(payload);
  if (!batchName) {
    journal.phase = "submission_uncertain";
    journal.submission.errorSummary = "Creation response contained no batches/* resource name.";
    await saveJournal(path, journal);
    throw new Error("Batch creation returned no recoverable batch name; refusing duplicate submission.");
  }
  journal.batchName = batchName;
  journal.phase = "submitted";
  journal.submission.errorSummary = null;
  await saveJournal(path, journal);
  process.stdout.write(`Created ${batchName} for ${journal.jobs.length} request(s).\n`);
}

function extractState(payload) {
  const candidates = [
    payload?.state,
    payload?.metadata?.state,
    payload?.response?.state,
    payload?.response?.metadata?.state,
  ];
  const state = candidates.find((value) => typeof value === "string");
  if (state) return state;
  if (payload?.done === true) return payload?.error ? "JOB_STATE_FAILED" : "JOB_STATE_SUCCEEDED";
  return "JOB_STATE_PENDING";
}

function extractStats(payload) {
  return payload?.batchStats || payload?.metadata?.batchStats || payload?.response?.batchStats ||
    payload?.response?.metadata?.batchStats || null;
}

function detectResponseShape(payload) {
  if (Array.isArray(payload?.dest?.inlinedResponses)) return "dest.inlinedResponses";
  if (Array.isArray(payload?.response?.dest?.inlinedResponses)) return "response.dest.inlinedResponses";
  if (Array.isArray(payload?.response?.inlinedResponses)) return "response.inlinedResponses";
  if (Array.isArray(payload?.response?.inlinedResponses?.inlinedResponses)) {
    return "response.inlinedResponses.inlinedResponses";
  }
  if (Array.isArray(payload?.output?.inlinedResponses?.inlinedResponses)) {
    return "output.inlinedResponses.inlinedResponses";
  }
  if (Array.isArray(payload?.response?.output?.inlinedResponses?.inlinedResponses)) {
    return "response.output.inlinedResponses.inlinedResponses";
  }
  if (Array.isArray(payload?.metadata?.output?.inlinedResponses?.inlinedResponses)) {
    return "metadata.output.inlinedResponses.inlinedResponses";
  }
  return null;
}

function extractInlineResponses(payload) {
  const shape = detectResponseShape(payload);
  if (!shape) return { shape: null, responses: null };
  const responses = shape.split(".").reduce((value, key) => value?.[key], payload);
  return { shape, responses };
}

function responseSummary(payload) {
  const { shape, responses } = extractInlineResponses(payload);
  return {
    observedAt: new Date().toISOString(),
    state: extractState(payload),
    done: payload?.done === true,
    stats: extractStats(payload),
    responseShape: shape,
    responseCount: Array.isArray(responses) ? responses.length : null,
    hasTopLevelError: Boolean(payload?.error),
    errorSummary: payload?.error ? safeMessage(payload.error.message || JSON.stringify(payload.error)) : null,
  };
}

async function getBatch(apiKey, batchName) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${API_ROOT}/${batchName}`, {
      headers: { "x-goog-api-key": apiKey },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Batch poll returned non-JSON (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(`Batch poll failed (HTTP ${response.status}): ${safeMessage(payload?.error?.message)}`);
  }
  return payload;
}

async function pollToTerminal({ apiKey, journal, path, pollIntervalMs }) {
  if (!journal.batchName) throw new Error("Cannot poll a journal without a batch name.");
  let transientFailures = 0;
  while (true) {
    let payload;
    try {
      payload = await getBatch(apiKey, journal.batchName);
      transientFailures = 0;
    } catch (error) {
      transientFailures += 1;
      if (transientFailures > 8) throw error;
      const delay = Math.min(2_000 * 2 ** (transientFailures - 1), 60_000);
      process.stdout.write(`Poll failed safely; retrying GET in ${Math.ceil(delay / 1000)}s.\n`);
      await wait(delay);
      continue;
    }

    const summary = responseSummary(payload);
    journal.phase = "polling";
    journal.poll.count += 1;
    journal.poll.lastPolledAt = summary.observedAt;
    journal.poll.state = summary.state;
    journal.poll.done = summary.done;
    journal.poll.stats = summary.stats;
    journal.poll.responseShape = summary.responseShape;
    journal.responseSummaries = [...journal.responseSummaries.slice(-19), summary];
    await saveJournal(path, journal);
    process.stdout.write(
      `${journal.batchName}: ${summary.state}${summary.stats ? ` ${JSON.stringify(summary.stats)}` : ""}\n`,
    );
    if (TERMINAL_BATCH_STATES.has(summary.state)) return payload;
    await wait(pollIntervalMs);
  }
}

function structValue(metadata, key) {
  if (!metadata || typeof metadata !== "object") return null;
  if (["string", "number"].includes(typeof metadata[key])) return metadata[key];
  const field = metadata.fields?.[key];
  if (!field || typeof field !== "object") return null;
  return field.stringValue ?? field.numberValue ?? null;
}

function inlineMetadata(entry) {
  return entry?.metadata || entry?.output?.metadata || entry?.response?.metadata || null;
}

function inlineJobId(entry) {
  const metadata = inlineMetadata(entry);
  return structValue(metadata, "jobId") || structValue(metadata, "key");
}

function inlineRequestIndex(entry) {
  const value = structValue(inlineMetadata(entry), "requestIndex");
  return value === null ? null : Number(value);
}

function inlinePromptSha256(entry) {
  return structValue(inlineMetadata(entry), "promptSha256");
}

function inlineRequestSha256(entry) {
  return structValue(inlineMetadata(entry), "requestSha256");
}

function inlineError(entry) {
  return entry?.error || entry?.output?.error || null;
}

function inlineGenerateResponse(entry) {
  return entry?.response || entry?.output?.response || null;
}

function decodePcmAudio(payload) {
  const candidate = payload?.candidates?.[0];
  const audioPart = candidate?.content?.parts?.find(
    (part) => typeof part?.inlineData?.data === "string",
  );
  const encoded = audioPart?.inlineData?.data;
  if (!encoded) {
    const reason = payload?.promptFeedback?.blockReason || candidate?.finishReason || "no audio part";
    throw new Error(`Batch item returned no PCM audio (${safeMessage(reason)}).`);
  }
  const mimeType = audioPart.inlineData.mimeType;
  if (typeof mimeType === "string" && (!/^audio\//i.test(mimeType) || !/(?:pcm|l16)/i.test(mimeType))) {
    throw new Error(`Batch item returned unexpected audio type: ${safeMessage(mimeType)}.`);
  }
  const declaredRate = typeof mimeType === "string" ? mimeType.match(/rate=(\d+)/i)?.[1] : null;
  if (declaredRate && declaredRate !== "24000") {
    throw new Error(`Batch item returned PCM at ${declaredRate} Hz instead of 24000 Hz.`);
  }
  const compact = encoded.replace(/\s/g, "");
  if (compact.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) {
    throw new Error("Batch item returned malformed base64 PCM audio.");
  }
  const audio = Buffer.from(compact, "base64");
  if (audio.length < MINIMUM_AUDIO_BYTES || audio.length % 2 !== 0) {
    throw new Error(`Batch item returned invalid 16-bit PCM (${audio.length} bytes).`);
  }
  if (candidate?.finishReason !== "STOP") {
    throw new Error(`Batch item finishReason was ${safeMessage(candidate?.finishReason || "missing")} instead of STOP.`);
  }
  if (payload?.modelVersion !== MODEL_NAME) {
    throw new Error(`Batch item modelVersion was ${safeMessage(payload.modelVersion)} instead of ${MODEL_NAME}.`);
  }
  if (typeof payload?.responseId !== "string" || !payload.responseId) {
    throw new Error("Batch item responseId was missing.");
  }
  return {
    pcm: audio,
    mimeType,
    candidate,
    usageMetadata: payload?.usageMetadata || null,
    modelVersion: payload?.modelVersion || null,
    responseId: payload?.responseId || null,
    finishReason: candidate.finishReason,
  };
}

async function normalizePcmAudio(source, destination) {
  await run(
    "ffmpeg",
    [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-n",
      "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", source,
      "-vn", "-af", "loudnorm=I=-18:TP=-1.5:LRA=7", "-map_metadata", "-1",
      "-c:a", "libmp3lame", "-b:a", "64k", "-ar", "24000", "-ac", "1",
      "-f", "mp3", destination,
    ],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024, timeout: 120_000 },
  );
}

async function fileSha256(path) {
  return sha256(await readFile(path));
}

async function inspectMp3(path) {
  const info = await lstat(path);
  if (info.isSymbolicLink() || !info.isFile() || info.size < MINIMUM_AUDIO_BYTES || info.size > MAXIMUM_AUDIO_BYTES) {
    throw new Error(`MP3 size ${info.size} bytes is outside the production range.`);
  }
  const { stdout } = await run(
    "ffprobe",
    [
      "-v", "error",
      "-show_entries", "stream=codec_type,codec_name,sample_rate,channels,bit_rate:format=duration",
      "-of", "json", path,
    ],
    { encoding: "utf8", maxBuffer: 1024 * 1024, timeout: 30_000 },
  );
  const probe = JSON.parse(stdout);
  const stream = probe?.streams?.[0];
  const durationSeconds = Number(probe?.format?.duration);
  const bitrate = Number(stream?.bit_rate);
  if (
    probe?.streams?.length !== 1 || stream?.codec_type !== "audio" ||
    stream?.codec_name !== "mp3" || Number(stream?.sample_rate) !== 24_000 ||
    Number(stream?.channels) !== 1 || !Number.isFinite(bitrate) || bitrate < 60_000 || bitrate > 70_000 ||
    !Number.isFinite(durationSeconds) || durationSeconds <= 0
  ) throw new Error("Output is not a readable 24 kHz mono MP3.");
  await run(
    "ffmpeg",
    ["-nostdin", "-v", "error", "-i", path, "-map", "0:a:0", "-f", "null", "-"],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024, timeout: 60_000 },
  );
  const audioSha256 = await fileSha256(path);
  return {
    bytes: info.size,
    sha256: audioSha256,
    audioSha256,
    codec: stream.codec_name,
    sampleRate: Number(stream.sample_rate),
    channels: Number(stream.channels),
    bitrate,
    durationSeconds,
    fullDecodePassed: true,
  };
}

function receiptRelativePath(record) {
  return `.receipts/${record.id}.json`;
}

function receiptPath(record) {
  return join(STAGING_ROOT, receiptRelativePath(record));
}

async function writeReceipt({ record, audioInfo, manifest, journal, planned, mapping, decoded }) {
  const completedAt = new Date().toISOString();
  const promptTokens = Number(decoded.usageMetadata?.promptTokenCount || 0);
  let outputTokens = Number(decoded.usageMetadata?.candidatesTokenCount || 0);
  if (!outputTokens) outputTokens = Math.max(Number(decoded.usageMetadata?.totalTokenCount || 0) - promptTokens, 0);
  const receipt = {
    schemaVersion: 1,
    completedAt,
    source: "gemini-batch-api",
    model: MODEL_NAME,
    voice: VOICE_NAME,
    proPlanSha256: manifest.plan.planSha256,
    sourceManifestSha256: manifest.source.manifestSha256,
    sourcePlanSha256: manifest.source.planSha256,
    job: {
      id: record.id,
      outputPath: record.outputPath,
      displayTextSha256: record.displayTextSha256,
      spokenTextSha256: record.spokenTextSha256,
      ttsTextSha256: record.ttsTextSha256,
      promptSha256: record.promptSha256,
      requestSha256: record.requestSha256,
    },
    batch: {
      name: journal.batchName,
      requestPlanSha256: journal.requestPlanSha256,
      requestIndex: planned.requestIndex,
      mapping,
    },
    modelResponse: {
      modelVersion: decoded.modelVersion,
      responseId: decoded.responseId,
      finishReason: decoded.finishReason,
      responseMimeType: decoded.mimeType,
      rawPcmBytes: decoded.pcm.length,
    },
    usageMetadata: decoded.usageMetadata,
    costEstimate: {
      method: "batch",
      currency: "USD",
      promptTokens,
      outputTokens,
      inputPerMillionUsd: 0.5,
      outputPerMillionUsd: 10,
      estimatedUsd: promptTokens * 0.5 / 1_000_000 + outputTokens * 10 / 1_000_000,
      basis: "Gemini 2.5 Pro Preview TTS Batch pricing published by Google on 2026-07-14; excludes taxes and rounding.",
    },
    media: audioInfo,
    audio: audioInfo,
  };
  const path = receiptPath(record);
  await atomicWriteJson(path, receipt);
  return {
    receipt,
    completedAt,
    relativePath: receiptRelativePath(record),
    sha256: await fileSha256(path),
  };
}

async function readMatchingReceipt(record, audioInfo, manifest) {
  const path = receiptPath(record);
  if (!(await pathExists(path))) return null;
  const receiptInfo = await lstat(path);
  if (!receiptInfo.isFile() || receiptInfo.isSymbolicLink()) return null;
  try {
    const receipt = JSON.parse(await readFile(path, "utf8"));
    const identityMatches = (
      receipt?.model === MODEL_NAME && receipt?.voice === VOICE_NAME &&
      receipt?.proPlanSha256 === manifest.plan.planSha256 &&
      receipt?.sourceManifestSha256 === manifest.source.manifestSha256 &&
      receipt?.sourcePlanSha256 === manifest.source.planSha256 &&
      receipt?.job?.id === record.id && receipt?.job?.outputPath === record.outputPath &&
      receipt?.job?.displayTextSha256 === record.displayTextSha256 &&
      receipt?.job?.spokenTextSha256 === record.spokenTextSha256 &&
      receipt?.job?.ttsTextSha256 === record.ttsTextSha256 &&
      receipt?.job?.promptSha256 === record.promptSha256 &&
      receipt?.job?.requestSha256 === record.requestSha256 &&
      receipt?.media?.sha256 === audioInfo.sha256 && receipt?.media?.bytes === audioInfo.bytes &&
      receipt?.media?.fullDecodePassed === true && receipt?.media?.codec === "mp3" &&
      receipt?.media?.sampleRate === 24000 && receipt?.media?.channels === 1 &&
      receipt?.modelResponse?.modelVersion === MODEL_NAME && receipt?.modelResponse?.finishReason === "STOP" &&
      /^batches\/[A-Za-z0-9_-]+$/.test(receipt?.batch?.name || "") &&
      Number.isInteger(receipt?.batch?.requestIndex) &&
      ["metadata", "official-request-order-fallback"].includes(receipt?.batch?.mapping)
    );
    if (identityMatches && /^[a-f0-9]{64}$/.test(receipt?.batch?.requestPlanSha256 || "")) {
      const supportingJournalPath = journalPath({ requestPlanSha256: receipt.batch.requestPlanSha256 });
      const supportingInfo = await lstat(supportingJournalPath);
      if (!supportingInfo.isFile() || supportingInfo.isSymbolicLink()) return null;
      const supportingJournal = JSON.parse(await readFile(supportingJournalPath, "utf8"));
      const planned = supportingJournal?.jobs?.[receipt.batch.requestIndex];
      if (
        supportingJournal?.requestPlanSha256 !== receipt.batch.requestPlanSha256 ||
        supportingJournal?.manifestPlanSha256 !== manifest.plan.planSha256 ||
        supportingJournal?.batchName !== receipt.batch.name ||
        planned?.id !== record.id || planned?.requestIndex !== receipt.batch.requestIndex ||
        planned?.promptSha256 !== record.promptSha256 || planned?.requestSha256 !== record.requestSha256
      ) return null;
      return { receipt, relativePath: receiptRelativePath(record), sha256: await fileSha256(path) };
    }
  } catch {
    return null;
  }
  return null;
}

function markComplete(record, audioInfo, receiptInfo) {
  const receipt = receiptInfo.receipt;
  record.status = "complete";
  record.completedAt = receipt.completedAt;
  record.bytes = audioInfo.bytes;
  record.durationSeconds = Number(audioInfo.durationSeconds.toFixed(3));
  record.audioSha256 = audioInfo.audioSha256;
  record.fullDecodePassed = audioInfo.fullDecodePassed;
  record.receiptPath = receiptInfo.relativePath;
  record.receiptSha256 = receiptInfo.sha256;
  record.batchName = receipt.batch.name;
  record.requestIndex = receipt.batch.requestIndex;
  record.mapping = receipt.batch.mapping;
  record.modelVersion = receipt.modelResponse.modelVersion;
  record.responseId = receipt.modelResponse.responseId;
  record.finishReason = receipt.modelResponse.finishReason;
  record.lastError = null;
  record.batchCompleted = true;
}

function safeOutputPath(relativePath) {
  if (!/^audio\/[a-z0-9-]+\/(?:\d{2}|listen|speak|read|write)\.mp3$/.test(relativePath)) {
    throw new Error(`Unsafe output path ${relativePath}.`);
  }
  const output = resolve(STAGING_ROOT, relativePath);
  if (!isWithin(output, join(STAGING_ROOT, "audio"))) throw new Error("Output escapes isolated audio root.");
  return output;
}

async function adoptExistingOutput(record, manifest, save = true) {
  const output = safeOutputPath(record.outputPath);
  if (!(await pathExists(output))) return false;
  await assertNoSymlinksTo(output);
  const info = await inspectMp3(output);
  const matchingReceipt = await readMatchingReceipt(record, info, manifest);
  if (!matchingReceipt) throw new Error(`Untracked or changed output exists for ${record.id}; refusing overwrite.`);
  markComplete(record, info, matchingReceipt);
  if (save) await saveManifest(manifest);
  return true;
}

async function reconcileAllOutputs(enriched, manifest) {
  let existing = 0;
  for (const job of enriched) {
    const output = safeOutputPath(job.record.outputPath);
    if (await pathExists(output)) {
      await adoptExistingOutput(job.record, manifest, false);
      existing += 1;
    } else if (job.record.status === "complete") {
      throw new Error(`Manifest marks ${job.record.id} complete but its audio is missing.`);
    }
  }
  if (existing) await saveManifest(manifest);
  return existing;
}

async function publishPcm({ decoded, record, manifest, journal, planned, mapping, runRoot }) {
  if (await adoptExistingOutput(record, manifest)) {
    return {
      adopted: true,
      bytes: record.bytes,
      durationSeconds: record.durationSeconds,
      audioSha256: record.audioSha256,
      fullDecodePassed: record.fullDecodePassed,
    };
  }
  const output = safeOutputPath(record.outputPath);
  await assertNoSymlinksTo(dirname(output));
  await mkdir(dirname(output), { recursive: true });
  await assertNoSymlinksTo(dirname(output));
  const rawPath = join(runRoot, `${record.id.replace("/", "-")}-${randomUUID()}.pcm`);
  const partialPath = join(dirname(output), `.${record.id.split("/").at(-1)}.${randomUUID()}.partial.mp3`);
  try {
    await writeFile(rawPath, decoded.pcm, { flag: "wx", mode: 0o600 });
    await normalizePcmAudio(rawPath, partialPath);
    const audioInfo = await inspectMp3(partialPath);
    const receiptInfo = await writeReceipt({
      record, audioInfo, manifest, journal, planned, mapping, decoded,
    });
    await assertNoSymlinksTo(dirname(output));
    try {
      await link(partialPath, output);
    } catch (error) {
      if (error?.code === "EEXIST") throw new Error(`Output appeared while processing ${record.id}; refusing overwrite.`);
      throw error;
    }
    markComplete(record, audioInfo, receiptInfo);
    await saveManifest(manifest);
    return audioInfo;
  } finally {
    await rm(rawPath, { force: true });
    await rm(partialPath, { force: true });
  }
}

async function processSuccessfulBatch({ payload, journal, path, manifest, enriched }) {
  const { shape, responses } = extractInlineResponses(payload);
  if (!responses) throw new Error("Succeeded batch had no supported inline response shape.");
  if (responses.length !== journal.jobs.length) {
    throw new Error(`Batch returned ${responses.length} responses for ${journal.jobs.length} requests.`);
  }

  const plannedIds = new Set(journal.jobs.map((job) => job.id));
  const plannedById = new Map(journal.jobs.map((job) => [job.id, job]));
  const enrichedById = new Map(enriched.map((job) => [job.record.id, job]));
  const metadataPresence = responses.map((entry) => Boolean(inlineMetadata(entry)));
  const allMetadata = metadataPresence.every(Boolean);
  const noMetadata = metadataPresence.every((value) => !value);
  if (!allMetadata && !noMetadata) throw new Error("Batch responses contained partially missing metadata; refusing mixed mapping.");
  let mapped;
  if (allMetadata) {
    mapped = responses.map((entry) => {
      const jobId = String(inlineJobId(entry) || "");
      const requestIndex = inlineRequestIndex(entry);
      const planned = plannedById.get(jobId);
      if (!planned || !plannedIds.has(jobId)) throw new Error(`Response metadata referenced unknown job ${jobId || "(empty)"}.`);
      if (!Number.isInteger(requestIndex) || requestIndex !== planned.requestIndex) {
        throw new Error(`Response metadata requestIndex mismatch for ${jobId}.`);
      }
      if (
        inlinePromptSha256(entry) !== planned.promptSha256 ||
        inlineRequestSha256(entry) !== planned.requestSha256
      ) throw new Error(`Response metadata hash mismatch for ${jobId}.`);
      return { entry, jobId, requestIndex, mapping: "metadata" };
    });
  } else {
    const stats = extractStats(payload);
    const requestCount = Number(stats?.requestCount);
    const successCount = Number(stats?.successfulRequestCount);
    if (!Number.isInteger(requestCount) || requestCount !== journal.jobs.length) {
      throw new Error("Metadata-free response could not be validated against Batch requestCount.");
    }
    if (!Number.isInteger(successCount) || successCount !== responses.length) {
      throw new Error("Metadata-free response successfulRequestCount did not match response count.");
    }
    mapped = responses.map((entry, requestIndex) => {
      const planned = journal.jobs[requestIndex];
      if (!planned || planned.requestIndex !== requestIndex) {
        throw new Error("Journal request indexes are not continuous for order fallback.");
      }
      return {
        entry,
        jobId: planned.id,
        requestIndex,
        mapping: "official-request-order-fallback",
      };
    });
  }
  if (new Set(mapped.map((item) => item.jobId)).size !== mapped.length) {
    throw new Error("Batch response metadata contained duplicate job IDs.");
  }

  journal.phase = "processing";
  journal.poll.responseShape = shape;
  await saveJournal(path, journal);
  const temporaryParent = join(STAGING_ROOT, ".tmp");
  await assertNoSymlinksTo(temporaryParent);
  await mkdir(temporaryParent, { recursive: true });
  await assertNoSymlinksTo(temporaryParent);
  const runRoot = await mkdtemp(join(temporaryParent, "batch-run-"));
  let failures = 0;
  try {
    for (const item of mapped) {
      const job = enrichedById.get(item.jobId);
      const record = manifest.jobs[job.recordIndex];
      const error = inlineError(item.entry);
      if (error) {
        failures += 1;
        const summary = safeMessage(error.message || JSON.stringify(error));
        record.status = "failed";
        record.lastError = `Batch item error: ${summary}`;
        record.batchAttempts = (record.batchAttempts || 0) + 1;
        journal.results[item.jobId] = { status: "failed", mapping: item.mapping, errorSummary: summary };
        await saveManifest(manifest);
        await saveJournal(path, journal);
        continue;
      }
      try {
        const response = inlineGenerateResponse(item.entry);
        if (!response) throw new Error("Inline item contained neither response nor error.");
        const decoded = decodePcmAudio(response);
        const planned = plannedById.get(item.jobId);
        const info = await publishPcm({
          decoded,
          record,
          manifest,
          journal,
          planned,
          mapping: item.mapping,
          runRoot,
        });
        record.batchAttempts = (record.batchAttempts || 0) + 1;
        record.attempts = (record.attempts || 0) + 1;
        await saveManifest(manifest);
        journal.results[item.jobId] = {
          status: "complete",
          mapping: item.mapping,
          bytes: info.bytes,
          durationSeconds: info.durationSeconds,
          audioSha256: record.audioSha256,
        };
      } catch (processingError) {
        failures += 1;
        const summary = safeMessage(processingError.message);
        record.status = "failed";
        record.lastError = `Batch processing error: ${summary}`;
        record.batchAttempts = (record.batchAttempts || 0) + 1;
        journal.results[item.jobId] = { status: "failed", mapping: item.mapping, errorSummary: summary };
        await saveManifest(manifest);
      }
      await saveJournal(path, journal);
      process.stdout.write(`${item.jobId}: ${journal.results[item.jobId].status}\n`);
    }
  } finally {
    await rm(runRoot, { recursive: true, force: true });
  }
  journal.phase = failures ? "applied_with_errors" : "applied";
  journal.completedAt = new Date().toISOString();
  journal.failureCount = failures;
  await saveJournal(path, journal);
  return { failures, completed: mapped.length - failures };
}

async function resumeOrCreate(options, snapshot) {
  const { manifest, enriched } = await loadOrCreateTarget(snapshot);
  await reconcileAllOutputs(enriched, manifest);
  let active = await findBlockingOrActiveJournal(manifest.plan.planSha256);
  let journal;
  let path;
  if (active) {
    ({ journal, path } = active);
    process.stdout.write(`Resuming journal ${path}; phase=${journal.phase}.\n`);
  } else {
    const remaining = enriched.filter((job) => job.record.status !== "complete");
    if (!remaining.length) {
      process.stdout.write("All 134 production clips are already complete.\n");
      return;
    }
    const selected = remaining.slice(0, options.batchSize);
    journal = makePlan(manifest, selected);
    path = journalPath(journal);
    const selectedById = new Map(enriched.map((job) => [job.record.id, job]));
    const exactBody = batchCreateBody(journal, selectedById);
    journal.submission.requestBody = exactBody;
    journal.submission.requestBodySha256 = sha256(stableJson(exactBody));
    if (await pathExists(path)) {
      journal = JSON.parse(await readFile(path, "utf8"));
      if (["creation_rejected", "submission_uncertain", "submitting", "applied", "applied_with_errors"].includes(journal.phase)) {
        throw new Error(`Existing journal ${path} is ${journal.phase}; refusing automatic resubmission.`);
      }
      if (journal.phase === "unsupported") {
        throw new Error(`Batch API is recorded as unsupported: ${journal.submission.errorSummary}`);
      }
    } else {
      await createJournal(path, journal);
    }
  }

  if (!Array.isArray(journal.jobs) || journal.jobs.length < 1 || journal.jobs.length > MAX_BATCH_SIZE) {
    throw new Error(`Journal must contain between 1 and ${MAX_BATCH_SIZE} jobs.`);
  }
  if (
    new Set(journal.jobs.map((job) => job.id)).size !== journal.jobs.length ||
    new Set(journal.jobs.map((job) => job.outputPath)).size !== journal.jobs.length ||
    journal.jobs.some((job, index) => job.requestIndex !== index)
  ) throw new Error("Journal job IDs, output paths, or request indexes are invalid.");
  const selectedById = new Map(enriched.map((job) => [job.record.id, job]));
  if (
    journal.model !== MODEL_NAME || journal.voice !== VOICE_NAME ||
    journal.manifestPlanSha256 !== manifest.plan.planSha256 ||
    journal.sourceManifestSha256 !== manifest.source.manifestSha256 ||
    journal.sourcePlanSha256 !== manifest.source.planSha256
  ) throw new Error("Journal identity does not match the immutable Pro production plan.");
  for (const planned of journal.jobs) {
    const job = selectedById.get(planned.id);
    if (!job || job.promptSha256 !== planned.promptSha256 || job.requestSha256 !== planned.requestSha256) {
      throw new Error(`Journal no longer matches exact production request for ${planned.id}.`);
    }
  }
  const recomputedBody = batchCreateBody(journal, selectedById);
  if (
    journal.submission?.requestBodySha256 !== sha256(stableJson(recomputedBody)) ||
    stableJson(journal.submission?.requestBody) !== stableJson(recomputedBody)
  ) throw new Error("Journal's persisted Batch request body/hash is invalid.");
  const apiKey = await getApiKey();
  if (journal.phase === "prepared") {
    await submitBatch({ apiKey, journal, path, selectedById });
  }
  if (!journal.batchName) throw new Error("Journal has no batch name and cannot be safely resumed.");

  const payload = await pollToTerminal({
    apiKey,
    journal,
    path,
    pollIntervalMs: options.pollIntervalMs,
  });
  const state = extractState(payload);
  if (!/[A-Z_]*SUCCEEDED$/.test(state)) {
    journal.phase = "batch_failed";
    journal.completedAt = new Date().toISOString();
    journal.batchErrorSummary = safeMessage(
      payload?.error?.message || payload?.metadata?.error?.message || `Terminal state ${state}`,
    );
    await saveJournal(path, journal);
    throw new Error(`Batch ended in ${state}: ${journal.batchErrorSummary}`);
  }
  const result = await processSuccessfulBatch({ payload, journal, path, manifest, enriched });
  const complete = manifest.jobs.filter((record) => record.status === "complete").length;
  process.stdout.write(
    `Batch applied: ${result.completed} complete, ${result.failures} failed; production checkpoint ${complete}/134.\n`,
  );
}

function printDryRun(options, snapshot) {
  process.stdout.write([
    "Pro+Aoede production plan is valid; zero files were written and no credential/network call was made.",
    `Books: ${snapshot.plan.counts.books}`,
    `Story pages: ${snapshot.plan.counts.storyPages}`,
    `Tasks: ${snapshot.plan.counts.tasks}`,
    `Total clips: ${snapshot.plan.counts.total}`,
    `Next batch maximum: ${options.batchSize}`,
    `Model: ${MODEL_NAME}`,
    `Voice: ${VOICE_NAME}`,
    `Source manifest SHA-256: ${snapshot.sourceManifestSha256}`,
    `Pro plan SHA-256: ${snapshot.plan.planSha256}`,
    `Target: ${STAGING_ROOT}`,
    "Protected roots action: raw Flash read-only; public untouched",
    "",
  ].join("\n"));
}

async function runSelfTest() {
  const fixtureRoot = await mkdtemp(join(WORK_ROOT, ".pro-aoede-lock-fixture-"));
  const fixtureLock = join(fixtureRoot, "exclusive.lock");
  const nonce = randomUUID();
  try {
    await claimExclusiveLock(fixtureLock, { nonce, pid: process.pid, fixture: true });
    let secondWasRejected = false;
    try {
      await claimExclusiveLock(fixtureLock, { nonce: randomUUID(), pid: process.pid, fixture: true });
    } catch (error) {
      secondWasRejected = /owns/.test(error?.message || "");
    }
    if (!secondWasRejected) throw new Error("Exclusive mkdir lock fixture did not reject a second owner.");
    await releaseExclusiveLock(fixtureLock, nonce);

    const canaryPayload = {
      response: {
        inlinedResponses: {
          inlinedResponses: [{ response: { modelVersion: MODEL_NAME } }],
        },
      },
    };
    const extracted = extractInlineResponses(canaryPayload);
    if (
      extracted.shape !== "response.inlinedResponses.inlinedResponses" ||
      !Array.isArray(extracted.responses) || extracted.responses.length !== 1
    ) throw new Error("Canary Batch response-shape fixture was not recognized.");

    safeOutputPath("audio/dan-the-flying-man/01.mp3");
    let traversalRejected = false;
    try { safeOutputPath("audio/../public/evil.mp3"); } catch { traversalRejected = true; }
    if (!traversalRejected) throw new Error("Unsafe output path fixture was not rejected.");
    process.stdout.write("Self-test PASS: exclusive mkdir lock, canary nested Batch response shape, and output-path guard.\n");
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
}

function installSignalHandlers() {
  let stopping = false;
  const handlers = new Map();
  for (const [signal, code] of [["SIGINT", 130], ["SIGTERM", 143]]) {
    const handler = () => {
      if (stopping) return;
      stopping = true;
      process.stderr.write(`${signal} received; releasing only the owned generator lock.\n`);
      releaseLock()
        .then(() => process.exit(code))
        .catch((error) => {
          process.stderr.write(`Lock cleanup failed safely: ${safeMessage(error?.message)}\n`);
          process.exit(code);
        });
    };
    handlers.set(signal, handler);
    process.once(signal, handler);
  }
  return () => {
    for (const [signal, handler] of handlers) process.removeListener(signal, handler);
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (options.selfTest) {
    await runSelfTest();
    return;
  }
  await assertSafeFixedPaths();
  const snapshot = await loadSourceSnapshot();
  if (options.dryRun) {
    printDryRun(options, snapshot);
    return;
  }
  await acquireLock(snapshot.sourceManifestSha256);
  const removeSignalHandlers = installSignalHandlers();
  try {
    await requireAudioTools();
    await resumeOrCreate(options, snapshot);
  } finally {
    removeSignalHandlers();
    await releaseLock();
  }
}

main().catch((error) => {
  process.stderr.write(`Pro Aoede Batch generation failed: ${safeMessage(error?.message)}\n`);
  process.exitCode = 1;
});
