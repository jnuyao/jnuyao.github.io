#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
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
  PRO_PACING_POLICY,
  PRO_PACING_POLICY_VERSION,
  PRO_PACING_SCHEMA_VERSION,
  PRO_PACING_TRANSFORM_VERSION,
  PRO_SOURCE_GENERATOR_VERSION,
  PRO_SOURCE_MODEL,
  PRO_SOURCE_VOICE,
  assertProBatchJournal,
  assertCompleteProSourceManifest,
  assertProGeneratorReceipt,
  pacedClipSourceMatches,
  pacedManifestMatchesProSource,
  proPacingPolicyMatches,
  proPacingSettingsMatch,
  proPausePaddingRecordMatches,
} from "./aoede-pro-contract.mjs";

const run = promisify(execFile);
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORK_ROOT = join(PROJECT_ROOT, "work");
const SOURCE_ROOT_RELATIVE = "work/pro-aoede-production";
const SOURCE_MANIFEST_RELATIVE = `${SOURCE_ROOT_RELATIVE}/manifest.json`;
const SOURCE_ROOT = join(PROJECT_ROOT, SOURCE_ROOT_RELATIVE);
const SOURCE_AUDIO_ROOT = join(SOURCE_ROOT, "audio");
const SOURCE_RECEIPT_ROOT = join(SOURCE_ROOT, ".receipts");
const SOURCE_BATCH_RUNS_ROOT = join(SOURCE_ROOT, "batch-runs");
const SOURCE_MANIFEST_PATH = join(PROJECT_ROOT, SOURCE_MANIFEST_RELATIVE);
const PACED_ROOT_RELATIVE = "work/aoede-paced-production";
const PACED_MANIFEST_RELATIVE = `${PACED_ROOT_RELATIVE}/manifest.json`;
const PACED_ROOT = join(WORK_ROOT, "aoede-paced-production");
const PACED_AUDIO_ROOT = join(PACED_ROOT, "audio");
const PACED_RECEIPT_ROOT = join(PACED_ROOT, ".receipts");
const PACED_MANIFEST_PATH = join(PACED_ROOT, "manifest.json");
const QA_ROOT = join(WORK_ROOT, "pro-aoede-transcript-qa");
const RECEIPT_ROOT = join(QA_ROOT, "receipts");
const ERROR_ROOT = join(QA_ROOT, "errors");
const QA_MANIFEST_PATH = join(QA_ROOT, "manifest.json");

const SCHEMA_VERSION = 2;
const VERIFIER_VERSION = "pro-aoede-transcript-qa-v2";
const MODEL_NAME = "gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;
const REQUEST_TIMEOUT_MS = 180_000;
const MAX_REQUEST_ATTEMPTS = 7;
const RETRY_BASE_MS = 2_000;
const RETRY_CAP_MS = 120_000;
const REQUEST_SPACING_MS = 1_000;
const MINIMUM_AUDIO_BYTES = 4 * 1_024;
const MAXIMUM_AUDIO_BYTES = 500 * 1_024;
const sensitiveValues = new Set();

const TRANSCRIPTION_PROMPT = [
  "Transcribe every audible English word in this short recording exactly once and in order.",
  "Preserve every repetition and contraction, including repeated sound words.",
  "For a non-lexical sound word, write the closest spelling you hear.",
  "Do not correct, summarize, explain, infer, omit, add, or reorder any word.",
  "Return JSON containing exactly one string field named transcript.",
].join(" ");
const TRANSCRIPTION_PROMPT_SHA256 = sha256(TRANSCRIPTION_PROMPT);

// These aliases cover spellings that can represent the same audible sound. Each
// alias still maps to exactly one comparison token, so a missing, added, or
// repeated sound remains a failure.
const SOUND_TOKEN_EQUIVALENCE_GROUPS = Object.freeze({
  "<long-engine-rumble>": ["br", "brr", "brrr", "brrrr", "brrrrr", "bur", "burr", "burrr"],
  "<engine-rev>": ["broom", "brroom", "brrroom", "brrrroom", "vroom", "vrooom"],
  "<whoosh>": ["whoosh", "woosh"],
  "<baby-cry>": ["wah", "waah", "waaah"],
  "<coo>": ["koo", "coo"],
  "<chee>": ["chee", "chi"],
  "<rotor-sound>": ["choppa", "chopper"],
  "<oo-sound>": ["oo", "ooh"],
  "<daah-sound>": ["daah", "dah"],
  "<aaah-sound>": ["aaah", "aah", "ah"],
});

// These are spelling/word-boundary normalizations, not permission to alter the
// spoken sequence. Hyphens and punctuation are ignored because they are not
// audible; contractions themselves are deliberately not expanded.
const PHRASE_SPELLING_EQUIVALENCES = Object.freeze({
  motorbike: "motor bike",
  coochie: "koo chee",
  coochy: "koo chee",
});

const COMPARISON_POLICY = Object.freeze({
  version: "ordered-english-tokens-v1",
  case: "ignored",
  punctuation: "ignored; hyphens form word boundaries",
  contractions: "must remain the same lexical token; no contraction expansion",
  phraseSpellingEquivalences: PHRASE_SPELLING_EQUIVALENCES,
  soundTokenEquivalenceGroups: SOUND_TOKEN_EQUIVALENCE_GROUPS,
  sequenceRule: "canonical token count and order must match exactly; no omission, addition, or repetition is allowed",
});
const COMPARISON_POLICY_SHA256 = sha256(stableJson(COMPARISON_POLICY));

const SOUND_TOKEN_ALIAS = new Map();
for (const [canonical, spellings] of Object.entries(SOUND_TOKEN_EQUIVALENCE_GROUPS)) {
  for (const spelling of spellings) {
    if (SOUND_TOKEN_ALIAS.has(spelling)) {
      throw new Error(`Duplicate sound-token alias in verifier policy: ${spelling}`);
    }
    SOUND_TOKEN_ALIAS.set(spelling, canonical);
  }
}

function usage() {
  return [
    "Independently transcribe the final paced Pro + Aoede MP3 set and compare it with its receipt-backed spokenText.",
    "",
    "Usage:",
    "  node scripts/verify-aoede-transcripts.mjs --limit N",
    "  node scripts/verify-aoede-transcripts.mjs",
    "  node scripts/verify-aoede-transcripts.mjs --verify [--limit N]",
    "",
    "Credentials for transcription runs:",
    "  GEMINI_API_KEY, or both GEMINI_KEY_PROJECT and GEMINI_KEY_NAME for private gcloud retrieval.",
    "  --verify is offline and never reads credentials or calls the network.",
    "",
    `Fixed audio input: ${PACED_ROOT}`,
    `Fixed Pro source:  ${SOURCE_MANIFEST_PATH}`,
    `Fixed QA output:   ${QA_ROOT}`,
    `Required contract: ${EXPECTED_TOTAL}/${EXPECTED_TOTAL} ${PRO_SOURCE_MODEL} + ${PRO_SOURCE_VOICE}, ${PRO_PACING_TRANSFORM_VERSION}`,
    `Pacing policy:     ${PRO_PACING_POLICY_VERSION}`,
    "The script never writes to either audio input or public/.",
  ].join("\n");
}

