#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  link,
  lstat,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { BOOKS } from "../app/book-data.ts";
import { buildStoryNarrationSegments } from "../app/narration.ts";
import {
  PRO_EXPECTED_TOTAL as EXPECTED_TOTAL,
  PRO_PACING_POLICY as PACING_POLICY,
  PRO_PACING_POLICY_VERSION as PACING_POLICY_VERSION,
  PRO_PACING_SCHEMA_VERSION as SCHEMA_VERSION,
  PRO_PACING_TRANSFORM_VERSION as TRANSFORM_VERSION,
  PRO_SOURCE_GENERATOR_VERSION as SOURCE_GENERATOR_VERSION,
  PRO_SOURCE_MODEL as SOURCE_MODEL,
  PRO_SOURCE_VOICE as SOURCE_VOICE,
  assertProBatchJournal,
  assertCompleteProSourceManifest,
  assertProGeneratorReceipt,
  pacedClipSourceMatches,
  pacedManifestMatchesProSource,
  proPausePaddingRecordMatches,
  proPacingSettingsForJob,
  proPacingSettingsMatch,
} from "./aoede-pro-contract.mjs";
import {
  buildPausePaddingPlan,
  buildTimelineEditFilter,
} from "./aoede-pacing-timeline.mjs";

const run = promisify(execFile);
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORK_ROOT = join(PROJECT_ROOT, "work");
const SOURCE_ROOT = join(WORK_ROOT, "pro-aoede-production");
const SOURCE_AUDIO_ROOT = join(SOURCE_ROOT, "audio");
const SOURCE_MANIFEST_PATH = join(SOURCE_ROOT, "manifest.json");
const SOURCE_RECEIPT_ROOT = join(SOURCE_ROOT, ".receipts");
const SOURCE_BATCH_RUNS_ROOT = join(SOURCE_ROOT, "batch-runs");
const OUTPUT_ROOT = join(PROJECT_ROOT, "work", "aoede-paced-production");
const OUTPUT_AUDIO_ROOT = join(OUTPUT_ROOT, "audio");
const OUTPUT_MANIFEST_PATH = join(OUTPUT_ROOT, "manifest.json");
const RECEIPT_ROOT = join(OUTPUT_ROOT, ".receipts");
const TEMP_ROOT = join(OUTPUT_ROOT, ".tmp");
const BACKUP_ROOT = join(WORK_ROOT, "aoede-paced-backups");
const PROMOTION_LOCK_PATH = join(OUTPUT_ROOT, ".promote.lock");

const SILENCE_NOISE = "-40dB";
const SILENCE_MIN_SECONDS = 0.18;
const LEADING_HARD_SECONDS = 0.5;
const TRAILING_HARD_SECONDS = 0.8;
const INTERNAL_HARD_SECONDS = 1.5;
const LEADING_KEEP_SECONDS = 0.2;
const TRAILING_KEEP_SECONDS = 0.3;
const STORY_INTERNAL_KEEP_SECONDS = 1.05;
const TASK_INTERNAL_KEEP_SECONDS = 0.9;
const TARGET_LUFS = -18;
const ENCODE_TRUE_PEAK_DBTP = -2.2;
const LIMITER_LINEAR_LIMIT = Number((10 ** (ENCODE_TRUE_PEAK_DBTP / 20)).toFixed(6));
const MAX_FINAL_TRUE_PEAK_DBTP = -1.5;
const MIN_FINAL_LUFS = -19;
const MAX_FINAL_LUFS = -17;
const MAX_DURATION_SECONDS = 40;
const MIN_BYTES = 4 * 1024;
const MAX_BYTES = 500 * 1024;
let staleBackupRunRoot = null;

function usage() {
  return [
    "Create a resumable, non-destructive paced copy of the complete Pro + Aoede production set.",
    "",
    "Usage:",
    "  node scripts/normalize-aoede-pacing.mjs",
    "  node scripts/normalize-aoede-pacing.mjs --limit N",
    "  node scripts/normalize-aoede-pacing.mjs --verify",
    "  node scripts/normalize-aoede-pacing.mjs --dry-run",
    "",
    `Fixed source: ${SOURCE_ROOT}`,
    `Fixed output: ${OUTPUT_ROOT}`,
    "Only a complete, receipt-backed gemini-2.5-pro-preview-tts + Aoede source is accepted.",
    `Legacy paced backups: ${BACKUP_ROOT}`,
    "A legacy/non-Pro paced directory is moved intact to the backup root before a normal run rebuilds it.",
    "The script never writes to the source directory or public/audio.",
  ].join("\n");
}

function positiveInteger(value, option) {
  if (!/^\d+$/.test(value || "") || Number(value) < 1) {
    throw new Error(`${option} requires a positive integer.`);
  }
  return Number(value);
}

function parseArguments(argv) {
  const options = {
    dryRun: false,
    help: false,
    limit: Number.POSITIVE_INFINITY,
    verify: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--verify") options.verify = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--limit") options.limit = positiveInteger(argv[++index], "--limit");
    else throw new Error(`Unknown option: ${argument}\n\n${usage()}`);
  }
  if (options.dryRun && options.verify) {
    throw new Error("--dry-run and --verify cannot be combined.");
  }
  return options;
}

function isWithin(candidate, parent) {
  const fromParent = relative(parent, candidate);
  return (
    fromParent === "" ||
    (fromParent !== ".." &&
      !fromParent.startsWith(`..${sep}`) &&
      !isAbsolute(fromParent))
  );
}