function positiveInteger(value, optionName) {
  if (!/^\d+$/.test(value || "") || Number(value) < 1) {
    throw new Error(`${optionName} requires a positive integer.`);
  }
  return Number(value);
}

function parseArguments(argv) {
  const options = {
    help: false,
    limit: Number.POSITIVE_INFINITY,
    verify: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--verify") options.verify = true;
    else if (argument === "--limit") options.limit = positiveInteger(argv[++index], "--limit");
    else if (argument.startsWith("--limit=")) {
      options.limit = positiveInteger(argument.slice("--limit=".length), "--limit");
    } else throw new Error(`Unknown option: ${argument}\n\n${usage()}`);
  }
  return options;
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

function safeMessage(value) {
  let result = String(value || "No error detail was returned.")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted Google API key]")
    .replace(/((?:key|token|secret)\s*[=:]\s*)[^\s,;]+/gi, "$1[redacted]");
  for (const secret of sensitiveValues) result = result.split(secret).join("[redacted]");
  return result.replace(/[\r\n]+/g, " ").slice(0, 500);
}

function isWithin(candidate, parent) {
  const fromParent = relative(parent, candidate);
  return (
    fromParent === "" ||
    (fromParent !== ".." && !fromParent.startsWith(`..${sep}`) && !isAbsolute(fromParent))
  );
}

function assertWithin(candidate, parent, label) {
  if (!isWithin(resolve(candidate), resolve(parent))) {
    throw new Error(`${label} escapes its approved root.`);
  }
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

async function readJsonFile(path, label) {
  const bytes = await readFile(path);
  try {
    return { bytes, value: JSON.parse(bytes.toString("utf8")) };
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

function normalizedAudioPath(value) {
  if (typeof value !== "string") return null;
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  return /^audio\/[a-z0-9-]+\/(?:\d{2}|listen|speak|read|write)\.mp3$/.test(normalized)
    ? normalized
    : null;
}

function validateJobId(value) {
  return typeof value === "string" && /^[a-z0-9-]+\/(?:\d{2}|listen|speak|read|write)$/.test(value);
}

function normalizedSourceReceiptPath(value, id) {
  if (typeof value !== "string") return null;
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  return normalized === `.receipts/${id}.json` ? normalized : null;
}

function wordCount(text) {
  return String(text).match(/[A-Za-z]+(?:[’'][A-Za-z]+)*/g)?.length || 0;
}

function buildBookPlan() {
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
    job.spokenTextSha256 = sha256(job.spokenText);
    job.displayTextSha256 = sha256(job.displayText);
    job.wordCount = wordCount(job.spokenText);
  }
  if (
    jobs.length !== EXPECTED_TOTAL ||
    new Set(jobs.map((job) => job.id)).size !== EXPECTED_TOTAL ||
    new Set(jobs.map((job) => job.relativePath)).size !== EXPECTED_TOTAL ||
    jobs.some((job) => !job.wordCount)
  ) {
    throw new Error(`Book data must produce exactly ${EXPECTED_TOTAL} unique non-empty jobs.`);
  }
  return jobs;
}

function assertProPlanFingerprint(sourceManifest) {
  const plan = sourceManifest.plan;
  const fingerprint = {
    generatorVersion: plan?.generatorVersion,
    sourceManifestSha256: plan?.sourceManifestSha256,
    sourcePlanSha256: plan?.sourcePlanSha256,
    model: plan?.model,
    voice: plan?.voice,
    promptVersion: plan?.promptVersion,
    promptTemplateHash: plan?.promptTemplateHash,
    audio: plan?.audio,
    jobs: plan?.jobs,
  };
  if (
    !Array.isArray(plan?.jobs) ||
    plan.jobs.length !== EXPECTED_TOTAL ||
    plan.sourceManifestSha256 !== sourceManifest?.source?.manifestSha256 ||
    plan.sourcePlanSha256 !== sourceManifest?.source?.planSha256 ||
    plan.promptVersion !== sourceManifest?.promptVersion ||
    plan.promptTemplateHash !== sourceManifest?.promptTemplateHash ||
    sha256(stableJson(fingerprint)) !== plan.planSha256
  ) {
    throw new Error("Pro source plan fingerprint is invalid or no longer matches its lineage.");
  }
}

function sourceRecordFor(
  planJob,
  sourceClip,
  generatorJournalSha256,
  generatorReceiptSha256,
  receiptRelativePath,
) {
  return {
    id: sourceClip.id,
    relativePath: planJob.relativePath,
    status: sourceClip.status,
    bytes: sourceClip.bytes,
    fileHash: sourceClip.fileHash,
    generatorJournalHash: generatorJournalSha256,
    generatorReceiptHash: generatorReceiptSha256,
    promptHash: sourceClip.promptHash,
    receiptPath: receiptRelativePath,
    requestHash: sourceClip.requestHash,
    spokenTextHash: sourceClip.spokenTextHash,
  };
}

function pacedReceiptRelativePath(id) {
  return `${PACED_ROOT_RELATIVE}/.receipts/${id}.json`;
}

function pacedReceiptPath(id) {
  const path = join(PACED_RECEIPT_ROOT, `${id}.json`);
  assertWithin(path, PACED_RECEIPT_ROOT, `${id} pacing receipt path`);
  return path;
}

function proSourceMatches(source, sourceEntry, sourceManifestSha256, sourcePlanSha256) {
  return pacedClipSourceMatches(source, {
    audioSha256: sourceEntry.audioSha256,
    sourceRecordSha256: sourceEntry.sourceRecordSha256,
    generatorReceiptSha256: sourceEntry.generatorReceiptSha256,
    generatorJournalSha256: sourceEntry.generatorJournalSha256,
    sourceManifestSha256,
    sourceManifestPath: SOURCE_MANIFEST_RELATIVE,
    sourcePlanSha256,
  });
}

function assertPacingReceipt({
  receipt,
  planJob,
  pacedClip,
  sourceEntry,
  sourceManifestSha256,
  sourcePlanSha256,
}) {
  const record = receipt?.record;
  const recordFieldsMatch = ["raw", "afterTempo", "silenceTrim", "warnings"]
    .every((key) => stableJson(record?.[key]) === stableJson(pacedClip?.[key]));
  if (
    receipt?.schemaVersion !== PRO_PACING_SCHEMA_VERSION ||
    receipt?.transformVersion !== PRO_PACING_TRANSFORM_VERSION ||
    receipt?.pacingPolicyVersion !== PRO_PACING_POLICY_VERSION ||
    !proSourceMatches(receipt?.source, sourceEntry, sourceManifestSha256, sourcePlanSha256) ||
    receipt?.output?.relativePath !== planJob.relativePath ||
    receipt?.output?.bytes !== pacedClip?.final?.bytes ||
    receipt?.output?.hash !== pacedClip?.final?.hash ||
    record?.id !== planJob.id ||
    record?.relativePath !== planJob.relativePath ||
    record?.kind !== planJob.kind ||
    record?.taskType !== planJob.taskType ||
    record?.spokenTextHash !== planJob.spokenTextSha256 ||
    record?.wordCount !== planJob.wordCount ||
    record?.status !== "complete" ||
    !proPacingSettingsMatch(record?.pacing, planJob) ||
    !proPausePaddingRecordMatches(record) ||
    stableJson(record?.pacing) !== stableJson(pacedClip?.pacing) ||
    !proSourceMatches(record?.source, sourceEntry, sourceManifestSha256, sourcePlanSha256) ||
    stableJson(record?.source) !== stableJson(pacedClip?.source) ||
    record?.final?.relativePath !== receipt.output.relativePath ||
    record?.final?.bytes !== receipt.output.bytes ||
    record?.final?.hash !== receipt.output.hash ||
    stableJson(record?.final) !== stableJson(pacedClip?.final) ||
    record?.manualPacing !== pacedClip?.manualPacing ||
    record?.lastError !== pacedClip?.lastError ||
    !recordFieldsMatch
  ) {
    throw new Error(`Pacing receipt does not strictly bind Pro source and paced output for ${planJob.id}.`);
  }
}

async function loadInputSnapshot() {
  await requireDirectory(PROJECT_ROOT, "Project root");
  await requireDirectory(WORK_ROOT, "Work root");
  await requireDirectory(SOURCE_ROOT, "Pro Aoede source root");
  await requireDirectory(SOURCE_AUDIO_ROOT, "Pro Aoede source audio root");
  await requireDirectory(SOURCE_RECEIPT_ROOT, "Pro Aoede source receipt root");
  await requireDirectory(SOURCE_BATCH_RUNS_ROOT, "Pro Aoede Batch journal root");
  await requireDirectory(PACED_ROOT, "Paced Aoede root");
  await requireDirectory(PACED_AUDIO_ROOT, "Paced audio root");
  await requireDirectory(PACED_RECEIPT_ROOT, "Paced receipt root");
  await requireFile(SOURCE_MANIFEST_PATH, "Pro Aoede source manifest");
  await requireFile(PACED_MANIFEST_PATH, "Paced Aoede manifest");

  const realProject = await realpath(PROJECT_ROOT);
  const realWork = await realpath(WORK_ROOT);
  const realSource = await realpath(SOURCE_ROOT);
  const realSourceAudio = await realpath(SOURCE_AUDIO_ROOT);
  const realSourceReceipts = await realpath(SOURCE_RECEIPT_ROOT);
  const realSourceBatchRuns = await realpath(SOURCE_BATCH_RUNS_ROOT);
  const realPaced = await realpath(PACED_ROOT);
  const realPacedAudio = await realpath(PACED_AUDIO_ROOT);
  const realPacedReceipts = await realpath(PACED_RECEIPT_ROOT);
  assertWithin(realWork, realProject, "Work root");
  assertWithin(realSource, realWork, "Pro Aoede source root");
  assertWithin(realSourceAudio, realSource, "Pro Aoede source audio root");
  assertWithin(realSourceReceipts, realSource, "Pro Aoede source receipt root");
  assertWithin(realSourceBatchRuns, realSource, "Pro Aoede Batch journal root");
  assertWithin(realPaced, realWork, "Paced Aoede root");
  assertWithin(realPacedAudio, realPaced, "Paced audio root");
  assertWithin(realPacedReceipts, realPaced, "Paced receipt root");
  assertWithin(await realpath(SOURCE_MANIFEST_PATH), realSource, "Pro Aoede source manifest");
  assertWithin(await realpath(PACED_MANIFEST_PATH), realPaced, "Paced Aoede manifest");

  const [sourceDocument, pacedDocument] = await Promise.all([
    readJsonFile(SOURCE_MANIFEST_PATH, "Pro Aoede source manifest"),
    readJsonFile(PACED_MANIFEST_PATH, "Paced Aoede manifest"),
  ]);
  const sourceManifest = sourceDocument.value;
  const pacedManifest = pacedDocument.value;
  const sourcePlanSha256 = assertCompleteProSourceManifest(sourceManifest);
  assertProPlanFingerprint(sourceManifest);
  const sourceManifestSha256 = sha256(sourceDocument.bytes);
  if (!pacedManifestMatchesProSource(pacedManifest, {
    sourceRoot: SOURCE_ROOT_RELATIVE,
    sourceManifestPath: SOURCE_MANIFEST_RELATIVE,
    sourcePlanSha256,
  })) {
    throw new Error("Paced manifest is legacy, non-Pro, or bound to a different Pro source plan.");
  }
  const pacedClips = pacedManifest.clips;
  if (
    pacedManifest.publishReady !== true ||
    !proPacingPolicyMatches(pacedManifest.pacingPolicy) ||
    !Array.isArray(pacedClips) ||
    pacedClips.length !== EXPECTED_TOTAL ||
    pacedClips.some((clip) => clip?.status !== "complete") ||
    pacedManifest?.summary?.total !== EXPECTED_TOTAL ||
    pacedManifest?.summary?.complete !== EXPECTED_TOTAL ||
    pacedManifest?.latestSourceManifest?.path !== SOURCE_MANIFEST_RELATIVE ||
    pacedManifest?.latestSourceManifest?.sha256 !== sourceManifestSha256 ||
    pacedManifest?.latestSourceManifest?.completedClips !== EXPECTED_TOTAL ||
    pacedManifest?.latestSourceManifest?.generatorVersion !== PRO_SOURCE_GENERATOR_VERSION ||
    pacedManifest?.latestSourceManifest?.model !== PRO_SOURCE_MODEL ||
    pacedManifest?.latestSourceManifest?.planSha256 !== sourcePlanSha256 ||
    pacedManifest?.latestSourceManifest?.voice !== PRO_SOURCE_VOICE
  ) {
    throw new Error(`Paced manifest must be publish-ready and contain ${EXPECTED_TOTAL}/${EXPECTED_TOTAL} receipt-backed Pro + Aoede clips.`);
  }

  const plan = buildBookPlan();
  const sourceEntries = new Map();
  for (const [index, planJob] of plan.entries()) {
    const sourceJob = sourceManifest.jobs[index];
    const sourceClip = sourceManifest.clips[index];
    const sourcePlanJob = sourceManifest.plan.jobs[index];
    const relativePath = normalizedAudioPath(sourceJob?.outputPath);
    if (
      !validateJobId(sourceJob?.id) ||
      sourceJob.id !== planJob.id ||
      sourceClip?.id !== planJob.id ||
      sourcePlanJob?.id !== planJob.id ||
      relativePath !== planJob.relativePath ||
      normalizedAudioPath(sourceClip?.relativePath) !== planJob.relativePath ||
      normalizedAudioPath(sourcePlanJob?.outputPath) !== planJob.relativePath ||
      sourceJob?.kind !== planJob.kind ||
      (sourceJob?.taskType ?? null) !== planJob.taskType ||
      sourceJob?.displayText !== planJob.displayText ||
      sourceJob?.spokenText !== planJob.spokenText ||
      sourceClip?.spokenText !== planJob.spokenText ||
      sourceJob?.displayTextSha256 !== planJob.displayTextSha256 ||
      sourceJob?.spokenTextSha256 !== planJob.spokenTextSha256 ||
      sourceClip?.spokenTextHash !== planJob.spokenTextSha256 ||
      sourcePlanJob?.displayTextSha256 !== planJob.displayTextSha256 ||
      sourcePlanJob?.spokenTextSha256 !== planJob.spokenTextSha256 ||
      sourceClip?.promptHash !== sourceJob?.promptSha256 ||
      sourceClip?.requestHash !== sourceJob?.requestSha256 ||
      sourcePlanJob?.promptSha256 !== sourceJob?.promptSha256 ||
      sourcePlanJob?.requestSha256 !== sourceJob?.requestSha256
    ) {
      throw new Error(`Pro source manifest, immutable plan, and book data disagree for ${planJob.id}.`);
    }
    if (
      !Number.isInteger(sourceClip.bytes) ||
      sourceClip.bytes < MINIMUM_AUDIO_BYTES ||
      sourceClip.bytes > MAXIMUM_AUDIO_BYTES ||
      sourceJob.bytes !== sourceClip.bytes ||
      !/^[a-f0-9]{64}$/.test(sourceClip.fileHash || "") ||
      sourceJob.audioSha256 !== sourceClip.fileHash ||
      sourceJob.fullDecodePassed !== true ||
      sourceClip.fullDecodePassed !== true
    ) {
      throw new Error(`Pro source audio metadata is invalid for ${planJob.id}.`);
    }
    const generatorReceiptRelativePath = normalizedSourceReceiptPath(sourceJob.receiptPath, planJob.id);
    if (!generatorReceiptRelativePath || sourceClip.receiptPath !== generatorReceiptRelativePath) {
      throw new Error(`Pro source generator receipt path is invalid for ${planJob.id}.`);
    }
    const generatorReceiptPath = join(SOURCE_ROOT, generatorReceiptRelativePath);
    assertWithin(generatorReceiptPath, SOURCE_RECEIPT_ROOT, `${planJob.id} generator receipt path`);
    await requireFile(generatorReceiptPath, `${planJob.id} generator receipt`);
    assertWithin(await realpath(generatorReceiptPath), realSourceReceipts, `${planJob.id} generator receipt`);
    const generatorReceiptDocument = await readJsonFile(generatorReceiptPath, `${planJob.id} generator receipt`);
    const generatorReceiptSha256 = sha256(generatorReceiptDocument.bytes);
    assertProGeneratorReceipt({
      receipt: generatorReceiptDocument.value,
      sourceJob,
      sourceClip,
      sourceManifest,
      receiptSha256: generatorReceiptSha256,
    });
    const generatorJournalName = `batch-${generatorReceiptDocument.value.batch.requestPlanSha256.slice(0, 20)}.json`;
    const generatorJournalPath = join(SOURCE_BATCH_RUNS_ROOT, generatorJournalName);
    assertWithin(generatorJournalPath, SOURCE_BATCH_RUNS_ROOT, `${planJob.id} Batch journal path`);
    await requireFile(generatorJournalPath, `${planJob.id} Batch journal`);
    assertWithin(await realpath(generatorJournalPath), realSourceBatchRuns, `${planJob.id} Batch journal`);
    const generatorJournalDocument = await readJsonFile(generatorJournalPath, `${planJob.id} Batch journal`);
    assertProBatchJournal({
      journal: generatorJournalDocument.value,
      receipt: generatorReceiptDocument.value,
      sourceJob,
      sourceManifest,
    });
    const generatorJournalSha256 = sha256(generatorJournalDocument.bytes);

    const sourceAudioPath = join(SOURCE_ROOT, planJob.relativePath);
    assertWithin(sourceAudioPath, SOURCE_AUDIO_ROOT, `${planJob.id} Pro source audio path`);
    const sourceAudioInfo = await requireFile(sourceAudioPath, `${planJob.id} Pro source audio`);
    assertWithin(await realpath(sourceAudioPath), realSourceAudio, `${planJob.id} Pro source audio`);
    const sourceAudioSha256 = sha256(await readFile(sourceAudioPath));
    if (sourceAudioInfo.size !== sourceClip.bytes || sourceAudioSha256 !== sourceClip.fileHash) {
      throw new Error(`Pro source audio does not match its generator receipt for ${planJob.id}.`);
    }
    const sourceRecord = sourceRecordFor(
      planJob,
      sourceClip,
      generatorJournalSha256,
      generatorReceiptSha256,
      generatorReceiptRelativePath,
    );
    sourceEntries.set(planJob.id, {
      audioSha256: sourceAudioSha256,
      generatorJournal: generatorJournalDocument.value,
      generatorJournalName,
      generatorJournalSha256,
      generatorReceipt: generatorReceiptDocument.value,
      generatorReceiptRelativePath,
      generatorReceiptSha256,
      sourceRecordSha256: sha256(stableJson(sourceRecord)),
    });
  }

  const pacedManifestSha256 = sha256(pacedDocument.bytes);
  const jobs = [];
  for (const [index, planJob] of plan.entries()) {
    const pacedClip = pacedClips[index];
    const sourceEntry = sourceEntries.get(planJob.id);
    const relativePath = normalizedAudioPath(pacedClip?.relativePath);
    if (
      pacedClip?.id !== planJob.id ||
      relativePath !== planJob.relativePath ||
      pacedClip?.kind !== planJob.kind ||
      (pacedClip?.taskType ?? null) !== planJob.taskType ||
      pacedClip?.spokenTextHash !== planJob.spokenTextSha256 ||
      pacedClip?.wordCount !== planJob.wordCount ||
      !proPacingSettingsMatch(pacedClip?.pacing, planJob) ||
      !proPausePaddingRecordMatches(pacedClip) ||
      !proSourceMatches(pacedClip?.source, sourceEntry, sourceManifestSha256, sourcePlanSha256) ||
      pacedClip?.source?.bytes !== sourceManifest.clips[index].bytes ||
      pacedClip?.source?.path !== planJob.relativePath ||
      pacedClip?.final?.relativePath !== planJob.relativePath ||
      !/^[a-f0-9]{64}$/.test(pacedClip?.final?.hash || "") ||
      !Number.isInteger(pacedClip?.final?.bytes) ||
      pacedClip.final.bytes < MINIMUM_AUDIO_BYTES ||
      pacedClip.final.bytes > MAXIMUM_AUDIO_BYTES
    ) {
      throw new Error(`Paced manifest has invalid Pro provenance or final metadata for ${planJob.id}.`);
    }

    const pacingReceiptPath = pacedReceiptPath(planJob.id);
    await requireFile(pacingReceiptPath, `${planJob.id} pacing receipt`);
    assertWithin(await realpath(pacingReceiptPath), realPacedReceipts, `${planJob.id} pacing receipt`);
    const pacingReceiptDocument = await readJsonFile(pacingReceiptPath, `${planJob.id} pacing receipt`);
    assertPacingReceipt({
      receipt: pacingReceiptDocument.value,
      planJob,
      pacedClip,
      sourceEntry,
      sourceManifestSha256,
      sourcePlanSha256,
    });

    const pacedAudioPath = join(PACED_ROOT, planJob.relativePath);
    assertWithin(pacedAudioPath, PACED_AUDIO_ROOT, `${planJob.id} paced audio path`);
    const pacedAudioInfo = await requireFile(pacedAudioPath, `${planJob.id} paced audio`);
    assertWithin(await realpath(pacedAudioPath), realPacedAudio, `${planJob.id} paced audio`);
    const pacedAudioSha256 = sha256(await readFile(pacedAudioPath));
    if (pacedAudioInfo.size !== pacedClip.final.bytes || pacedAudioSha256 !== pacedClip.final.hash) {
      throw new Error(`Paced audio does not match its pacing receipt for ${planJob.id}.`);
    }

    const generatorReceipt = sourceEntry.generatorReceipt;
    const provenance = {
      source: {
        generatorVersion: PRO_SOURCE_GENERATOR_VERSION,
        model: PRO_SOURCE_MODEL,
        voice: PRO_SOURCE_VOICE,
        manifestPath: SOURCE_MANIFEST_RELATIVE,
        manifestSha256: sourceManifestSha256,
        planSha256: sourcePlanSha256,
        upstreamManifestSha256: sourceManifest.source.manifestSha256,
        upstreamPlanSha256: sourceManifest.source.planSha256,
        audioSha256: sourceEntry.audioSha256,
        recordSha256: sourceEntry.sourceRecordSha256,
        receiptPath: `${SOURCE_ROOT_RELATIVE}/${sourceEntry.generatorReceiptRelativePath}`,
        receiptSha256: sourceEntry.generatorReceiptSha256,
        journalPath: `${SOURCE_ROOT_RELATIVE}/batch-runs/${sourceEntry.generatorJournalName}`,
        journalSha256: sourceEntry.generatorJournalSha256,
        batchName: generatorReceipt.batch.name,
        batchRequestPlanSha256: generatorReceipt.batch.requestPlanSha256,
        batchMapping: generatorReceipt.batch.mapping,
        responseId: generatorReceipt.modelResponse.responseId,
      },
      pacing: {
        schemaVersion: PRO_PACING_SCHEMA_VERSION,
        transformVersion: PRO_PACING_TRANSFORM_VERSION,
        policyVersion: PRO_PACING_POLICY_VERSION,
        policySha256: sha256(stableJson(PRO_PACING_POLICY)),
        manifestPath: PACED_MANIFEST_RELATIVE,
        sourceIdentitySha256: sha256(stableJson(pacedManifest.sourceIdentity)),
        receiptPath: pacedReceiptRelativePath(planJob.id),
        receiptSha256: sha256(pacingReceiptDocument.bytes),
      },
    };
    jobs.push({
      id: planJob.id,
      relativePath: planJob.relativePath,
      kind: planJob.kind,
      taskType: planJob.taskType,
      spokenText: planJob.spokenText,
      spokenTextSha256: planJob.spokenTextSha256,
      expectedAudioSha256: pacedClip.final.hash,
      expectedAudioBytes: pacedClip.final.bytes,
      provenance,
      provenanceSha256: sha256(stableJson(provenance)),
    });
  }

  if (jobs.length !== EXPECTED_TOTAL) {
    throw new Error(`Input snapshot must contain exactly ${EXPECTED_TOTAL} fully verified Pro + Aoede jobs.`);
  }
  return {
    jobs,
    sourceManifestSha256,
    sourcePlanSha256,
    pacedManifestSha256,
    realPacedAudio,
  };
}

async function loadAudio(job, realPacedAudio) {
  const path = join(PACED_ROOT, job.relativePath);
  assertWithin(path, PACED_AUDIO_ROOT, `${job.id} audio path`);
  await requireFile(path, `${job.id} paced audio`);
  const realPath = await realpath(path);
  assertWithin(realPath, realPacedAudio, `${job.id} paced audio`);
  const audio = await readFile(path);
  const audioSha256 = sha256(audio);
  if (audio.length !== job.expectedAudioBytes || audioSha256 !== job.expectedAudioSha256) {
    throw new Error(`${job.id} audio does not match its paced-manifest hash and byte count.`);
  }
  return { audio, audioSha256, bytes: audio.length };
}

function applyPhraseSpellingEquivalences(text) {
  let normalized = text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’]/g, "'");
  for (const [from, to] of Object.entries(PHRASE_SPELLING_EQUIVALENCES)) {
    normalized = normalized.replace(new RegExp(`\\b${from}\\b`, "g"), to);
  }
  return normalized;
}

function lexicalTokens(text) {
  return applyPhraseSpellingEquivalences(String(text)).match(/[a-z]+(?:'[a-z]+)*/g) || [];
}

function canonicalToken(token) {
  return SOUND_TOKEN_ALIAS.get(token) || token;
}

function comparisonFor(expectedText, transcript) {
  const expectedTokens = lexicalTokens(expectedText);
  const actualTokens = lexicalTokens(transcript);
  const expectedCanonicalTokens = expectedTokens.map(canonicalToken);
  const actualCanonicalTokens = actualTokens.map(canonicalToken);
  const maximum = Math.max(expectedCanonicalTokens.length, actualCanonicalTokens.length);
  let firstDifference = null;
  for (let index = 0; index < maximum; index += 1) {
    if (expectedCanonicalTokens[index] !== actualCanonicalTokens[index]) {
      firstDifference = {
        position: index + 1,
        expected: expectedTokens[index] ?? "<end>",
        actual: actualTokens[index] ?? "<end>",
        expectedCanonical: expectedCanonicalTokens[index] ?? "<end>",
        actualCanonical: actualCanonicalTokens[index] ?? "<end>",
        expectedContext: expectedTokens.slice(Math.max(0, index - 3), index + 4),
        actualContext: actualTokens.slice(Math.max(0, index - 3), index + 4),
      };
      break;
    }
  }
  const match = firstDifference === null;
  return {
    status: match ? "pass" : "fail",
    match,
    policySha256: COMPARISON_POLICY_SHA256,
    expectedTokenCount: expectedTokens.length,
    actualTokenCount: actualTokens.length,
    expectedTokens,
    actualTokens,
    expectedCanonicalTokensSha256: sha256(JSON.stringify(expectedCanonicalTokens)),
    actualCanonicalTokensSha256: sha256(JSON.stringify(actualCanonicalTokens)),
    firstDifference,
  };
}

function assertComparisonPolicy() {
  const shouldPass = [
    ["brrrr, brrrr", "burr, brrr"],
    ["brrroom, brrroom", "vroom, broom"],
    ["koo chee", "coochie"],
    ["my motor bike", "my motorbike"],
    ["wah! wah!", "waah, waaah"],
  ];
  const shouldFail = [
    ["brrrr, brrrr", "brrrr"],
    ["brrroom", "vroom vroom"],
    ["Roar! Roar! Whoosh!", "Roar! Whoosh! Roar!"],
    ["I've been home", "I have been home"],
  ];
  for (const [expected, actual] of shouldPass) {
    if (!comparisonFor(expected, actual).match) {
      throw new Error(`Internal comparison policy rejected an approved spelling equivalence.`);
    }
  }
  for (const [expected, actual] of shouldFail) {
    if (comparisonFor(expected, actual).match) {
      throw new Error(`Internal comparison policy accepted an omitted, added, reordered, or expanded token.`);
    }
  }
}

function receiptPath(root, job) {
  const [bookSlug, clipName] = job.id.split("/");
  const path = join(root, bookSlug, `${clipName}.json`);
  assertWithin(path, root, `${job.id} receipt path`);
  return path;
}

async function readOptionalJson(path) {
  let info;
  try {
    info = await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") return { exists: false, bytes: null, value: null, invalid: false };
    throw error;
  }
  if (info.isSymbolicLink() || !info.isFile()) {
    return { exists: true, bytes: null, value: null, invalid: true };
  }
  try {
    const bytes = await readFile(path);
    return { exists: true, bytes, value: JSON.parse(bytes.toString("utf8")), invalid: false };
  } catch (error) {
    if (error instanceof SyntaxError) return { exists: true, bytes: null, value: null, invalid: true };
    throw error;
  }
}

function inspectReceipt(receiptDocument, job, audioIdentity) {
  if (!receiptDocument.exists) return { state: "missing", reason: "no cached receipt" };
  if (receiptDocument.invalid || !receiptDocument.value || typeof receiptDocument.value !== "object") {
    return { state: "stale", reason: "cached receipt is not valid JSON" };
  }
  const receipt = receiptDocument.value;
  if (
    receipt.schemaVersion !== SCHEMA_VERSION ||
    receipt.verifierVersion !== VERIFIER_VERSION ||
    receipt.model !== MODEL_NAME ||
    receipt?.request?.temperature !== 0 ||
    receipt?.request?.responseMimeType !== "application/json" ||
    receipt?.request?.promptSha256 !== TRANSCRIPTION_PROMPT_SHA256 ||
    receipt?.comparison?.policySha256 !== COMPARISON_POLICY_SHA256
  ) {
    return { state: "stale", reason: "verifier, model, prompt, or comparison policy changed" };
  }
  if (
    receipt?.job?.id !== job.id ||
    receipt?.job?.relativePath !== job.relativePath ||
    receipt?.input?.spokenText !== job.spokenText ||
    receipt?.input?.spokenTextSha256 !== job.spokenTextSha256 ||
    receipt?.input?.audioSha256 !== audioIdentity.audioSha256 ||
    receipt?.input?.audioBytes !== audioIdentity.bytes ||
    receipt?.input?.provenanceSha256 !== job.provenanceSha256 ||
    stableJson(receipt?.input?.provenance) !== stableJson(job.provenance) ||
    receipt?.input?.provenanceSha256 !== sha256(stableJson(receipt?.input?.provenance))
  ) {
    return { state: "stale", reason: "cached text, audio, Pro source, or pacing provenance changed" };
  }
  const transcript = receipt?.transcription?.transcript;
  if (
    typeof transcript !== "string" ||
    !transcript.trim() ||
    receipt?.transcription?.transcriptSha256 !== sha256(transcript)
  ) {
    return { state: "stale", reason: "cached transcript or transcript hash is invalid" };
  }
  const expectedComparison = comparisonFor(job.spokenText, transcript);
  if (stableJson(receipt.comparison) !== stableJson(expectedComparison)) {
    return { state: "stale", reason: "cached comparison does not reproduce exactly" };
  }
  return { state: expectedComparison.status, receipt, comparison: expectedComparison };
}

async function prepareQaOutput(jobs) {
  if (!(await pathExists(QA_ROOT))) await mkdir(QA_ROOT, { mode: 0o700 });
  await requireDirectory(QA_ROOT, "Transcript QA root");
  const realWork = await realpath(WORK_ROOT);
  const realQa = await realpath(QA_ROOT);
  assertWithin(realQa, realWork, "Transcript QA root");

  for (const root of [RECEIPT_ROOT, ERROR_ROOT]) {
    if (!(await pathExists(root))) await mkdir(root, { mode: 0o700 });
    await requireDirectory(root, "Transcript QA cache directory");
    assertWithin(await realpath(root), realQa, "Transcript QA cache directory");
  }
  const bookSlugs = new Set(jobs.map((job) => job.id.split("/")[0]));
  for (const bookSlug of bookSlugs) {
    for (const root of [RECEIPT_ROOT, ERROR_ROOT]) {
      const directory = join(root, bookSlug);
      if (!(await pathExists(directory))) await mkdir(directory, { mode: 0o700 });
      await requireDirectory(directory, "Transcript QA book cache directory");
      assertWithin(await realpath(directory), realQa, "Transcript QA book cache directory");
    }
  }
}

async function validateQaCacheForRead(jobs) {
  if (!(await pathExists(QA_ROOT))) return;
  await requireDirectory(QA_ROOT, "Transcript QA root");
  const realWork = await realpath(WORK_ROOT);
  const realQa = await realpath(QA_ROOT);
  assertWithin(realQa, realWork, "Transcript QA root");
  if (!(await pathExists(RECEIPT_ROOT))) return;
  await requireDirectory(RECEIPT_ROOT, "Transcript QA receipt directory");
  assertWithin(await realpath(RECEIPT_ROOT), realQa, "Transcript QA receipt directory");
  const bookSlugs = new Set(jobs.map((job) => job.id.split("/")[0]));
  for (const bookSlug of bookSlugs) {
    const directory = join(RECEIPT_ROOT, bookSlug);
    if (!(await pathExists(directory))) continue;
    await requireDirectory(directory, "Transcript QA book receipt directory");
    assertWithin(await realpath(directory), realQa, "Transcript QA book receipt directory");
  }
}

async function atomicWriteJson(path, value) {
  assertWithin(path, QA_ROOT, "Transcript QA output");
  const parent = dirname(path);
  await requireDirectory(parent, "Transcript QA output directory");
  const temporaryPath = `${path}.tmp-${process.pid}-${randomUUID()}`;
  assertWithin(temporaryPath, QA_ROOT, "Transcript QA temporary output");
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

async function removeQaFile(path) {
  assertWithin(path, QA_ROOT, "Transcript QA cached error");
  await rm(path, { force: true });
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
    throw new Error(
      "Set GEMINI_API_KEY, or set both GEMINI_KEY_PROJECT and GEMINI_KEY_NAME for private gcloud retrieval.",
    );
  }
  let stdout;
  try {
    ({ stdout } = await run(
      "gcloud",
      [
        "services",
        "api-keys",
        "get-key-string",
        keyName,
        "--project",
        project,
        "--format=value(keyString)",
        "--quiet",
      ],
      { encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 },
    ));
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error("gcloud is not installed or is not on PATH.");
    throw new Error("gcloud could not retrieve the configured API key; no credential detail was logged.");
  }
  const apiKey = stdout.trim();
  if (!apiKey || /\s/.test(apiKey) || apiKey.length < 20) {
    throw new Error("gcloud returned an invalid API key value.");
  }
  sensitiveValues.add(apiKey);
  return apiKey;
}

function requestBody(audio) {
  return {
    contents: [{
      parts: [
        { text: TRANSCRIPTION_PROMPT },
        { inlineData: { mimeType: "audio/mpeg", data: audio.toString("base64") } },
      ],
    }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: { transcript: { type: "STRING" } },
        required: ["transcript"],
      },
    },
  };
}

function retryAfterMilliseconds(response, payload, attempt) {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  const details = Array.isArray(payload?.error?.details) ? payload.error.details : [];
  const retryDelay = details.find((detail) => typeof detail?.retryDelay === "string")?.retryDelay;
  const detailSeconds = Number(retryDelay?.match(/^([\d.]+)s$/)?.[1]);
  if (Number.isFinite(detailSeconds)) return Math.ceil(detailSeconds * 1000);
  const messageSeconds = Number(payload?.error?.message?.match(/retry(?:\s+in|Delay[^\d]*)\s*([\d.]+)s/i)?.[1]);
  if (Number.isFinite(messageSeconds)) return Math.ceil(messageSeconds * 1000);
  const exponential = Math.min(RETRY_CAP_MS, RETRY_BASE_MS * (2 ** (attempt - 1)));
  return exponential + Math.floor(Math.random() * Math.min(1_000, exponential / 4));
}

class TranscriptionRequestError extends Error {
  constructor(message, { retryable = false, retryAfterMs = 0, status = null } = {}) {
    super(message);
    this.name = "TranscriptionRequestError";
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
    this.status = status;
  }
}

async function requestTranscriptionOnce(apiKey, audio, attempt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody(audio)),
      signal: controller.signal,
    });
  } catch (error) {
    const reason = error?.name === "AbortError" ? "request timed out" : safeMessage(error?.message);
    throw new TranscriptionRequestError(`Transcription network error: ${reason}`, {
      retryable: true,
      retryAfterMs: Math.min(RETRY_CAP_MS, RETRY_BASE_MS * (2 ** (attempt - 1))),
    });
  } finally {
    clearTimeout(timeout);
  }

  let responseText;
  try {
    responseText = await response.text();
  } catch (error) {
    throw new TranscriptionRequestError(`Could not read Gemini's API response: ${safeMessage(error?.message)}`, {
      retryable: true,
      retryAfterMs: retryAfterMilliseconds(response, null, attempt),
      status: response.status,
    });
  }
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    throw new TranscriptionRequestError("Gemini returned a non-JSON API response.", {
      retryable: response.ok || response.status === 408 || response.status === 429 || response.status >= 500,
      retryAfterMs: retryAfterMilliseconds(response, null, attempt),
      status: response.status,
    });
  }

  if (!response.ok) {
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    throw new TranscriptionRequestError(
      `Gemini transcription failed (${response.status} ${safeMessage(payload?.error?.status)}): ${safeMessage(payload?.error?.message)}`,
      {
        retryable,
        retryAfterMs: retryAfterMilliseconds(response, payload, attempt),
        status: response.status,
      },
    );
  }

  const textPart = payload?.candidates?.[0]?.content?.parts?.find((part) => typeof part?.text === "string")?.text;
  if (typeof textPart !== "string") {
    const reason = payload?.promptFeedback?.blockReason || payload?.candidates?.[0]?.finishReason || "no text part";
    throw new TranscriptionRequestError(`Gemini returned no transcript (${safeMessage(reason)}).`, {
      retryable: true,
      retryAfterMs: retryAfterMilliseconds(response, payload, attempt),
      status: response.status,
    });
  }
  let parsed;
  try {
    parsed = JSON.parse(textPart);
  } catch {
    throw new TranscriptionRequestError("Gemini transcript payload was not valid JSON.", {
      retryable: true,
      retryAfterMs: retryAfterMilliseconds(response, payload, attempt),
      status: response.status,
    });
  }
  if (typeof parsed?.transcript !== "string" || !parsed.transcript.trim()) {
    throw new TranscriptionRequestError("Gemini transcript JSON did not contain a non-empty transcript string.", {
      retryable: true,
      retryAfterMs: retryAfterMilliseconds(response, payload, attempt),
      status: response.status,
    });
  }
  return parsed.transcript.trim();
}