function assertWithin(candidate, parent, label) {
  if (!isWithin(resolve(candidate), resolve(parent))) {
    throw new Error(`${label} escapes its approved root.`);
  }
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

async function isRegularFile(path) {
  try {
    const info = await lstat(path);
    return info.isFile() && !info.isSymbolicLink();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function requireDirectory(path, label) {
  let info;
  try {
    info = await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(`${label} does not exist: ${path}`);
    throw error;
  }
  if (info.isSymbolicLink() || !info.isDirectory()) {
    throw new Error(`${label} must be a real directory, not a symlink: ${path}`);
  }
  return info;
}

async function requireFile(path, label) {
  let info;
  try {
    info = await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(`${label} does not exist: ${path}`);
    throw error;
  }
  if (info.isSymbolicLink() || !info.isFile()) {
    throw new Error(`${label} must be a regular file, not a symlink: ${path}`);
  }
  return info;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function fileSha256(path) {
  const hash = createHash("sha256");
  await new Promise((resolvePromise, rejectPromise) => {
    const input = createReadStream(path);
    input.on("data", (chunk) => hash.update(chunk));
    input.on("error", rejectPromise);
    input.on("end", resolvePromise);
  });
  return hash.digest("hex");
}

function wordCount(text) {
  return text.match(/[A-Za-z]+(?:[’'][A-Za-z]+)*/g)?.length || 0;
}

function buildPlan() {
  const jobs = BOOKS.flatMap((book) => {
    const pages = book.pages.map((page, index) => ({
      id: `${book.slug}/${String(index + 1).padStart(2, "0")}`,
      relativePath: `audio/${book.slug}/${String(index + 1).padStart(2, "0")}.mp3`,
      displayText: page.transcript,
      kind: "story",
      taskType: null,
    }));
    const tasks = [
      ["listen", book.tasks.listen.audioText],
      ["speak", book.tasks.speak.modelLine],
      ["read", book.tasks.read.passage],
      ["write", book.tasks.write.modelSentence],
    ].map(([taskType, displayText]) => ({
      id: `${book.slug}/${taskType}`,
      relativePath: `audio/${book.slug}/${taskType}.mp3`,
      displayText,
      kind: "task",
      taskType,
    }));
    return [...pages, ...tasks];
  });

  for (const job of jobs) {
    const purpose = job.kind === "story" ? "story" : "practice";
    job.spokenText = buildStoryNarrationSegments(job.displayText, purpose)
      .map((segment) => segment.text)
      .join(" ");
    job.spokenTextHash = sha256(job.spokenText);
    job.wordCount = wordCount(job.spokenText);
    if (job.wordCount < 1) throw new Error(`${job.id} has no countable spoken words.`);
  }

  if (jobs.length !== EXPECTED_TOTAL || new Set(jobs.map((job) => job.relativePath)).size !== EXPECTED_TOTAL) {
    throw new Error(`Expected ${EXPECTED_TOTAL} unique pacing jobs.`);
  }
  return jobs;
}

function pacingPlan(job, sourceMetrics) {
  const settings = proPacingSettingsForJob(job);
  const contentWpm = sourceMetrics.contentWpm;
  const activeWpm = sourceMetrics.activeWpm;
  const unconstrained = settings.minimumContentSeconds != null
    ? Math.min(
        1,
        sourceMetrics.contentSeconds / settings.minimumContentSeconds,
        settings.activeWpmCap / activeWpm,
      )
    : Math.min(
        1,
        settings.contentWpmTarget / contentWpm,
        settings.activeWpmCap / activeWpm,
      );
  const tempo = Math.max(settings.tempoFloor, Math.min(1, unconstrained));
  return {
    ...settings,
    tempo: Number(tempo.toFixed(6)),
    floorHit: tempo <= settings.tempoFloor + 0.000001,
  };
}

function normalizeManifestPath(value) {
  if (typeof value !== "string") return null;
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  return /^audio\/[a-z0-9-]+\/(?:\d{2}|listen|speak|read|write)\.mp3$/.test(normalized)
    ? normalized
    : null;
}

function normalizeSourceReceiptPath(value, id) {
  if (typeof value !== "string") return null;
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  return normalized === `.receipts/${id}.json` ? normalized : null;
}

async function loadSourceSnapshot(plan) {
  await requireDirectory(PROJECT_ROOT, "Project root");
  await requireDirectory(WORK_ROOT, "Work directory");
  await requireDirectory(SOURCE_ROOT, "Pro Aoede source root");
  await requireFile(SOURCE_MANIFEST_PATH, "Pro Aoede source manifest");
  const realProject = await realpath(PROJECT_ROOT);
  const realWork = await realpath(WORK_ROOT);
  const realSource = await realpath(SOURCE_ROOT);
  assertWithin(realWork, realProject, "Work directory");
  assertWithin(realSource, realWork, "Pro Aoede source root");

  const bytes = await readFile(SOURCE_MANIFEST_PATH);
  let manifest;
  try {
    manifest = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("Pro Aoede source manifest is not valid JSON.");
  }
  assertCompleteProSourceManifest(manifest);
  await requireDirectory(SOURCE_AUDIO_ROOT, "Pro Aoede source audio root");
  await requireDirectory(SOURCE_RECEIPT_ROOT, "Pro Aoede source receipt root");
  await requireDirectory(SOURCE_BATCH_RUNS_ROOT, "Pro Aoede Batch journal root");
  const realSourceAudio = await realpath(SOURCE_AUDIO_ROOT);
  const realSourceReceipts = await realpath(SOURCE_RECEIPT_ROOT);
  const realBatchRuns = await realpath(SOURCE_BATCH_RUNS_ROOT);
  assertWithin(realSourceAudio, realSource, "Pro Aoede source audio root");
  assertWithin(realSourceReceipts, realSource, "Pro Aoede source receipt root");
  assertWithin(realBatchRuns, realSource, "Pro Aoede Batch journal root");
  const clips = manifest.clips;
  const manifestJobs = manifest.jobs;
  const sourceByPath = new Map();
  for (const clip of clips) {
    const path = normalizeManifestPath(clip?.relativePath);
    if (!path || sourceByPath.has(path)) {
      throw new Error(`Source manifest contains an invalid or duplicate path: ${String(clip?.relativePath)}`);
    }
    sourceByPath.set(path, clip);
  }
  const jobsByPath = new Map();
  for (const manifestJob of manifestJobs) {
    const path = normalizeManifestPath(manifestJob?.outputPath);
    if (!path || jobsByPath.has(path)) {
      throw new Error(`Pro source manifest contains an invalid or duplicate job path: ${String(manifestJob?.outputPath)}`);
    }
    jobsByPath.set(path, manifestJob);
  }

  const entries = new Map();
  for (const job of plan) {
    const clip = sourceByPath.get(job.relativePath);
    const manifestJob = jobsByPath.get(job.relativePath);
    if (!clip || !manifestJob) throw new Error(`Pro source manifest is missing ${job.relativePath}.`);
    if (
      clip.id !== job.id ||
      manifestJob.id !== job.id ||
      clip.spokenText !== job.spokenText ||
      manifestJob.spokenText !== job.spokenText ||
      clip.spokenTextHash !== job.spokenTextHash ||
      manifestJob.spokenTextSha256 !== job.spokenTextHash ||
      manifestJob.displayTextSha256 !== sha256(job.displayText) ||
      clip.promptHash !== manifestJob.promptSha256 ||
      clip.requestHash !== manifestJob.requestSha256
    ) {
      throw new Error(`Source manifest spoken text does not match book data for ${job.relativePath}.`);
    }
    if (
      !Number.isInteger(clip.bytes) || clip.bytes < MIN_BYTES || clip.bytes > MAX_BYTES ||
      manifestJob.bytes !== clip.bytes
    ) {
      throw new Error(`Source manifest has an invalid byte count for ${job.relativePath}.`);
    }
    if (
      !/^[a-f0-9]{64}$/.test(clip.fileHash || "") ||
      manifestJob.audioSha256 !== clip.fileHash ||
      clip.fullDecodePassed !== true ||
      manifestJob.fullDecodePassed !== true
    ) {
      throw new Error(`Source manifest has no valid audio hash for ${job.relativePath}.`);
    }
    const receiptRelativePath = normalizeSourceReceiptPath(manifestJob.receiptPath, job.id);
    if (!receiptRelativePath || clip.receiptPath !== receiptRelativePath) {
      throw new Error(`Pro source manifest has no trusted receipt path for ${job.relativePath}.`);
    }
    const receiptPath = join(SOURCE_ROOT, receiptRelativePath);
    assertWithin(receiptPath, SOURCE_RECEIPT_ROOT, `Pro source receipt ${job.id}`);
    await requireFile(receiptPath, `Pro source receipt ${job.id}`);
    const realReceipt = await realpath(receiptPath);
    assertWithin(realReceipt, realSourceReceipts, `Resolved Pro source receipt ${job.id}`);
    const receiptBytes = await readFile(receiptPath);
    let generatorReceipt;
    try {
      generatorReceipt = JSON.parse(receiptBytes.toString("utf8"));
    } catch {
      throw new Error(`Pro source receipt is invalid JSON for ${job.relativePath}.`);
    }
    const generatorReceiptHash = sha256(receiptBytes);
    assertProGeneratorReceipt({
      receipt: generatorReceipt,
      sourceJob: manifestJob,
      sourceClip: clip,
      sourceManifest: manifest,
      receiptSha256: generatorReceiptHash,
    });
    const journalPath = join(
      SOURCE_BATCH_RUNS_ROOT,
      `batch-${generatorReceipt.batch.requestPlanSha256.slice(0, 20)}.json`,
    );
    assertWithin(journalPath, SOURCE_BATCH_RUNS_ROOT, `Pro Batch journal ${job.id}`);
    await requireFile(journalPath, `Pro Batch journal ${job.id}`);
    const realJournal = await realpath(journalPath);
    assertWithin(realJournal, realBatchRuns, `Resolved Pro Batch journal ${job.id}`);
    const journalBytes = await readFile(journalPath);
    let generatorJournal;
    try {
      generatorJournal = JSON.parse(journalBytes.toString("utf8"));
    } catch {
      throw new Error(`Pro Batch journal is invalid JSON for ${job.relativePath}.`);
    }
    assertProBatchJournal({
      journal: generatorJournal,
      receipt: generatorReceipt,
      sourceJob: manifestJob,
      sourceManifest: manifest,
    });
    const generatorJournalHash = sha256(journalBytes);
    const sourceRecord = {
      id: clip.id,
      relativePath: job.relativePath,
      status: clip.status,
      bytes: clip.bytes,
      fileHash: clip.fileHash,
      generatorJournalHash,
      generatorReceiptHash,
      promptHash: clip.promptHash,
      receiptPath: receiptRelativePath,
      requestHash: clip.requestHash,
      spokenTextHash: clip.spokenTextHash,
    };
    entries.set(job.relativePath, {
      ...sourceRecord,
      generatorJournal,
      generatorReceipt,
      recordHash: sha256(stableJson(sourceRecord)),
    });
  }
  return {
    entries,
    hash: sha256(bytes),
    manifest,
    model: SOURCE_MODEL,
    planSha256: manifest.plan.planSha256,
    updatedAt: manifest.updatedAt || null,
    voice: SOURCE_VOICE,
  };
}

function timestampForPath() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function expectedSourceIdentity(sourceSnapshot) {
  return {
    generatorVersion: SOURCE_GENERATOR_VERSION,
    manifestPath: relative(PROJECT_ROOT, SOURCE_MANIFEST_PATH),
    model: SOURCE_MODEL,
    planSha256: sourceSnapshot.planSha256,
    root: relative(PROJECT_ROOT, SOURCE_ROOT),
    voice: SOURCE_VOICE,
  };
}

function outputManifestMatchesSource(manifest, sourceSnapshot) {
  return pacedManifestMatchesProSource(manifest, {
    sourceRoot: relative(PROJECT_ROOT, SOURCE_ROOT),
    sourceManifestPath: relative(PROJECT_ROOT, SOURCE_MANIFEST_PATH),
    sourcePlanSha256: sourceSnapshot.planSha256,
  });
}

function clipSourceMatches(source, sourceEntry, sourceSnapshot) {
  return pacedClipSourceMatches(source, {
    audioSha256: sourceEntry?.fileHash,
    sourceRecordSha256: sourceEntry?.recordHash,
    generatorReceiptSha256: sourceEntry?.generatorReceiptHash,
    generatorJournalSha256: sourceEntry?.generatorJournalHash,
    sourceManifestSha256: sourceSnapshot.hash,
    sourceManifestPath: relative(PROJECT_ROOT, SOURCE_MANIFEST_PATH),
    sourcePlanSha256: sourceSnapshot.planSha256,
  });
}

async function archiveIncompatibleOutput(options, sourceSnapshot) {
  if (!(await exists(OUTPUT_ROOT))) return null;
  await requireDirectory(OUTPUT_ROOT, "Existing paced output root");
  const realWork = await realpath(WORK_ROOT);
  const realOutput = await realpath(OUTPUT_ROOT);
  assertWithin(realOutput, realWork, "Existing paced output root");
  if (await exists(PROMOTION_LOCK_PATH)) {
    throw new Error("A promotion lock exists; refusing to archive the paced output while promotion may be active.");
  }

  let manifest = null;
  if (await exists(OUTPUT_MANIFEST_PATH)) {
    await requireFile(OUTPUT_MANIFEST_PATH, "Existing paced output manifest");
    try {
      manifest = JSON.parse(await readFile(OUTPUT_MANIFEST_PATH, "utf8"));
    } catch {
      manifest = null;
    }
  }
  if (outputManifestMatchesSource(manifest, sourceSnapshot)) return null;
  if (options.verify) {
    throw new Error(
      "Existing paced output is legacy, non-Pro, or belongs to another Pro plan. Run normalization without --verify to move it intact into the backup root and rebuild.",
    );
  }

  if (!(await exists(BACKUP_ROOT))) await mkdir(BACKUP_ROOT, { recursive: false, mode: 0o700 });
  await requireDirectory(BACKUP_ROOT, "Paced backup root");
  const realBackup = await realpath(BACKUP_ROOT);
  assertWithin(realBackup, realWork, "Paced backup root");
  const identity = manifest?.latestSourceManifest?.sha256 || manifest?.transformVersion || "unidentified";
  const safeIdentity = String(identity).replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 12) || "unidentified";
  const destination = join(
    BACKUP_ROOT,
    `paced-before-pro-${timestampForPath()}-${safeIdentity}-${randomUUID()}`,
  );
  assertWithin(destination, BACKUP_ROOT, "Paced backup destination");
  if (await exists(destination)) throw new Error("Generated paced backup destination already exists.");
  await rename(OUTPUT_ROOT, destination);
  process.stdout.write(`Archived incompatible paced output intact at ${destination}.\n`);
  return destination;
}

async function ensureOutputRoots(options, sourceSnapshot) {
  const publicRoot = resolve(PROJECT_ROOT, "public");
  assertWithin(OUTPUT_ROOT, PROJECT_ROOT, "Paced output root");
  if (isWithin(OUTPUT_ROOT, publicRoot) || isWithin(publicRoot, OUTPUT_ROOT)) {
    throw new Error("Paced output root must remain separate from public/.");
  }
  await archiveIncompatibleOutput(options, sourceSnapshot);
  if (!(await exists(OUTPUT_ROOT))) await mkdir(OUTPUT_ROOT, { recursive: false, mode: 0o700 });
  await requireDirectory(OUTPUT_ROOT, "Paced output root");
  for (const path of [OUTPUT_AUDIO_ROOT, RECEIPT_ROOT, TEMP_ROOT]) {
    if (!(await exists(path))) await mkdir(path, { recursive: false, mode: 0o700 });
    await requireDirectory(path, "Paced output subdirectory");
  }
}

function freshRecord(job) {
  return {
    id: job.id,
    relativePath: job.relativePath,
    kind: job.kind,
    taskType: job.taskType,
    spokenTextHash: job.spokenTextHash,
    wordCount: job.wordCount,
    status: "waiting-for-source",
    source: null,
    raw: null,
    pacing: null,
    afterTempo: null,
    silenceTrim: null,
    final: null,
    manualPacing: false,
    warnings: [],
    lastError: null,
  };
}

async function atomicWriteJson(path, value) {
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function loadOutputManifest(plan, sourceSnapshot) {
  if (!(await exists(OUTPUT_MANIFEST_PATH))) {
    return {
      schemaVersion: SCHEMA_VERSION,
      transformVersion: TRANSFORM_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceRoot: relative(PROJECT_ROOT, SOURCE_ROOT),
      sourceIdentity: expectedSourceIdentity(sourceSnapshot),
      pacingPolicy: PACING_POLICY,
      outputRoot: relative(PROJECT_ROOT, OUTPUT_ROOT),
      publishReady: false,
      summary: null,
      clips: plan.map(freshRecord),
    };
  }
  await requireFile(OUTPUT_MANIFEST_PATH, "Paced output manifest");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(OUTPUT_MANIFEST_PATH, "utf8"));
  } catch {
    throw new Error("Paced output manifest is not valid JSON and was left untouched.");
  }
  if (manifest?.schemaVersion !== SCHEMA_VERSION || manifest?.transformVersion !== TRANSFORM_VERSION) {
    throw new Error("Paced output manifest uses an incompatible transform version.");
  }
  if (!outputManifestMatchesSource(manifest, sourceSnapshot)) {
    throw new Error("Paced output manifest is not bound to the current complete Pro + Aoede source plan.");
  }
  if (!Array.isArray(manifest.clips) || manifest.clips.length !== EXPECTED_TOTAL) {
    throw new Error("Paced output manifest does not contain the complete 134-clip plan.");
  }
  const byPath = new Map(manifest.clips.map((clip) => [clip.relativePath, clip]));
  if (byPath.size !== EXPECTED_TOTAL || plan.some((job) => !byPath.has(job.relativePath))) {
    throw new Error("Paced output manifest paths no longer match the book plan.");
  }
  manifest.clips = [];
  for (const job of plan) {
    const record = { ...freshRecord(job), ...byPath.get(job.relativePath) };
    const sourceEntry = sourceSnapshot.entries.get(job.relativePath);
    const provenanceMatches =
      record.status === "complete" &&
      clipSourceMatches(record.source, sourceEntry, sourceSnapshot) &&
      proPacingSettingsMatch(record.pacing, job) &&
      proPausePaddingRecordMatches(record);
    const artifactsPresent =
      await isRegularFile(outputPathFor(job)) &&
      await isRegularFile(receiptPathFor(job));
    if (record.status === "complete" && (!provenanceMatches || !artifactsPresent)) {
      record.status = "waiting-for-processing";
      record.lastError = provenanceMatches
        ? "Paced output or receipt is missing; a safe rebuild is required."
        : "Pro source identity changed; old artifacts must be backed up and rebuilt.";
    }
    manifest.clips.push(record);
  }
  return manifest;
}

function summarizeManifest(manifest, sourceSnapshot) {
  const counts = Object.create(null);
  for (const clip of manifest.clips) counts[clip.status] = (counts[clip.status] || 0) + 1;
  const complete = manifest.clips.filter((clip) => clip.status === "complete");
  const metricValues = (selector) => complete.map(selector).filter(Number.isFinite);
  manifest.updatedAt = new Date().toISOString();
  manifest.sourceRoot = relative(PROJECT_ROOT, SOURCE_ROOT);
  manifest.sourceIdentity = expectedSourceIdentity(sourceSnapshot);
  manifest.pacingPolicy = PACING_POLICY;
  manifest.latestSourceManifest = {
    path: relative(PROJECT_ROOT, SOURCE_MANIFEST_PATH),
    sha256: sourceSnapshot.hash,
    updatedAt: sourceSnapshot.updatedAt,
    completedClips: sourceSnapshot.entries.size,
    generatorVersion: SOURCE_GENERATOR_VERSION,
    model: SOURCE_MODEL,
    planSha256: sourceSnapshot.planSha256,
    voice: SOURCE_VOICE,
  };
  const provenanceComplete = complete.every((clip) => {
    const sourceEntry = sourceSnapshot.entries.get(clip.relativePath);
    return (
      clipSourceMatches(clip.source, sourceEntry, sourceSnapshot) &&
      proPacingSettingsMatch(clip.pacing, clip) &&
      proPausePaddingRecordMatches(clip)
    );
  });
  manifest.publishReady = counts.complete === EXPECTED_TOTAL && provenanceComplete;
  manifest.summary = {
    total: EXPECTED_TOTAL,
    ...counts,
    distributions: {
      finalActiveWpm: distribution(metricValues((clip) => clip.final?.activeWpm)),
      finalContentWpm: distribution(metricValues((clip) => clip.final?.contentWpm)),
      finalDurationSeconds: distribution(metricValues((clip) => clip.final?.durationSeconds)),
      finalIntegratedLufs: distribution(
        metricValues((clip) => clip.final?.loudness?.integratedLufs),
      ),
      finalTruePeakDbtp: distribution(
        metricValues((clip) => clip.final?.loudness?.truePeakDbtp),
      ),
      rawActiveWpm: distribution(metricValues((clip) => clip.raw?.activeWpm)),
      rawContentWpm: distribution(metricValues((clip) => clip.raw?.contentWpm)),
      tempo: distribution(metricValues((clip) => clip.pacing?.tempo)),
    },
    manualPacing: complete.filter((clip) => clip.manualPacing).map((clip) => clip.id),
    warningClips: complete.filter((clip) => clip.warnings?.length).map((clip) => clip.id),
  };
}

async function saveOutputManifest(manifest, sourceSnapshot) {
  summarizeManifest(manifest, sourceSnapshot);
  await atomicWriteJson(OUTPUT_MANIFEST_PATH, manifest);
}

async function requireAudioTools() {
  for (const command of ["ffprobe", "ffmpeg"]) {
    try {
      await run(command, ["-version"], {
        encoding: "utf8",
        timeout: 15_000,
        maxBuffer: 1024 * 1024,
      });
    } catch (error) {
      if (error?.code === "ENOENT") throw new Error(`${command} is not installed or not on PATH.`);
      throw new Error(`${command} could not be started.`);
    }
  }
}

async function probeAudio(path) {
  let probe;
  try {
    const { stdout } = await run(
      "ffprobe",
      ["-v", "error", "-show_streams", "-show_format", "-of", "json", path],
      { encoding: "utf8", timeout: 30_000, maxBuffer: 2 * 1024 * 1024 },
    );
    probe = JSON.parse(stdout);
  } catch (error) {
    throw new Error(`ffprobe failed: ${String(error?.stderr || error?.message).replace(/[\r\n]+/g, " ").slice(0, 300)}`);
  }
  const streams = Array.isArray(probe?.streams) ? probe.streams : [];
  const stream = streams[0];
  const durationSeconds = Number(probe?.format?.duration ?? stream?.duration);
  if (
    streams.length !== 1 ||
    stream?.codec_type !== "audio" ||
    !["mp3", "pcm_s16le"].includes(stream?.codec_name) ||
    Number(stream?.sample_rate) !== 24_000 ||
    Number(stream?.channels) !== 1 ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    throw new Error("Expected exactly one readable 24 kHz mono audio stream.");
  }
  return {
    channels: Number(stream.channels),
    codec: stream.codec_name,
    durationSeconds,
    sampleRate: Number(stream.sample_rate),
  };
}

function parseSilence(stderr, durationSeconds) {
  const intervals = [];
  let openStart = null;
  const eventPattern = /silence_(start|end):\s*(-?\d+(?:\.\d+)?)/g;
  for (const match of stderr.matchAll(eventPattern)) {
    const value = Math.max(0, Math.min(durationSeconds, Number(match[2])));
    if (match[1] === "start") openStart = value;
    else if (openStart != null && value >= openStart) {
      intervals.push({ start: openStart, end: value, duration: value - openStart });
      openStart = null;
    }
  }
  if (openStart != null && durationSeconds > openStart) {
    intervals.push({ start: openStart, end: durationSeconds, duration: durationSeconds - openStart });
  }
  return intervals;
}

async function detectSilence(
  path,
  durationSeconds,
  minimumSeconds = SILENCE_MIN_SECONDS,
  noise = SILENCE_NOISE,
) {
  let stderr;
  try {
    ({ stderr } = await run(
      "ffmpeg",
      [
        "-nostdin",
        "-hide_banner",
        "-nostats",
        "-xerror",
        "-i",
        path,
        "-af",
        `silencedetect=noise=${noise}:d=${minimumSeconds}`,
        "-f",
        "null",
        "-",
      ],
      { encoding: "utf8", timeout: 60_000, maxBuffer: 4 * 1024 * 1024 },
    ));
  } catch (error) {
    throw new Error(`silencedetect/full decode failed: ${String(error?.stderr || error?.message).replace(/[\r\n]+/g, " ").slice(0, 300)}`);
  }
  return parseSilence(stderr, durationSeconds);
}

function silenceMetrics(durationSeconds, intervals, words) {
  const leading = intervals.find((interval) => interval.start <= 0.03) || null;
  const trailing = [...intervals].reverse().find((interval) => interval.end >= durationSeconds - 0.03) || null;
  const allSilenceSeconds = intervals.reduce((sum, interval) => sum + interval.duration, 0);
  const leadingSeconds = leading?.duration || 0;
  const trailingSeconds = trailing && trailing !== leading ? trailing.duration : 0;
  const activeSeconds = Math.max(0.001, durationSeconds - allSilenceSeconds);
  const contentSeconds = Math.max(0.001, durationSeconds - leadingSeconds - trailingSeconds);
  return {
    activeSeconds,
    activeWpm: (words / activeSeconds) * 60,
    allSilenceSeconds,
    contentSeconds,
    contentWpm: (words / contentSeconds) * 60,
    internalMaxSeconds: Math.max(
      0,
      ...intervals
        .filter((interval) => interval !== leading && interval !== trailing)
        .map((interval) => interval.duration),
    ),
    intervalCount: intervals.length,
    intervals,
    leadingSeconds,
    trailingSeconds,
  };
}

function parseLoudness(stderr) {
  const matches = [...stderr.matchAll(/\{\s*"input_i"[\s\S]*?\}/g)];
  if (!matches.length) throw new Error("loudnorm returned no measurement JSON.");
  let parsed;
  try {
    parsed = JSON.parse(matches.at(-1)[0]);
  } catch {
    throw new Error("loudnorm returned malformed measurement JSON.");
  }
  const integratedLufs = Number(parsed.input_i);
  const truePeakDbtp = Number(parsed.input_tp);
  const loudnessRangeLu = Number(parsed.input_lra);
  const thresholdLufs = Number(parsed.input_thresh);
  const targetOffsetLu = Number(parsed.target_offset);
  if (
    ![integratedLufs, truePeakDbtp, loudnessRangeLu, thresholdLufs, targetOffsetLu].every(
      Number.isFinite,
    )
  ) {
    throw new Error("loudnorm returned non-finite measurements.");
  }
  return {
    integratedLufs,
    loudnessRangeLu,
    targetOffsetLu,
    thresholdLufs,
    truePeakDbtp,
  };
}

async function measureLoudness(path) {
  let stderr;
  try {
    ({ stderr } = await run(
      "ffmpeg",
      [
        "-nostdin",
        "-hide_banner",
        "-nostats",
        "-i",
        path,
        "-af",
        "loudnorm=I=-18:TP=-1.5:LRA=7:print_format=json",
        "-f",
        "null",
        "-",
      ],
      { encoding: "utf8", timeout: 60_000, maxBuffer: 4 * 1024 * 1024 },
    ));
  } catch (error) {
    throw new Error(`loudness measurement failed: ${String(error?.stderr || error?.message).replace(/[\r\n]+/g, " ").slice(0, 300)}`);
  }
  return parseLoudness(stderr);
}

async function analyzeAudio(path, words, includeLoudness = true) {
  const probe = await probeAudio(path);
  const intervals = await detectSilence(path, probe.durationSeconds);
  return {
    ...probe,
    ...silenceMetrics(probe.durationSeconds, intervals, words),
    loudness: includeLoudness ? await measureLoudness(path) : null,
  };
}

function trimPlan(metrics, job) {
  const removals = [];
  const leading = metrics.intervals.find((interval) => interval.start <= 0.03) || null;
  const trailing = [...metrics.intervals]
    .reverse()
    .find((interval) => interval.end >= metrics.durationSeconds - 0.03) || null;
  for (const interval of metrics.intervals) {
    let keep = null;
    let reason = null;
    if (interval === leading && interval.duration > LEADING_HARD_SECONDS) {
      keep = LEADING_KEEP_SECONDS;
      reason = "leading";
      removals.push({ start: interval.start, end: interval.end - keep, reason });
    } else if (interval === trailing && interval.duration > TRAILING_HARD_SECONDS) {
      keep = TRAILING_KEEP_SECONDS;
      reason = "trailing";
      removals.push({ start: interval.start + keep, end: interval.end, reason });
    } else if (interval !== leading && interval !== trailing && interval.duration > INTERNAL_HARD_SECONDS) {
      keep = job.kind === "story" ? STORY_INTERNAL_KEEP_SECONDS : TASK_INTERNAL_KEEP_SECONDS;
      reason = "internal";
      const removeSeconds = interval.duration - keep;
      removals.push({
        start: interval.start + keep / 2,
        end: interval.start + keep / 2 + removeSeconds,
        reason,
      });
    }
  }
  return removals.filter((range) => range.end - range.start > 0.01);
}

async function renderTempoSource(sourcePath, tempoPath, tempo) {
  await run(
    "ffmpeg",
    [
      "-nostdin",
      "-hide_banner",
      "-loglevel",
      "error",
      "-xerror",
      "-n",
      "-i",
      sourcePath,
      "-af",
      `atempo=${tempo.toFixed(6)}`,
      "-map_metadata",
      "-1",
      "-c:a",
      "pcm_s16le",
      "-ar",
      "24000",
      "-ac",
      "1",
      tempoPath,
    ],
    { encoding: "utf8", timeout: 120_000, maxBuffer: 4 * 1024 * 1024 },
  );
}

async function measureTrimmedLoudness(tempoPath, filter) {
  let stderr;
  const measurementFilter = `${filter};[out]loudnorm=I=${TARGET_LUFS}:TP=${ENCODE_TRUE_PEAK_DBTP}:LRA=7:print_format=json[measured]`;
  try {
    ({ stderr } = await run(
      "ffmpeg",
      [
        "-nostdin",
        "-hide_banner",
        "-nostats",
        "-i",
        tempoPath,
        "-filter_complex",
        measurementFilter,
        "-map",
        "[measured]",
        "-f",
        "null",
        "-",
      ],
      { encoding: "utf8", timeout: 120_000, maxBuffer: 4 * 1024 * 1024 },
    ));
  } catch (error) {
    throw new Error(`trimmed loudness measurement failed: ${String(error?.stderr || error?.message).replace(/[\r\n]+/g, " ").slice(0, 300)}`);
  }
  return parseLoudness(stderr);
}

async function renderFinal(tempoPath, partialPath, filter, measured, postGainDb = null) {
  const normalization = [
    `loudnorm=I=${TARGET_LUFS}`,
    `TP=${ENCODE_TRUE_PEAK_DBTP}`,
    "LRA=7",
    `measured_I=${measured.integratedLufs}`,
    `measured_LRA=${measured.loudnessRangeLu}`,
    `measured_TP=${measured.truePeakDbtp}`,
    `measured_thresh=${measured.thresholdLufs}`,
    `offset=${measured.targetOffsetLu}`,
    "linear=true",
  ].join(":");
  const postNormalization = postGainDb == null
    ? `[out]${normalization}[final]`
    : `[out]${normalization}[normalized];[normalized]volume=${postGainDb.toFixed(3)}dB,alimiter=limit=${LIMITER_LINEAR_LIMIT}:attack=5:release=80:level=false:latency=true[final]`;
  const filterWithLoudness = `${filter};${postNormalization}`;
  await run(
    "ffmpeg",
    [
      "-nostdin",
      "-hide_banner",
      "-loglevel",
      "error",
      "-xerror",
      "-n",
      "-i",
      tempoPath,
      "-filter_complex",
      filterWithLoudness,
      "-map",
      "[final]",
      "-map_metadata",
      "-1",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "64k",
      "-ar",
      "24000",
      "-ac",
      "1",
      partialPath,
    ],
    { encoding: "utf8", timeout: 120_000, maxBuffer: 4 * 1024 * 1024 },
  );
}

function roundedMetrics(metrics) {
  return {
    activeSeconds: Number(metrics.activeSeconds.toFixed(3)),
    activeWpm: Number(metrics.activeWpm.toFixed(1)),
    allSilenceSeconds: Number(metrics.allSilenceSeconds.toFixed(3)),
    contentSeconds: Number(metrics.contentSeconds.toFixed(3)),
    contentWpm: Number(metrics.contentWpm.toFixed(1)),
    channels: metrics.channels,
    codec: metrics.codec,
    durationSeconds: Number(metrics.durationSeconds.toFixed(3)),
    internalMaxSeconds: Number(metrics.internalMaxSeconds.toFixed(3)),
    intervalCount: metrics.intervalCount,
    intervals: metrics.intervals.map((interval) => ({
      start: Number(interval.start.toFixed(3)),
      end: Number(interval.end.toFixed(3)),
      duration: Number(interval.duration.toFixed(3)),
    })),
    leadingSeconds: Number(metrics.leadingSeconds.toFixed(3)),
    loudness: metrics.loudness
      ? {
          integratedLufs: Number(metrics.loudness.integratedLufs.toFixed(2)),
          loudnessRangeLu: Number(metrics.loudness.loudnessRangeLu.toFixed(2)),
          truePeakDbtp: Number(metrics.loudness.truePeakDbtp.toFixed(2)),
        }
      : null,
    sampleRate: metrics.sampleRate,
    trailingSeconds: Number(metrics.trailingSeconds.toFixed(3)),
  };
}

function finalWarnings(job, pacing, metrics) {
  const warnings = [];
  let manualPacing = false;
  const floorLimitedCeiling =
    PACING_POLICY.floorLimitedPausePadding.contentWpmCeiling + 0.5;
  if (job.wordCount >= 8 && pacing.floorHit && metrics.contentWpm > floorLimitedCeiling) {
    warnings.push(`manual_pacing: floor-limited content rate ${metrics.contentWpm.toFixed(1)} WPM`);
    manualPacing = true;
  }
  if (
    job.wordCount < 8 &&
    pacing.minimumContentSeconds &&
    metrics.contentSeconds < pacing.minimumContentSeconds * 0.85 &&
    (metrics.contentWpm > floorLimitedCeiling ||
      metrics.activeWpm > PACING_POLICY.activeWpmCap)
  ) {
    warnings.push(
      `manual_pacing: short content is ${metrics.contentSeconds.toFixed(2)}s; preferred minimum is ${pacing.minimumContentSeconds.toFixed(2)}s`,
    );
    manualPacing = true;
  }
  const internalWarning = job.kind === "story" ? 1.2 : 0.9;
  if (metrics.internalMaxSeconds > internalWarning) {
    warnings.push(`long internal pause: ${metrics.internalMaxSeconds.toFixed(2)}s`);
  }
  if (metrics.leadingSeconds > LEADING_HARD_SECONDS) warnings.push("leading silence remains above 0.5s");
  if (metrics.trailingSeconds > TRAILING_HARD_SECONDS) warnings.push("trailing silence remains above 0.8s");
  return { manualPacing, warnings };
}

function validateFinal(metrics, info) {
  if (metrics.codec !== "mp3" || metrics.sampleRate !== 24_000 || metrics.channels !== 1) {
    throw new Error("Final output is not a 24 kHz mono MP3.");
  }
  if (metrics.durationSeconds >= MAX_DURATION_SECONDS) {
    throw new Error(`Final duration ${metrics.durationSeconds.toFixed(2)}s is not below 40s.`);
  }
  if (info.size < MIN_BYTES || info.size > MAX_BYTES) {
    throw new Error(`Final size ${info.size} is outside ${MIN_BYTES}-${MAX_BYTES} bytes.`);
  }
  if (
    metrics.loudness.integratedLufs < MIN_FINAL_LUFS ||
    metrics.loudness.integratedLufs > MAX_FINAL_LUFS
  ) {
    throw new Error(`Final loudness ${metrics.loudness.integratedLufs.toFixed(2)} LUFS missed the -18 LUFS target.`);
  }
  if (metrics.loudness.truePeakDbtp > MAX_FINAL_TRUE_PEAK_DBTP) {
    throw new Error(`Final true peak ${metrics.loudness.truePeakDbtp.toFixed(2)} dBTP exceeds -1.5 dBTP.`);
  }
}

function sourcePathFor(job) {
  return join(SOURCE_ROOT, job.relativePath);
}

function outputPathFor(job) {
  return join(OUTPUT_ROOT, job.relativePath);
}

function receiptPathFor(job) {
  return join(RECEIPT_ROOT, `${job.id}.json`);
}

async function staleArtifactBackupRoot() {
  if (staleBackupRunRoot) return staleBackupRunRoot;
  if (!(await exists(BACKUP_ROOT))) await mkdir(BACKUP_ROOT, { recursive: false, mode: 0o700 });
  await requireDirectory(BACKUP_ROOT, "Paced backup root");
  const realWork = await realpath(WORK_ROOT);
  const realBackup = await realpath(BACKUP_ROOT);
  assertWithin(realBackup, realWork, "Paced backup root");
  staleBackupRunRoot = join(
    BACKUP_ROOT,
    `pro-source-rebuild-${timestampForPath()}-${randomUUID()}`,
  );
  assertWithin(staleBackupRunRoot, BACKUP_ROOT, "Stale artifact backup root");
  await mkdir(staleBackupRunRoot, { recursive: false, mode: 0o700 });
  await requireDirectory(staleBackupRunRoot, "Stale artifact backup root");
  return staleBackupRunRoot;
}

async function archiveStaleArtifacts(job, reason) {
  const outputPath = outputPathFor(job);
  const receiptPath = receiptPathFor(job);
  const hasOutput = await exists(outputPath);
  const hasReceipt = await exists(receiptPath);
  if (!hasOutput && !hasReceipt) return;
  const root = await staleArtifactBackupRoot();
  const [bookSlug, clipName] = job.id.split("/");
  const audioBookRoot = join(root, "audio", bookSlug);
  const receiptBookRoot = join(root, ".receipts", bookSlug);
  const metadataBookRoot = join(root, "metadata", bookSlug);
  for (const path of [join(root, "audio"), join(root, ".receipts"), join(root, "metadata")]) {
    if (!(await exists(path))) await mkdir(path, { recursive: false, mode: 0o700 });
    await requireDirectory(path, "Stale artifact backup directory");
  }
  for (const path of [audioBookRoot, receiptBookRoot, metadataBookRoot]) {
    if (!(await exists(path))) await mkdir(path, { recursive: false, mode: 0o700 });
    await requireDirectory(path, "Stale artifact book backup directory");
  }
  const archived = { output: null, receipt: null };
  if (hasOutput) {
    await requireFile(outputPath, `Stale paced output ${job.id}`);
    const destination = join(audioBookRoot, `${clipName}.mp3`);
    assertWithin(destination, root, `Stale output backup ${job.id}`);
    await rename(outputPath, destination);
    archived.output = relative(root, destination);
  }
  if (hasReceipt) {
    await requireFile(receiptPath, `Stale pacing receipt ${job.id}`);
    const destination = join(receiptBookRoot, `${clipName}.json`);
    assertWithin(destination, root, `Stale receipt backup ${job.id}`);
    await rename(receiptPath, destination);
    archived.receipt = relative(root, destination);
  }
  await atomicWriteJson(join(metadataBookRoot, `${clipName}.json`), {
    schemaVersion: 1,
    archivedAt: new Date().toISOString(),
    id: job.id,
    reason,
    archived,
    replacementSource: {
      root: relative(PROJECT_ROOT, SOURCE_ROOT),
      model: SOURCE_MODEL,
      voice: SOURCE_VOICE,
    },
  });
  process.stdout.write(`  backed up stale paced artifacts for ${job.id} before rebuild.\n`);
}

async function validateSource(job, sourceEntry) {
  const path = sourcePathFor(job);
  assertWithin(path, SOURCE_AUDIO_ROOT, `Source ${job.relativePath}`);
  const info = await requireFile(path, `Source ${job.relativePath}`);
  const realPath = await realpath(path);
  const realSourceAudio = await realpath(SOURCE_AUDIO_ROOT);
  assertWithin(realPath, realSourceAudio, `Resolved source ${job.relativePath}`);
  if (info.size !== sourceEntry.bytes) throw new Error("Source size does not match its manifest entry.");
  const sourceHash = await fileSha256(path);
  if (sourceHash !== sourceEntry.fileHash) throw new Error("Source SHA-256 does not match its manifest entry.");
  return { info, path, sourceHash };
}

async function recoverFromReceipt(job, record, sourceSnapshot, sourceEntry, allowRebuild = false) {
  const outputPath = outputPathFor(job);
  const receiptPath = receiptPathFor(job);
  const hasOutput = await exists(outputPath);
  const hasReceipt = await exists(receiptPath);
  const stale = async (message) => {
    if (!allowRebuild) throw new Error(message);
    await archiveStaleArtifacts(job, message);
    Object.assign(record, freshRecord(job));
    return false;
  };
  if (!hasOutput) {
    if (hasReceipt) return stale(`Receipt exists without its paced output: ${job.relativePath}`);
    return false;
  }
  if (!hasReceipt) {
    return stale(`Output exists without a trusted receipt: ${job.relativePath}`);
  }
  await requireFile(receiptPath, `Receipt ${job.id}`);
  let receipt;
  try {
    receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  } catch {
    return stale(`Receipt is invalid JSON for ${job.relativePath}.`);
  }
  if (
    receipt?.schemaVersion !== SCHEMA_VERSION ||
    receipt?.transformVersion !== TRANSFORM_VERSION ||
    receipt?.pacingPolicyVersion !== PACING_POLICY_VERSION ||
    receipt?.source?.hash !== sourceEntry.fileHash ||
    receipt?.source?.recordHash !== sourceEntry.recordHash ||
    receipt?.source?.manifestHash !== sourceSnapshot.hash ||
    receipt?.source?.manifestPath !== relative(PROJECT_ROOT, SOURCE_MANIFEST_PATH) ||
    receipt?.source?.planSha256 !== sourceSnapshot.planSha256 ||
    receipt?.source?.generatorReceiptHash !== sourceEntry.generatorReceiptHash ||
    receipt?.source?.generatorJournalHash !== sourceEntry.generatorJournalHash ||
    receipt?.source?.model !== SOURCE_MODEL ||
    receipt?.source?.voice !== SOURCE_VOICE ||
    receipt?.output?.relativePath !== job.relativePath ||
    !Number.isInteger(receipt?.output?.bytes) ||
    !/^[a-f0-9]{64}$/.test(receipt?.output?.hash || "") ||
    receipt?.record?.id !== job.id ||
    receipt?.record?.relativePath !== job.relativePath ||
    receipt?.record?.spokenTextHash !== job.spokenTextHash ||
    receipt?.record?.status !== "complete" ||
    !proPacingSettingsMatch(receipt?.record?.pacing, job) ||
    !proPausePaddingRecordMatches(receipt?.record) ||
    receipt?.record?.source?.hash !== receipt.source.hash ||
    receipt?.record?.source?.recordHash !== receipt.source.recordHash ||
    receipt?.record?.source?.manifestHash !== receipt.source.manifestHash ||
    receipt?.record?.source?.manifestPath !== receipt.source.manifestPath ||
    receipt?.record?.source?.planSha256 !== receipt.source.planSha256 ||
    receipt?.record?.source?.generatorReceiptHash !== receipt.source.generatorReceiptHash ||
    receipt?.record?.source?.generatorJournalHash !== receipt.source.generatorJournalHash ||
    receipt?.record?.source?.model !== receipt.source.model ||
    receipt?.record?.source?.voice !== receipt.source.voice ||
    receipt?.record?.final?.relativePath !== receipt.output.relativePath ||
    receipt?.record?.final?.bytes !== receipt.output.bytes ||
    receipt?.record?.final?.hash !== receipt.output.hash
  ) {
    return stale(`Existing output receipt does not match the current Pro source for ${job.relativePath}.`);
  }
  const outputInfo = await requireFile(outputPath, `Paced output ${job.relativePath}`);
  const outputHash = await fileSha256(outputPath);
  if (outputHash !== receipt.output.hash || outputInfo.size !== receipt.output.bytes) {
    return stale(`Existing paced output does not match its receipt for ${job.relativePath}.`);
  }
  const metrics = await analyzeAudio(outputPath, job.wordCount);
  validateFinal(metrics, outputInfo);
  const warningResult = finalWarnings(job, receipt.record.pacing, metrics);
  Object.assign(record, receipt.record, {
    status: "complete",
    source: {
      ...receipt.record.source,
      manifestHash: sourceSnapshot.hash,
      manifestUpdatedAt: sourceSnapshot.updatedAt,
      recordHash: sourceEntry.recordHash,
    },
    final: {
      ...receipt.record.final,
      ...roundedMetrics(metrics),
      bytes: outputInfo.size,
      hash: outputHash,
    },
    manualPacing: warningResult.manualPacing,
    warnings: warningResult.warnings,
    lastError: null,
  });
  return true;
}

async function normalizeOne(job, record, sourceSnapshot, sourceEntry) {
  const { info: sourceInfo, path: sourcePath, sourceHash } = await validateSource(job, sourceEntry);
  if (await recoverFromReceipt(job, record, sourceSnapshot, sourceEntry, true)) return "reused";

  const outputPath = outputPathFor(job);
  if (await exists(outputPath)) throw new Error(`Refusing to overwrite untracked output ${job.relativePath}.`);
  const outputParent = dirname(outputPath);
  if (!(await exists(outputParent))) await mkdir(outputParent, { recursive: false, mode: 0o700 });
  await requireDirectory(outputParent, `Output directory ${job.id}`);
  const receiptParent = dirname(receiptPathFor(job));
  if (!(await exists(receiptParent))) await mkdir(receiptParent, { recursive: false, mode: 0o700 });
  await requireDirectory(receiptParent, `Receipt directory ${job.id}`);

  const sourceMetrics = await analyzeAudio(sourcePath, job.wordCount);
  const pacing = pacingPlan(job, sourceMetrics);
  const tempoPath = join(TEMP_ROOT, `${job.id.replace("/", "-")}-${randomUUID()}.wav`);
  const partialPath = join(outputParent, `.${job.id.split("/").at(-1)}-${randomUUID()}.partial.mp3`);
  try {
    await renderTempoSource(sourcePath, tempoPath, pacing.tempo);
    const afterTempoMetrics = await analyzeAudio(tempoPath, job.wordCount, false);
    const removals = trimPlan(afterTempoMetrics, job);
    const pausePolicy = PACING_POLICY.floorLimitedPausePadding;
    const microIntervals = pacing.floorHit
      ? await detectSilence(
          tempoPath,
          afterTempoMetrics.durationSeconds,
          pausePolicy.detectionMinimumSeconds,
          pausePolicy.detectionNoise,
        )
      : [];
    const pausePadding = buildPausePaddingPlan({
      job,
      pacing,
      metrics: afterTempoMetrics,
      microIntervals,
      removals,
      internalHardSeconds: INTERNAL_HARD_SECONDS,
    });
    const trim = buildTimelineEditFilter(
      afterTempoMetrics.durationSeconds,
      removals,
      pausePadding.additions,
    );
    const normalizationInput = await measureTrimmedLoudness(tempoPath, trim.filter);
    await renderFinal(tempoPath, partialPath, trim.filter, normalizationInput);
    let partialInfo = await requireFile(partialPath, `Partial paced output ${job.relativePath}`);
    let finalMetrics = await analyzeAudio(partialPath, job.wordCount);
    let correctiveGainDb = null;
    if (
      finalMetrics.loudness.integratedLufs < MIN_FINAL_LUFS ||
      finalMetrics.loudness.integratedLufs > MAX_FINAL_LUFS ||
      finalMetrics.loudness.truePeakDbtp > MAX_FINAL_TRUE_PEAK_DBTP
    ) {
      correctiveGainDb = Math.max(
        -3,
        Math.min(3, TARGET_LUFS - finalMetrics.loudness.integratedLufs),
      );
      await rm(partialPath, { force: true });
      await renderFinal(
        tempoPath,
        partialPath,
        trim.filter,
        normalizationInput,
        correctiveGainDb,
      );
      partialInfo = await requireFile(partialPath, `Corrected paced output ${job.relativePath}`);
      finalMetrics = await analyzeAudio(partialPath, job.wordCount);
    }
    validateFinal(finalMetrics, partialInfo);
    const outputHash = await fileSha256(partialPath);
    const warningResult = finalWarnings(job, pacing, finalMetrics);
    const completedAt = new Date().toISOString();
    const completedRecord = {
      ...record,
      status: "complete",
      source: {
        bytes: sourceInfo.size,
        generatorJournalHash: sourceEntry.generatorJournalHash,
        generatorReceiptHash: sourceEntry.generatorReceiptHash,
        hash: sourceHash,
        manifestHash: sourceSnapshot.hash,
        manifestPath: relative(PROJECT_ROOT, SOURCE_MANIFEST_PATH),
        manifestUpdatedAt: sourceSnapshot.updatedAt,
        model: SOURCE_MODEL,
        path: job.relativePath,
        planSha256: sourceSnapshot.planSha256,
        recordHash: sourceEntry.recordHash,
        voice: SOURCE_VOICE,
      },
      raw: roundedMetrics(sourceMetrics),
      pacing,
      afterTempo: roundedMetrics(afterTempoMetrics),
      silenceTrim: {
        detection: { minimumSeconds: SILENCE_MIN_SECONDS, noise: SILENCE_NOISE },
        pausePadding: {
          ...pausePadding,
          addedSeconds: Number(trim.addedSeconds.toFixed(3)),
        },
        removedSeconds: Number(trim.removedSeconds.toFixed(3)),
        removals: removals.map((range) => ({
          start: Number(range.start.toFixed(3)),
          end: Number(range.end.toFixed(3)),
          duration: Number((range.end - range.start).toFixed(3)),
          reason: range.reason,
        })),
        loudnessNormalization: {
          inputIntegratedLufs: Number(normalizationInput.integratedLufs.toFixed(2)),
          inputLoudnessRangeLu: Number(normalizationInput.loudnessRangeLu.toFixed(2)),
          inputThresholdLufs: Number(normalizationInput.thresholdLufs.toFixed(2)),
          inputTruePeakDbtp: Number(normalizationInput.truePeakDbtp.toFixed(2)),
          targetIntegratedLufs: TARGET_LUFS,
          targetOffsetLu: Number(normalizationInput.targetOffsetLu.toFixed(2)),
          targetTruePeakDbtp: ENCODE_TRUE_PEAK_DBTP,
          twoPass: true,
          correctiveGainDb,
          limiterLinearLimit: correctiveGainDb == null ? null : LIMITER_LINEAR_LIMIT,
        },
      },
      final: {
        ...roundedMetrics(finalMetrics),
        bytes: partialInfo.size,
        completedAt,
        hash: outputHash,
        relativePath: job.relativePath,
      },
      manualPacing: warningResult.manualPacing,
      warnings: warningResult.warnings,
      lastError: null,
    };
    await atomicWriteJson(receiptPathFor(job), {
      schemaVersion: SCHEMA_VERSION,
      transformVersion: TRANSFORM_VERSION,
      pacingPolicyVersion: PACING_POLICY_VERSION,
      source: {
        generatorJournalHash: sourceEntry.generatorJournalHash,
        generatorReceiptHash: sourceEntry.generatorReceiptHash,
        hash: sourceHash,
        manifestHash: sourceSnapshot.hash,
        manifestPath: relative(PROJECT_ROOT, SOURCE_MANIFEST_PATH),
        model: SOURCE_MODEL,
        planSha256: sourceSnapshot.planSha256,
        recordHash: sourceEntry.recordHash,
        voice: SOURCE_VOICE,
      },
      output: { bytes: partialInfo.size, hash: outputHash, relativePath: job.relativePath },
      record: completedRecord,
    });
    try {
      await link(partialPath, outputPath);
    } catch (error) {
      if (error?.code === "EEXIST") throw new Error(`Output appeared during processing: ${job.relativePath}`);
      throw error;
    }
    Object.assign(record, completedRecord);
    return "generated";
  } finally {
    await rm(tempoPath, { force: true });
    await rm(partialPath, { force: true });
  }
}

function quantile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const value = sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  return Number(value.toFixed(1));
}

function distribution(values) {
  if (!values.length) return null;
  return {
    min: quantile(values, 0),
    p25: quantile(values, 0.25),
    median: quantile(values, 0.5),
    p75: quantile(values, 0.75),
    p95: quantile(values, 0.95),
    max: quantile(values, 1),
  };
}

function printReport(manifest, runCounts) {
  const completed = manifest.clips.filter((clip) => clip.status === "complete");
  const rawContent = completed.map((clip) => clip.raw?.contentWpm).filter(Number.isFinite);
  const finalContent = completed.map((clip) => clip.final?.contentWpm).filter(Number.isFinite);
  const rawActive = completed.map((clip) => clip.raw?.activeWpm).filter(Number.isFinite);
  const finalActive = completed.map((clip) => clip.final?.activeWpm).filter(Number.isFinite);
  const tempos = completed.map((clip) => clip.pacing?.tempo).filter(Number.isFinite);
  const manual = completed.filter((clip) => clip.manualPacing);
  const otherWarnings = completed.filter(
    (clip) => !clip.manualPacing && clip.warnings?.length,
  );
  process.stdout.write(
    [
      "",
      "Aoede pacing report",
      `This run: generated=${runCounts.generated}, reused=${runCounts.reused}, failed=${runCounts.failed}`,
      `Checkpoint: complete=${completed.length}/${EXPECTED_TOTAL}, waiting=${manifest.clips.filter((clip) => clip.status !== "complete").length}`,
      `Raw content WPM: ${JSON.stringify(distribution(rawContent))}`,
      `Final content WPM: ${JSON.stringify(distribution(finalContent))}`,
      `Raw active WPM: ${JSON.stringify(distribution(rawActive))}`,
      `Final active WPM: ${JSON.stringify(distribution(finalActive))}`,
      `Tempo: ${JSON.stringify(distribution(tempos))}`,
      `Manual pacing review: ${manual.length}`,
      ...manual.map((clip) => `  - ${clip.id}: ${clip.warnings.join("; ")}`),
      `Other pause warnings: ${otherWarnings.length}`,
      ...otherWarnings.map((clip) => `  - ${clip.id}: ${clip.warnings.join("; ")}`),
      `Publish ready: ${manifest.publishReady ? "yes" : "no (requires 134/134 complete)"}`,
      "",
    ].join("\n"),
  );
}

async function verifyExisting(plan, sourceSnapshot, manifest) {
  let failures = 0;
  for (const job of plan) {
    const record = manifest.clips.find((clip) => clip.relativePath === job.relativePath);
    const sourceEntry = sourceSnapshot.entries.get(job.relativePath);
    if (!sourceEntry) {
      record.status = "waiting-for-source";
      continue;
    }
    try {
      await validateSource(job, sourceEntry);
      if (!(await recoverFromReceipt(job, record, sourceSnapshot, sourceEntry))) {
        record.status = "waiting-for-processing";
      }
    } catch (error) {
      failures += 1;
      record.status = "failed";
      record.lastError = error?.message || String(error);
    }
  }
  await saveOutputManifest(manifest, sourceSnapshot);
  printReport(manifest, { generated: 0, reused: 0, failed: failures });
  if (failures) process.exitCode = 1;
}

async function normalize(options, plan, sourceSnapshot, manifest) {
  const runCounts = { failed: 0, generated: 0, reused: 0 };
  let selected = 0;
  for (const [index, job] of plan.entries()) {
    const record = manifest.clips[index];
    const sourceEntry = sourceSnapshot.entries.get(job.relativePath);
    if (!sourceEntry) {
      if (record.status !== "complete") record.status = "waiting-for-source";
      continue;
    }
    if (record.status === "complete") continue;
    if (selected >= options.limit) continue;
    selected += 1;
    process.stdout.write(`[${selected}/${Math.min(sourceSnapshot.entries.size, options.limit)}] ${job.id}\n`);
    record.status = "processing";
    record.lastError = null;
    record.source = {
      generatorJournalHash: sourceEntry.generatorJournalHash,
      generatorReceiptHash: sourceEntry.generatorReceiptHash,
      hash: sourceEntry.fileHash,
      manifestHash: sourceSnapshot.hash,
      manifestPath: relative(PROJECT_ROOT, SOURCE_MANIFEST_PATH),
      model: SOURCE_MODEL,
      path: job.relativePath,
      planSha256: sourceSnapshot.planSha256,
      recordHash: sourceEntry.recordHash,
      voice: SOURCE_VOICE,
    };
    await saveOutputManifest(manifest, sourceSnapshot);
    try {
      const result = await normalizeOne(job, record, sourceSnapshot, sourceEntry);
      runCounts[result] += 1;
      process.stdout.write(
        `  ${result}: ${record.raw.contentWpm.toFixed(1)} -> ${record.final.contentWpm.toFixed(1)} content WPM, tempo ${record.pacing.tempo.toFixed(3)}${record.manualPacing ? " [manual review]" : ""}\n`,
      );
    } catch (error) {
      runCounts.failed += 1;
      record.status = "failed";
      record.lastError = error?.message || String(error);
      process.stderr.write(`  failed: ${record.lastError}\n`);
    }
    await saveOutputManifest(manifest, sourceSnapshot);
  }
  await saveOutputManifest(manifest, sourceSnapshot);
  printReport(manifest, runCounts);
  if (runCounts.failed) process.exitCode = 1;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const plan = buildPlan();
  const sourceSnapshot = await loadSourceSnapshot(plan);
  if (options.dryRun) {
    process.stdout.write(
      `Dry run: ${sourceSnapshot.entries.size}/${EXPECTED_TOTAL} source clips are complete; no output was written.\n`,
    );
    return;
  }
  await requireAudioTools();
  await ensureOutputRoots(options, sourceSnapshot);
  const manifest = await loadOutputManifest(plan, sourceSnapshot);
  if (options.verify) await verifyExisting(plan, sourceSnapshot, manifest);
  else await normalize(options, plan, sourceSnapshot, manifest);
}

main().catch((error) => {
  process.stderr.write(`Aoede pacing normalization stopped: ${error?.message || String(error)}\n`);
  process.exitCode = 1;
});