function wait(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function transcribeWithRetry(apiKey, audio, jobId) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
    try {
      return { transcript: await requestTranscriptionOnce(apiKey, audio, attempt), attempts: attempt };
    } catch (error) {
      lastError = error;
      if (!(error instanceof TranscriptionRequestError) || !error.retryable || attempt === MAX_REQUEST_ATTEMPTS) {
        throw error;
      }
      const delay = Math.max(250, Math.min(RETRY_CAP_MS, error.retryAfterMs || RETRY_BASE_MS));
      process.stdout.write(
        `[retry ${attempt}/${MAX_REQUEST_ATTEMPTS}] ${jobId}: ${safeMessage(error.message)}; waiting ${(delay / 1000).toFixed(1)}s\n`,
      );
      await wait(delay);
    }
  }
  throw lastError || new Error("Transcription retry loop ended unexpectedly.");
}

function makeReceipt(job, audioIdentity, transcript, requestAttempts) {
  return {
    schemaVersion: SCHEMA_VERSION,
    verifierVersion: VERIFIER_VERSION,
    completedAt: new Date().toISOString(),
    model: MODEL_NAME,
    request: {
      temperature: 0,
      responseMimeType: "application/json",
      promptSha256: TRANSCRIPTION_PROMPT_SHA256,
      attempts: requestAttempts,
    },
    job: {
      id: job.id,
      relativePath: job.relativePath,
      kind: job.kind,
      taskType: job.taskType,
    },
    input: {
      spokenText: job.spokenText,
      spokenTextSha256: job.spokenTextSha256,
      audioSha256: audioIdentity.audioSha256,
      audioBytes: audioIdentity.bytes,
      provenance: job.provenance,
      provenanceSha256: job.provenanceSha256,
    },
    transcription: {
      transcript,
      transcriptSha256: sha256(transcript),
    },
    comparison: comparisonFor(job.spokenText, transcript),
  };
}

async function makeErrorRecord(job, audioIdentity, error) {
  const path = receiptPath(ERROR_ROOT, job);
  const previous = await readOptionalJson(path);
  const sameInput =
    previous?.value?.job?.id === job.id &&
    previous?.value?.input?.spokenTextSha256 === job.spokenTextSha256 &&
    previous?.value?.input?.audioSha256 === audioIdentity.audioSha256 &&
    previous?.value?.input?.provenanceSha256 === job.provenanceSha256;
  return {
    schemaVersion: SCHEMA_VERSION,
    verifierVersion: VERIFIER_VERSION,
    updatedAt: new Date().toISOString(),
    model: MODEL_NAME,
    job: { id: job.id, relativePath: job.relativePath },
    input: {
      spokenTextSha256: job.spokenTextSha256,
      audioSha256: audioIdentity.audioSha256,
      audioBytes: audioIdentity.bytes,
      provenance: job.provenance,
      provenanceSha256: job.provenanceSha256,
    },
    failedRuns: sameInput && Number.isInteger(previous.value.failedRuns) ? previous.value.failedRuns + 1 : 1,
    retryableOnNextRun: true,
    lastError: safeMessage(error?.message),
  };
}

async function verifyCachedReceipts(snapshot, selectedJobs) {
  await validateQaCacheForRead(selectedJobs);
  const counts = { pass: 0, fail: 0, missing: 0, stale: 0 };
  const results = [];
  for (const [index, job] of selectedJobs.entries()) {
    const audioIdentity = await loadAudio(job, snapshot.realPacedAudio);
    const inspection = inspectReceipt(
      await readOptionalJson(receiptPath(RECEIPT_ROOT, job)),
      job,
      audioIdentity,
    );
    counts[inspection.state] += 1;
    results.push({ id: job.id, status: inspection.state, reason: inspection.reason ?? null });
    const suffix = inspection.state === "fail"
      ? ` at token ${inspection.comparison.firstDifference?.position ?? "?"}`
      : inspection.reason ? ` (${inspection.reason})` : "";
    process.stdout.write(
      `[${index + 1}/${selectedJobs.length}] VERIFY ${inspection.state.toUpperCase()} ${job.id}${suffix}\n`,
    );
  }
  process.stdout.write(
    `Offline verification: ${counts.pass} pass, ${counts.fail} fail, ${counts.missing} missing, ${counts.stale} stale.\n`,
  );
  if (counts.fail || counts.missing || counts.stale) process.exitCode = 1;
  return results;
}

async function runTranscription(snapshot, selectedJobs, options) {
  await prepareQaOutput(selectedJobs);
  const runStartedAt = new Date().toISOString();
  const results = [];
  const counts = { cached: 0, submitted: 0, pass: 0, fail: 0, error: 0 };
  let apiKey = null;
  let previousSubmissionAt = 0;

  for (const [index, job] of selectedJobs.entries()) {
    const audioIdentity = await loadAudio(job, snapshot.realPacedAudio);
    const cached = inspectReceipt(
      await readOptionalJson(receiptPath(RECEIPT_ROOT, job)),
      job,
      audioIdentity,
    );
    if (cached.state === "pass" || cached.state === "fail") {
      counts.cached += 1;
      counts[cached.state] += 1;
      results.push({ id: job.id, status: cached.state, source: "cache" });
      const suffix = cached.state === "fail"
        ? ` at token ${cached.comparison.firstDifference?.position ?? "?"}`
        : "";
      process.stdout.write(
        `[${index + 1}/${selectedJobs.length}] CACHE ${cached.state.toUpperCase()} ${job.id}${suffix}\n`,
      );
      continue;
    }

    if (!apiKey) apiKey = await getApiKey();
    const spacing = REQUEST_SPACING_MS - (Date.now() - previousSubmissionAt);
    if (previousSubmissionAt && spacing > 0) await wait(spacing);
    counts.submitted += 1;
    previousSubmissionAt = Date.now();
    try {
      const { transcript, attempts } = await transcribeWithRetry(apiKey, audioIdentity.audio, job.id);
      const receipt = makeReceipt(job, audioIdentity, transcript, attempts);
      await atomicWriteJson(receiptPath(RECEIPT_ROOT, job), receipt);
      await removeQaFile(receiptPath(ERROR_ROOT, job));
      counts[receipt.comparison.status] += 1;
      results.push({
        id: job.id,
        status: receipt.comparison.status,
        source: "api",
        firstDifference: receipt.comparison.firstDifference,
      });
      const suffix = receipt.comparison.match
        ? ""
        : ` at token ${receipt.comparison.firstDifference?.position ?? "?"}`;
      process.stdout.write(
        `[${index + 1}/${selectedJobs.length}] ${receipt.comparison.status.toUpperCase()} ${job.id}${suffix}\n`,
      );
    } catch (error) {
      counts.error += 1;
      const errorRecord = await makeErrorRecord(job, audioIdentity, error);
      await atomicWriteJson(receiptPath(ERROR_ROOT, job), errorRecord);
      results.push({ id: job.id, status: "error", source: "api", error: errorRecord.lastError });
      process.stderr.write(`[${index + 1}/${selectedJobs.length}] ERROR ${job.id}: ${errorRecord.lastError}\n`);
      if (error instanceof TranscriptionRequestError && [401, 403].includes(error.status)) break;
    }
  }

  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    verifierVersion: VERIFIER_VERSION,
    createdAt: runStartedAt,
    updatedAt: new Date().toISOString(),
    model: MODEL_NAME,
    input: {
      sourceGeneratorVersion: PRO_SOURCE_GENERATOR_VERSION,
      sourceModel: PRO_SOURCE_MODEL,
      sourceVoice: PRO_SOURCE_VOICE,
      sourceManifestPath: SOURCE_MANIFEST_RELATIVE,
      sourceManifestSha256: snapshot.sourceManifestSha256,
      sourcePlanSha256: snapshot.sourcePlanSha256,
      pacedSchemaVersion: PRO_PACING_SCHEMA_VERSION,
      pacedTransformVersion: PRO_PACING_TRANSFORM_VERSION,
      pacedPolicyVersion: PRO_PACING_POLICY_VERSION,
      pacedPolicySha256: sha256(stableJson(PRO_PACING_POLICY)),
      pacedManifestPath: PACED_MANIFEST_RELATIVE,
      pacedManifestSha256: snapshot.pacedManifestSha256,
      verifiedCompleteClips: snapshot.jobs.length,
    },
    request: {
      temperature: 0,
      responseMimeType: "application/json",
      promptSha256: TRANSCRIPTION_PROMPT_SHA256,
    },
    comparisonPolicy: COMPARISON_POLICY,
    comparisonPolicySha256: COMPARISON_POLICY_SHA256,
    run: {
      requestedLimit: Number.isFinite(options.limit) ? options.limit : null,
      selectedClips: selectedJobs.length,
      ...counts,
    },
    results,
  };
  await atomicWriteJson(QA_MANIFEST_PATH, manifest);
  process.stdout.write(
    `Transcript QA: ${counts.pass} pass, ${counts.fail} fail, ${counts.error} error; ${counts.cached} cached, ${counts.submitted} submitted.\n`,
  );
  if (counts.fail || counts.error || results.length !== selectedJobs.length) process.exitCode = 1;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  assertComparisonPolicy();
  const snapshot = await loadInputSnapshot();
  const selectedJobs = snapshot.jobs.slice(0, options.limit);
  if (!selectedJobs.length) throw new Error("No verified paced Pro + Aoede clips are available.");
  process.stdout.write(
    `Input snapshot: ${snapshot.jobs.length}/${EXPECTED_TOTAL} paced Pro + Aoede clips receipt-verified; selected ${selectedJobs.length}.\n`,
  );
  if (options.verify) await verifyCachedReceipts(snapshot, selectedJobs);
  else await runTranscription(snapshot, selectedJobs, options);
}

main().catch((error) => {
  process.stderr.write(`Aoede transcript QA failed: ${safeMessage(error?.message)}\n`);
  process.exitCode = 1;
});
