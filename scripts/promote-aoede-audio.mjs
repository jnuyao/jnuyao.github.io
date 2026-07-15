#!/usr/bin/env node

import { execFile } from "node:child_process";
import { constants as fsConstants, createReadStream } from "node:fs";
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { BOOKS } from "../app/book-data.ts";
import {
  PRO_EXPECTED_TOTAL as EXPECTED_TOTAL,
  PRO_PACING_POLICY_VERSION as EXPECTED_PACING_POLICY_VERSION,
  PRO_PACING_SCHEMA_VERSION as EXPECTED_PACING_SCHEMA_VERSION,
  PRO_PACING_TRANSFORM_VERSION as EXPECTED_TRANSFORM_VERSION,
  PRO_SOURCE_GENERATOR_VERSION as EXPECTED_SOURCE_GENERATOR_VERSION,
  PRO_SOURCE_MODEL as EXPECTED_SOURCE_MODEL,
  PRO_SOURCE_VOICE as EXPECTED_SOURCE_VOICE,
  assertProBatchJournal,
  assertCompleteProSourceManifest,
  assertProGeneratorReceipt,
  proPacingPolicyMatches,
  proPausePaddingRecordMatches,
  proPacingSettingsMatch,
} from "./aoede-pro-contract.mjs";

const run = promisify(execFile);
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STAGING_ROOT = join(PROJECT_ROOT, "work", "aoede-paced-production");
const STAGING_AUDIO_ROOT = join(STAGING_ROOT, "audio");
const MANIFEST_PATH = join(STAGING_ROOT, "manifest.json");
const RECEIPT_ROOT = join(STAGING_ROOT, ".receipts");
const SOURCE_ROOT = join(PROJECT_ROOT, "work", "pro-aoede-production");
const SOURCE_MANIFEST_PATH = join(SOURCE_ROOT, "manifest.json");
const SOURCE_AUDIO_ROOT = join(SOURCE_ROOT, "audio");
const SOURCE_RECEIPT_ROOT = join(SOURCE_ROOT, ".receipts");
const SOURCE_BATCH_RUNS_ROOT = join(SOURCE_ROOT, "batch-runs");
const PUBLIC_ROOT = join(PROJECT_ROOT, "public");
const PUBLIC_AUDIO_ROOT = join(PUBLIC_ROOT, "audio");
const PUBLIC_STANDARD_AUDIO_ROOT = join(PUBLIC_ROOT, "audio-standard");
const BACKUP_ROOT = join(PROJECT_ROOT, "work", "aoede-backups");
const FAILED_ROOT = join(PROJECT_ROOT, "work", "aoede-failed-promotions");
const LOCK_PATH = join(STAGING_ROOT, ".promote.lock");
const MIN_BYTES = 4 * 1024;
const MAX_BYTES = 500 * 1024;
const MIN_DURATION_SECONDS = 0.8;
const MAX_DURATION_SECONDS = 40;
const LOCAL_CONCURRENCY = 4;

function usage() {
  return [
    "Safely validate and promote complete paced and raw Pro + Aoede narration sets.",
    "",
    "Usage:",
    "  node scripts/promote-aoede-audio.mjs --check     # preflight only (default)",
    "  node scripts/promote-aoede-audio.mjs --promote   # copy, revalidate, switch, keep backup",
    "",
    "The script uses fixed project-local paths. It never deletes an existing public audio tree.",
    `Paced manifest:   ${MANIFEST_PATH}`,
    `Paced audio:      ${STAGING_AUDIO_ROOT}`,
    `Required source:  ${SOURCE_ROOT}`,
    `Public audio:     ${PUBLIC_AUDIO_ROOT}`,
    `Standard audio:   ${PUBLIC_STANDARD_AUDIO_ROOT}`,
  ].join("\n");
}

function parseArguments(argv) {
  const allowed = new Set(["--check", "--promote", "--help", "-h"]);
  const unknown = argv.filter((argument) => !allowed.has(argument));
  if (unknown.length) throw new Error(`Unknown option: ${unknown.join(", ")}\n\n${usage()}`);
  if (argv.includes("--check") && argv.includes("--promote")) {
    throw new Error("Choose either --check or --promote, not both.");
  }
  return {
    help: argv.includes("--help") || argv.includes("-h"),
    promote: argv.includes("--promote"),
  };
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

async function pathInfo(path, label) {
  let info;
  try {
    info = await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(`${label} does not exist: ${path}`);
    throw error;
  }
  if (info.isSymbolicLink()) throw new Error(`${label} may not be a symbolic link: ${path}`);
  return info;
}

async function requireRealDirectory(path, label) {
  const info = await pathInfo(path, label);
  if (!info.isDirectory()) throw new Error(`${label} is not a directory: ${path}`);
  return info;
}

async function requireRealFile(path, label) {
  const info = await pathInfo(path, label);
  if (!info.isFile()) throw new Error(`${label} is not a regular file: ${path}`);
  return info;
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

function sha256Buffer(value) {
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

function entriesFingerprint(entries) {
  return sha256Buffer(
    stableJson(
      entries.map((entry) => ({
        bytes: entry.bytes,
        hash: entry.fileHash,
        id: entry.id,
        path: entry.relativePath,
      })),
    ),
  );
}

function wordCount(text) {
  return text?.match(/[A-Za-z]+(?:[’'][A-Za-z]+)*/g)?.length || 0;
}

async function sha256File(path) {
  const hash = createHash("sha256");
  await new Promise((resolvePromise, rejectPromise) => {
    const input = createReadStream(path);
    input.on("data", (chunk) => hash.update(chunk));
    input.on("error", rejectPromise);
    input.on("end", resolvePromise);
  });
  return hash.digest("hex");
}

function expectedPaths() {
  const paths = BOOKS.flatMap((book) => [
    ...book.pages.map((page, index) => {
      const name = `${String(index + 1).padStart(2, "0")}.mp3`;
      const expectedSrc = `/audio/${book.slug}/${name}`;
      if (page.audioSrc !== expectedSrc) {
        throw new Error(`${book.slug}/${name} has an unexpected page audio path.`);
      }
      return `audio/${book.slug}/${name}`;
    }),
    ...["listen", "speak", "read", "write"].map(
      (task) => `audio/${book.slug}/${task}.mp3`,
    ),
  ]);
  if (paths.length !== EXPECTED_TOTAL || new Set(paths).size !== EXPECTED_TOTAL) {
    throw new Error(`Book data must define exactly ${EXPECTED_TOTAL} unique audio paths.`);
  }
  return paths;
}

function normalizeManifestPath(value) {
  if (typeof value !== "string") return null;
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!/^audio\/[a-z0-9-]+\/(?:\d{2}|listen|speak|read|write)\.mp3$/.test(normalized)) {
    return null;
  }
  return normalized;
}

function normalizeSourceReceiptPath(value, id) {
  if (typeof value !== "string") return null;
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  return normalized === `.receipts/${id}.json` ? normalized : null;
}

async function loadApprovedSourceManifest(expectedHash) {
  await requireRealDirectory(SOURCE_ROOT, "Aoede source root");
  await requireRealDirectory(SOURCE_AUDIO_ROOT, "Pro Aoede source audio root");
  await requireRealDirectory(SOURCE_RECEIPT_ROOT, "Pro Aoede source receipt root");
  await requireRealDirectory(SOURCE_BATCH_RUNS_ROOT, "Pro Aoede Batch journal root");
  await requireRealFile(SOURCE_MANIFEST_PATH, "Aoede source manifest");
  const realSource = await realpath(SOURCE_ROOT);
  const realSourceAudio = await realpath(SOURCE_AUDIO_ROOT);
  const realSourceReceipts = await realpath(SOURCE_RECEIPT_ROOT);
  const realBatchRuns = await realpath(SOURCE_BATCH_RUNS_ROOT);
  const realSourceManifest = await realpath(SOURCE_MANIFEST_PATH);
  assertWithin(realSourceAudio, realSource, "Pro Aoede source audio root");
  assertWithin(realSourceReceipts, realSource, "Pro Aoede source receipt root");
  assertWithin(realBatchRuns, realSource, "Pro Aoede Batch journal root");
  assertWithin(realSourceManifest, realSource, "Aoede source manifest");
  const bytes = await readFile(SOURCE_MANIFEST_PATH);
  const actualHash = sha256Buffer(bytes);
  if (actualHash !== expectedHash) {
    throw new Error("Aoede source manifest hash does not match the paced manifest provenance.");
  }
  let manifest;
  try {
    manifest = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("Aoede source manifest is not valid JSON.");
  }
  assertCompleteProSourceManifest(manifest);
  const combination = `${manifest?.model || ""}|${manifest?.voice || ""}`;
  const byPath = new Map();
  for (const clip of manifest.clips) {
    const path = normalizeManifestPath(clip?.relativePath);
    if (!path || byPath.has(path)) {
      throw new Error(`Aoede source manifest contains an invalid or duplicate path: ${String(clip?.relativePath)}`);
    }
    byPath.set(path, clip);
  }
  const jobsByPath = new Map();
  for (const job of manifest.jobs) {
    const path = normalizeManifestPath(job?.outputPath);
    if (!path || jobsByPath.has(path)) {
      throw new Error(`Pro Aoede source manifest contains an invalid or duplicate job path: ${String(job?.outputPath)}`);
    }
    jobsByPath.set(path, job);
  }
  return {
    byPath,
    combination,
    hash: actualHash,
    jobsByPath,
    manifest,
    planSha256: manifest.plan.planSha256,
    realSourceAudio,
    realSourceReceipts,
    realBatchRuns,
  };
}

async function validateProSourceProvenance(sourceManifest, sourceClip, sourceJob, pacedClip) {
  const relativePath = normalizeManifestPath(sourceClip?.relativePath);
  if (
    !relativePath ||
    sourceJob?.outputPath !== relativePath ||
    sourceJob?.id !== sourceClip?.id ||
    sourceJob?.status !== "complete" ||
    sourceClip?.status !== "complete" ||
    sourceJob?.spokenText !== sourceClip?.spokenText ||
    sourceJob?.spokenTextSha256 !== sourceClip?.spokenTextHash ||
    sourceJob?.promptSha256 !== sourceClip?.promptHash ||
    sourceJob?.requestSha256 !== sourceClip?.requestHash ||
    sourceJob?.audioSha256 !== sourceClip?.fileHash ||
    sourceJob?.bytes !== sourceClip?.bytes ||
    sourceJob?.fullDecodePassed !== true ||
    sourceClip?.fullDecodePassed !== true
  ) {
    throw new Error(`${relativePath || "Pro source clip"} has inconsistent complete source job metadata.`);
  }

  const receiptRelativePath = normalizeSourceReceiptPath(sourceJob.receiptPath, sourceJob.id);
  if (!receiptRelativePath || sourceClip.receiptPath !== receiptRelativePath) {
    throw new Error(`${relativePath} has no trusted Pro generator receipt path.`);
  }
  const receiptPath = join(SOURCE_ROOT, receiptRelativePath);
  assertWithin(receiptPath, SOURCE_RECEIPT_ROOT, `Pro source receipt ${sourceJob.id}`);
  await requireRealFile(receiptPath, `Pro source receipt ${sourceJob.id}`);
  const realReceipt = await realpath(receiptPath);
  assertWithin(realReceipt, sourceManifest.realSourceReceipts, `Resolved Pro source receipt ${sourceJob.id}`);
  const receiptBytes = await readFile(receiptPath);
  const receiptHash = sha256Buffer(receiptBytes);
  if (pacedClip?.source?.generatorReceiptHash !== receiptHash) {
    throw new Error(`${relativePath} pacing provenance does not match its Pro generator receipt hash.`);
  }
  let receipt;
  try {
    receipt = JSON.parse(receiptBytes.toString("utf8"));
  } catch {
    throw new Error(`Pro generator receipt is invalid JSON for ${relativePath}.`);
  }
  assertProGeneratorReceipt({
    receipt,
    sourceJob,
    sourceClip,
    sourceManifest: sourceManifest.manifest,
    receiptSha256: receiptHash,
  });
  const journalPath = join(
    SOURCE_BATCH_RUNS_ROOT,
    `batch-${receipt.batch.requestPlanSha256.slice(0, 20)}.json`,
  );
  assertWithin(journalPath, SOURCE_BATCH_RUNS_ROOT, `Pro Batch journal ${sourceJob.id}`);
  await requireRealFile(journalPath, `Pro Batch journal ${sourceJob.id}`);
  const realJournal = await realpath(journalPath);
  assertWithin(realJournal, sourceManifest.realBatchRuns, `Resolved Pro Batch journal ${sourceJob.id}`);
  const journalBytes = await readFile(journalPath);
  let journal;
  try {
    journal = JSON.parse(journalBytes.toString("utf8"));
  } catch {
    throw new Error(`Pro Batch journal is invalid JSON for ${relativePath}.`);
  }
  assertProBatchJournal({
    journal,
    receipt,
    sourceJob,
    sourceManifest: sourceManifest.manifest,
  });
  const journalHash = sha256Buffer(journalBytes);
  if (pacedClip?.source?.generatorJournalHash !== journalHash) {
    throw new Error(`${relativePath} pacing provenance does not match its Pro Batch journal hash.`);
  }

  const sourceAudioPath = join(SOURCE_ROOT, relativePath);
  assertWithin(sourceAudioPath, SOURCE_AUDIO_ROOT, `Pro source audio ${relativePath}`);
  const sourceInfo = await requireRealFile(sourceAudioPath, `Pro source audio ${relativePath}`);
  const realSourceAudio = await realpath(sourceAudioPath);
  assertWithin(realSourceAudio, sourceManifest.realSourceAudio, `Resolved Pro source audio ${relativePath}`);
  if (sourceInfo.size !== sourceClip.bytes) {
    throw new Error(`${relativePath} Pro source byte count no longer matches its receipt.`);
  }
  if (await sha256File(sourceAudioPath) !== sourceClip.fileHash) {
    throw new Error(`${relativePath} Pro source hash no longer matches its receipt.`);
  }
  return { journalHash, receiptHash, receiptRelativePath };
}

async function validatePacingReceipt(clip, entry) {
  if (typeof clip?.id !== "string" || !/^[a-z0-9-]+\/(?:\d{2}|listen|speak|read|write)$/.test(clip.id)) {
    throw new Error(`${entry.relativePath} has an invalid paced clip ID.`);
  }
  const receiptPath = join(RECEIPT_ROOT, `${clip.id}.json`);
  assertWithin(receiptPath, RECEIPT_ROOT, `Receipt ${clip.id}`);
  await requireRealFile(receiptPath, `Pacing receipt ${clip.id}`);
  const realReceiptRoot = await realpath(RECEIPT_ROOT);
  const realReceipt = await realpath(receiptPath);
  assertWithin(realReceipt, realReceiptRoot, `Resolved receipt ${clip.id}`);
  let receipt;
  try {
    receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  } catch {
    throw new Error(`Pacing receipt is invalid JSON for ${entry.relativePath}.`);
  }
  if (
    receipt?.schemaVersion !== EXPECTED_PACING_SCHEMA_VERSION ||
    receipt?.transformVersion !== EXPECTED_TRANSFORM_VERSION ||
    receipt?.pacingPolicyVersion !== EXPECTED_PACING_POLICY_VERSION ||
    receipt?.source?.hash !== clip?.source?.hash ||
    receipt?.source?.recordHash !== clip?.source?.recordHash ||
    receipt?.source?.manifestHash !== clip?.source?.manifestHash ||
    receipt?.source?.manifestPath !== relative(PROJECT_ROOT, SOURCE_MANIFEST_PATH) ||
    receipt?.source?.planSha256 !== clip?.source?.planSha256 ||
    receipt?.source?.generatorReceiptHash !== clip?.source?.generatorReceiptHash ||
    receipt?.source?.generatorJournalHash !== clip?.source?.generatorJournalHash ||
    receipt?.source?.model !== EXPECTED_SOURCE_MODEL ||
    receipt?.source?.voice !== EXPECTED_SOURCE_VOICE ||
    receipt?.output?.relativePath !== entry.relativePath ||
    receipt?.output?.bytes !== entry.bytes ||
    receipt?.output?.hash !== entry.fileHash ||
    receipt?.record?.id !== clip?.id ||
    receipt?.record?.relativePath !== entry.relativePath ||
    receipt?.record?.spokenTextHash !== clip?.spokenTextHash ||
    receipt?.record?.status !== "complete" ||
    receipt?.record?.manualPacing !== clip?.manualPacing ||
    stableJson(receipt?.record?.pacing) !== stableJson(clip?.pacing) ||
    receipt?.record?.final?.relativePath !== entry.relativePath ||
    receipt?.record?.final?.bytes !== entry.bytes ||
    receipt?.record?.final?.hash !== entry.fileHash ||
    receipt?.record?.source?.hash !== clip?.source?.hash ||
    receipt?.record?.source?.bytes !== clip?.source?.bytes ||
    receipt?.record?.source?.recordHash !== clip?.source?.recordHash ||
    receipt?.record?.source?.manifestHash !== clip?.source?.manifestHash ||
    receipt?.record?.source?.manifestPath !== relative(PROJECT_ROOT, SOURCE_MANIFEST_PATH) ||
    receipt?.record?.source?.planSha256 !== clip?.source?.planSha256 ||
    receipt?.record?.source?.generatorReceiptHash !== clip?.source?.generatorReceiptHash ||
    receipt?.record?.source?.generatorJournalHash !== clip?.source?.generatorJournalHash ||
    receipt?.record?.source?.model !== EXPECTED_SOURCE_MODEL ||
    receipt?.record?.source?.voice !== EXPECTED_SOURCE_VOICE
  ) {
    throw new Error(`Pacing receipt does not match the paced manifest for ${entry.relativePath}.`);
  }
}

async function loadCompletePlan() {
  await requireRealDirectory(PROJECT_ROOT, "Project root");
  await requireRealDirectory(join(PROJECT_ROOT, "work"), "Work directory");
  await requireRealDirectory(STAGING_ROOT, "Staging root");
  await requireRealFile(MANIFEST_PATH, "Staging manifest");
  const realProject = await realpath(PROJECT_ROOT);
  const realStaging = await realpath(STAGING_ROOT);
  const realManifest = await realpath(MANIFEST_PATH);
  assertWithin(realStaging, realProject, "Staging root");
  assertWithin(realManifest, realStaging, "Staging manifest");

  const manifestBytes = await readFile(MANIFEST_PATH);
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch {
    throw new Error("Paced manifest is not valid JSON.");
  }
  if (
    manifest?.schemaVersion !== EXPECTED_PACING_SCHEMA_VERSION ||
    manifest?.transformVersion !== EXPECTED_TRANSFORM_VERSION ||
    !proPacingPolicyMatches(manifest?.pacingPolicy)
  ) {
    throw new Error(
      `Paced manifest must use ${EXPECTED_TRANSFORM_VERSION} and the approved ${EXPECTED_PACING_POLICY_VERSION} policy.`,
    );
  }
  if (
    manifest?.sourceRoot !== relative(PROJECT_ROOT, SOURCE_ROOT) ||
    !/^[a-f0-9]{64}$/.test(manifest?.sourceIdentity?.planSha256 || "") ||
    manifest?.sourceIdentity?.generatorVersion !== EXPECTED_SOURCE_GENERATOR_VERSION ||
    manifest?.sourceIdentity?.manifestPath !== relative(PROJECT_ROOT, SOURCE_MANIFEST_PATH) ||
    manifest?.sourceIdentity?.model !== EXPECTED_SOURCE_MODEL ||
    manifest?.sourceIdentity?.root !== relative(PROJECT_ROOT, SOURCE_ROOT) ||
    manifest?.sourceIdentity?.voice !== EXPECTED_SOURCE_VOICE
  ) {
    throw new Error("Paced manifest is not exclusively bound to the approved Pro + Aoede source root and plan.");
  }
  if (!Array.isArray(manifest?.clips) || manifest.clips.length !== EXPECTED_TOTAL) {
    throw new Error(`Paced manifest must contain exactly ${EXPECTED_TOTAL} clips.`);
  }

  const expected = expectedPaths();
  const expectedSet = new Set(expected);
  const byPath = new Map();
  for (const clip of manifest.clips) {
    const relativePath = normalizeManifestPath(clip?.relativePath);
    if (!relativePath) {
      throw new Error(`Paced manifest contains an unsafe path: ${String(clip?.relativePath)}`);
    }
    if (!expectedSet.has(relativePath)) {
      throw new Error(`Paced manifest path is not used by the website: ${relativePath}`);
    }
    if (byPath.has(relativePath)) throw new Error(`Paced manifest path is duplicated: ${relativePath}`);
    byPath.set(relativePath, clip);
  }
  const missing = expected.filter((path) => !byPath.has(path));
  if (missing.length) throw new Error(`Paced manifest is missing expected path ${missing[0]}.`);

  const incomplete = manifest.clips.filter((clip) => clip?.status !== "complete");
  if (incomplete.length) {
    const statusCounts = Object.create(null);
    for (const clip of manifest.clips) {
      statusCounts[String(clip?.status || "missing")] =
        (statusCounts[String(clip?.status || "missing")] || 0) + 1;
    }
    const summary = Object.entries(statusCounts)
      .map(([status, count]) => `${status}=${count}`)
      .join(", ");
    throw new Error(`Release blocked: paced production is only ${EXPECTED_TOTAL - incomplete.length}/${EXPECTED_TOTAL} complete (${summary}).`);
  }
  if (manifest.publishReady !== true) {
    throw new Error("Release blocked: paced manifest publishReady is not true.");
  }
  if (
    manifest?.summary?.total !== EXPECTED_TOTAL ||
    manifest?.summary?.complete !== EXPECTED_TOTAL ||
    !Array.isArray(manifest?.summary?.manualPacing)
  ) {
    throw new Error("Release blocked: paced manifest does not contain the required manualPacing review list.");
  }
  const manualClips = manifest.clips.filter((clip) => clip?.manualPacing === true);
  if (manifest.summary.manualPacing.length || manualClips.length) {
    const ids = new Set([
      ...manifest.summary.manualPacing,
      ...manualClips.map((clip) => clip.id),
    ]);
    throw new Error(`Release blocked: manual pacing review remains for ${[...ids].join(", ")}.`);
  }

  const entries = expected.map((relativePath) => {
    const clip = byPath.get(relativePath);
    const final = clip?.final;
    if (!Number.isInteger(final?.bytes) || final.bytes < MIN_BYTES || final.bytes > MAX_BYTES) {
      throw new Error(`${relativePath} has an invalid manifest byte count.`);
    }
    if (!/^[a-f0-9]{64}$/.test(final?.hash || "")) {
      throw new Error(`${relativePath} has no valid manifest SHA-256.`);
    }
    if (
      final.relativePath !== relativePath ||
      final.codec !== "mp3" ||
      final.sampleRate !== 24_000 ||
      final.channels !== 1 ||
      !Number.isFinite(final.durationSeconds) ||
      final.durationSeconds < MIN_DURATION_SECONDS ||
      final.durationSeconds >= MAX_DURATION_SECONDS ||
      !Number.isFinite(final?.loudness?.truePeakDbtp) ||
      final.loudness.truePeakDbtp > -1.5
    ) {
      throw new Error(`${relativePath} does not have approved paced MP3 metrics.`);
    }
    if (
      !clip?.source ||
      clip.source.path !== relativePath ||
      clip.source.manifestPath !== relative(PROJECT_ROOT, SOURCE_MANIFEST_PATH) ||
      !Number.isInteger(clip.source.bytes) ||
      clip.source.model !== EXPECTED_SOURCE_MODEL ||
      clip.source.voice !== EXPECTED_SOURCE_VOICE ||
      clip.source.planSha256 !== manifest.sourceIdentity.planSha256 ||
      !/^[a-f0-9]{64}$/.test(clip.source.hash || "") ||
      !/^[a-f0-9]{64}$/.test(clip.source.recordHash || "") ||
      !/^[a-f0-9]{64}$/.test(clip.source.generatorReceiptHash || "") ||
      !/^[a-f0-9]{64}$/.test(clip.source.generatorJournalHash || "")
    ) {
      throw new Error(`${relativePath} has incomplete source provenance.`);
    }
    if (!proPacingSettingsMatch(clip?.pacing, clip)) {
      throw new Error(`${relativePath} does not use the approved P1 pacing settings.`);
    }
    if (!proPausePaddingRecordMatches(clip)) {
      throw new Error(`${relativePath} does not have an approved floor-limited pause record.`);
    }
    return {
      bytes: final.bytes,
      clip,
      fileHash: final.hash,
      id: clip.id,
      relativePath,
      audioRelativePath: relativePath.slice("audio/".length),
    };
  });

  const sourceProvenance = manifest.latestSourceManifest;
  if (
    sourceProvenance?.path !== relative(PROJECT_ROOT, SOURCE_MANIFEST_PATH) ||
    !/^[a-f0-9]{64}$/.test(sourceProvenance?.sha256 || "") ||
    sourceProvenance?.completedClips !== EXPECTED_TOTAL ||
    sourceProvenance?.generatorVersion !== EXPECTED_SOURCE_GENERATOR_VERSION ||
    sourceProvenance?.model !== EXPECTED_SOURCE_MODEL ||
    sourceProvenance?.voice !== EXPECTED_SOURCE_VOICE ||
    sourceProvenance?.planSha256 !== manifest.sourceIdentity.planSha256
  ) {
    throw new Error("Paced manifest does not reference one complete approved source manifest.");
  }
  const sourceManifest = await loadApprovedSourceManifest(sourceProvenance.sha256);
  if (sourceManifest.planSha256 !== manifest.sourceIdentity.planSha256) {
    throw new Error("Paced source plan hash does not match the complete Pro source manifest.");
  }
  await requireRealDirectory(RECEIPT_ROOT, "Pacing receipt root");
  const standardEntries = [];
  for (const entry of entries) {
    if (entry.clip.source.manifestHash !== sourceManifest.hash) {
      throw new Error(`${entry.relativePath} was not validated against the final source manifest.`);
    }
    const sourceClip = sourceManifest.byPath.get(entry.relativePath);
    const sourceJob = sourceManifest.jobsByPath.get(entry.relativePath);
    if (
      sourceClip?.status !== "complete" ||
      sourceJob?.status !== "complete" ||
      sourceClip?.fileHash !== entry.clip.source.hash ||
      sourceJob?.audioSha256 !== entry.clip.source.hash
    ) {
      throw new Error(`${entry.relativePath} source provenance does not match the source manifest.`);
    }
    const sourceWordCount = wordCount(sourceJob.spokenText);
    if (
      entry.clip.kind !== sourceJob.kind ||
      entry.clip.taskType !== sourceJob.taskType ||
      entry.clip.wordCount !== sourceWordCount ||
      !proPacingSettingsMatch(entry.clip.pacing, {
        kind: sourceJob.kind,
        taskType: sourceJob.taskType,
        wordCount: sourceWordCount,
      })
    ) {
      throw new Error(`${entry.relativePath} pacing settings do not match its approved source purpose.`);
    }
    const sourceValidation = await validateProSourceProvenance(
      sourceManifest,
      sourceClip,
      sourceJob,
      entry.clip,
    );
    const sourceRecord = {
      id: sourceClip.id,
      relativePath: entry.relativePath,
      status: sourceClip.status,
      bytes: sourceClip.bytes,
      fileHash: sourceClip.fileHash,
      generatorJournalHash: sourceValidation.journalHash,
      generatorReceiptHash: sourceValidation.receiptHash,
      promptHash: sourceClip.promptHash,
      receiptPath: sourceValidation.receiptRelativePath,
      requestHash: sourceClip.requestHash,
      spokenTextHash: sourceClip.spokenTextHash,
    };
    if (
      entry.clip.source.bytes !== sourceClip.bytes ||
      entry.clip.source.recordHash !== sha256Buffer(stableJson(sourceRecord))
    ) {
      throw new Error(`${entry.relativePath} pacing source record hash does not match the Pro source receipt.`);
    }
    await validatePacingReceipt(entry.clip, entry);
    standardEntries.push({
      audioRelativePath: entry.audioRelativePath,
      bytes: sourceClip.bytes,
      fileHash: sourceClip.fileHash,
      id: sourceClip.id,
      relativePath: entry.relativePath,
    });
  }

  return {
    entries,
    pacedFingerprint: entriesFingerprint(entries),
    standardEntries,
    standardFingerprint: entriesFingerprint(standardEntries),
    manifestHash: sha256Buffer(manifestBytes),
    manifestUpdatedAt: manifest.updatedAt || null,
    sourceCombination: sourceManifest.combination,
    sourceManifestHash: sourceManifest.hash,
  };
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

async function inspectAudio(path, entry) {
  const info = await requireRealFile(path, `Audio ${entry.relativePath}`);
  if (info.size !== entry.bytes) {
    throw new Error(`${entry.relativePath}: size is ${info.size}, manifest says ${entry.bytes}.`);
  }
  if (info.size < MIN_BYTES || info.size > MAX_BYTES) {
    throw new Error(`${entry.relativePath}: size is outside ${MIN_BYTES}-${MAX_BYTES} bytes.`);
  }

  const actualHash = await sha256File(path);
  if (actualHash !== entry.fileHash) {
    throw new Error(`${entry.relativePath}: SHA-256 does not match the manifest.`);
  }

  let probe;
  try {
    const { stdout } = await run(
      "ffprobe",
      ["-v", "error", "-show_streams", "-show_format", "-of", "json", path],
      { encoding: "utf8", timeout: 30_000, maxBuffer: 2 * 1024 * 1024 },
    );
    probe = JSON.parse(stdout);
  } catch (error) {
    const detail = String(error?.stderr || error?.message || "unknown error")
      .replace(/[\r\n]+/g, " ")
      .slice(0, 300);
    throw new Error(`${entry.relativePath}: ffprobe failed (${detail}).`);
  }
  const streams = Array.isArray(probe?.streams) ? probe.streams : [];
  const stream = streams[0];
  const duration = Number(probe?.format?.duration ?? stream?.duration);
  if (
    streams.length !== 1 ||
    stream?.codec_type !== "audio" ||
    stream?.codec_name !== "mp3" ||
    Number(stream?.sample_rate) !== 24_000 ||
    Number(stream?.channels) !== 1
  ) {
    throw new Error(`${entry.relativePath}: expected exactly one 24 kHz mono MP3 audio stream and no other streams.`);
  }
  if (!Number.isFinite(duration) || duration < MIN_DURATION_SECONDS || duration > MAX_DURATION_SECONDS) {
    throw new Error(`${entry.relativePath}: duration ${duration} is outside ${MIN_DURATION_SECONDS}-${MAX_DURATION_SECONDS}s.`);
  }

  try {
    await run(
      "ffmpeg",
      [
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        "-xerror",
        "-i",
        path,
        "-map",
        "0:a:0",
        "-vn",
        "-sn",
        "-dn",
        "-f",
        "null",
        "-",
      ],
      { encoding: "utf8", timeout: 60_000, maxBuffer: 2 * 1024 * 1024 },
    );
  } catch (error) {
    const detail = String(error?.stderr || error?.message || "unknown error")
      .replace(/[\r\n]+/g, " ")
      .slice(0, 300);
    throw new Error(`${entry.relativePath}: full ffmpeg decode failed (${detail}).`);
  }
}

async function validateTree(audioRoot, entries, label) {
  const audioRootInfo = await requireRealDirectory(audioRoot, label);
  const realAudioRoot = await realpath(audioRoot);
  const expectedFiles = new Set(entries.map((entry) => entry.audioRelativePath));
  const expectedBooks = new Set(
    entries.map((entry) => entry.audioRelativePath.split("/")[0]),
  );
  const seenFiles = new Set();

  const bookEntries = await readdir(audioRoot, { withFileTypes: true });
  for (const bookEntry of bookEntries) {
    if (bookEntry.isSymbolicLink()) throw new Error(`${label} contains a symbolic link: ${bookEntry.name}`);
    if (!bookEntry.isDirectory()) throw new Error(`${label} contains an unexpected file: ${bookEntry.name}`);
    if (!expectedBooks.has(bookEntry.name)) {
      throw new Error(`${label} contains an unexpected directory: ${bookEntry.name}`);
    }
    const bookPath = join(audioRoot, bookEntry.name);
    const files = await readdir(bookPath, { withFileTypes: true });
    for (const file of files) {
      const relativePath = `${bookEntry.name}/${file.name}`;
      if (file.isSymbolicLink()) throw new Error(`${label} contains a symbolic link: ${relativePath}`);
      if (!file.isFile()) throw new Error(`${label} contains a non-file entry: ${relativePath}`);
      if (!expectedFiles.has(relativePath)) throw new Error(`${label} contains an untracked file: ${relativePath}`);
      seenFiles.add(relativePath);
    }
  }
  if (seenFiles.size !== entries.length) {
    throw new Error(`${label} contains ${seenFiles.size}/${entries.length} expected files.`);
  }

  let cursor = 0;
  const failures = [];
  async function worker() {
    while (cursor < entries.length) {
      const entry = entries[cursor++];
      const path = join(audioRoot, entry.audioRelativePath);
      assertWithin(path, audioRoot, `Audio path ${entry.relativePath}`);
      try {
        const realPath = await realpath(path);
        assertWithin(realPath, realAudioRoot, `Resolved audio path ${entry.relativePath}`);
        await inspectAudio(path, entry);
      } catch (error) {
        failures.push(error?.message || String(error));
      }
    }
  }
  await Promise.all(Array.from({ length: LOCAL_CONCURRENCY }, () => worker()));
  if (failures.length) {
    throw new Error(`${label} failed validation:\n- ${failures.join("\n- ")}`);
  }
  return audioRootInfo;
}

async function assertManifestUnchanged(expectedHash) {
  await requireRealFile(MANIFEST_PATH, "Staging manifest");
  const currentHash = sha256Buffer(await readFile(MANIFEST_PATH));
  if (currentHash !== expectedHash) {
    throw new Error("Staging manifest changed during release preparation; start a new preflight.");
  }
}

async function assertSourceManifestUnchanged(expectedHash) {
  await requireRealFile(SOURCE_MANIFEST_PATH, "Aoede source manifest");
  const currentHash = sha256Buffer(await readFile(SOURCE_MANIFEST_PATH));
  if (currentHash !== expectedHash) {
    throw new Error("Aoede source manifest changed during release preparation; start a new preflight.");
  }
}

async function preflight() {
  const plan = await loadCompletePlan();
  await requireAudioTools();
  await validateTree(STAGING_AUDIO_ROOT, plan.entries, "Paced audio");
  await validateTree(SOURCE_AUDIO_ROOT, plan.standardEntries, "Raw Pro audio");
  await assertManifestUnchanged(plan.manifestHash);
  await assertSourceManifestUnchanged(plan.sourceManifestHash);
  return plan;
}

function timestampForPath() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function makeSafeDirectory(path, label) {
  if (await exists(path)) throw new Error(`${label} already exists: ${path}`);
  await mkdir(path, { recursive: false, mode: 0o700 });
  await requireRealDirectory(path, label);
}

async function ensurePrivateRoot(path, label) {
  const parent = dirname(path);
  await requireRealDirectory(parent, `${label} parent`);
  if (!(await exists(path))) await mkdir(path, { recursive: false, mode: 0o700 });
  await requireRealDirectory(path, label);
}

async function copyCandidate(candidateRoot, sourceAudioRoot, entries) {
  await makeSafeDirectory(candidateRoot, "Candidate audio directory");
  const createdBookDirectories = new Set();
  for (const entry of entries) {
    const source = join(sourceAudioRoot, entry.audioRelativePath);
    const destination = join(candidateRoot, entry.audioRelativePath);
    assertWithin(source, sourceAudioRoot, `Staging source ${entry.relativePath}`);
    assertWithin(destination, candidateRoot, `Candidate destination ${entry.relativePath}`);
    await requireRealFile(source, `Staging source ${entry.relativePath}`);
    const realSource = await realpath(source);
    const realStagingAudio = await realpath(sourceAudioRoot);
    assertWithin(realSource, realStagingAudio, `Resolved staging source ${entry.relativePath}`);
    const destinationParent = dirname(destination);
    if (!createdBookDirectories.has(destinationParent)) {
      await mkdir(destinationParent, { recursive: false, mode: 0o700 });
      await requireRealDirectory(destinationParent, "Candidate book directory");
      createdBookDirectories.add(destinationParent);
    }
    await copyFile(source, destination, fsConstants.COPYFILE_EXCL);
  }
}

async function moveToFailedArea(path, label) {
  if (!(await exists(path))) return null;
  await ensurePrivateRoot(FAILED_ROOT, "Failed-promotion archive");
  const destination = join(FAILED_ROOT, `${label}-${timestampForPath()}-${randomUUID()}`);
  await rename(path, destination);
  return destination;
}

async function atomicWriteReceipt(path, value) {
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  await rename(temporary, path);
}

async function acquireLock() {
  await requireRealDirectory(PROJECT_ROOT, "Project root");
  await requireRealDirectory(join(PROJECT_ROOT, "work"), "Work directory");
  await requireRealDirectory(STAGING_ROOT, "Staging root");
  const realProject = await realpath(PROJECT_ROOT);
  const realStaging = await realpath(STAGING_ROOT);
  assertWithin(realStaging, realProject, "Staging root");
  try {
    await mkdir(LOCK_PATH, { recursive: false, mode: 0o700 });
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(`Another promotion may be running (${LOCK_PATH} exists).`);
    }
    throw error;
  }
}

async function releaseLock() {
  try {
    const lockInfo = await pathInfo(LOCK_PATH, "Promotion lock");
    if (!lockInfo.isDirectory()) throw new Error("Promotion lock is not a directory; it was preserved.");
    const entries = await readdir(LOCK_PATH);
    if (entries.length) throw new Error("Promotion lock unexpectedly contains files; it was preserved.");
    const { rmdir } = await import("node:fs/promises");
    await rmdir(LOCK_PATH);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function promote() {
  await acquireLock();
  let pacedCandidateRoot = null;
  let standardCandidateRoot = null;
  let pacedBackupPath = null;
  let standardBackupPath = null;
  let pacedMoved = false;
  let standardMoved = false;
  let pacedInstalled = false;
  let standardInstalled = false;
  try {
    const plan = await preflight();
    await requireRealDirectory(PUBLIC_ROOT, "Public directory");
    await requireRealDirectory(PUBLIC_AUDIO_ROOT, "Current public audio");
    const realPublic = await realpath(PUBLIC_ROOT);
    const realCurrentAudio = await realpath(PUBLIC_AUDIO_ROOT);
    assertWithin(realCurrentAudio, realPublic, "Current public audio");
    const standardAlreadyExists = await exists(PUBLIC_STANDARD_AUDIO_ROOT);
    if (standardAlreadyExists) {
      await requireRealDirectory(PUBLIC_STANDARD_AUDIO_ROOT, "Current public standard audio");
      const realCurrentStandardAudio = await realpath(PUBLIC_STANDARD_AUDIO_ROOT);
      assertWithin(realCurrentStandardAudio, realPublic, "Current public standard audio");
    }

    pacedCandidateRoot = join(PUBLIC_ROOT, `.audio-aoede-next-${randomUUID()}`);
    standardCandidateRoot = join(PUBLIC_ROOT, `.audio-standard-aoede-next-${randomUUID()}`);
    assertWithin(pacedCandidateRoot, PUBLIC_ROOT, "Paced candidate audio directory");
    assertWithin(standardCandidateRoot, PUBLIC_ROOT, "Standard candidate audio directory");
    process.stdout.write(
      `Copying ${plan.entries.length} paced and ${plan.standardEntries.length} standard files into isolated candidates.\n`,
    );
    await copyCandidate(pacedCandidateRoot, STAGING_AUDIO_ROOT, plan.entries);
    await copyCandidate(standardCandidateRoot, SOURCE_AUDIO_ROOT, plan.standardEntries);
    await validateTree(pacedCandidateRoot, plan.entries, "Copied paced candidate audio");
    await validateTree(
      standardCandidateRoot,
      plan.standardEntries,
      "Copied standard candidate audio",
    );
    await assertManifestUnchanged(plan.manifestHash);
    await assertSourceManifestUnchanged(plan.sourceManifestHash);

    await ensurePrivateRoot(BACKUP_ROOT, "Audio backup directory");
    const publicDevice = (await stat(PUBLIC_ROOT)).dev;
    const backupDevice = (await stat(BACKUP_ROOT)).dev;
    if (publicDevice !== backupDevice) {
      throw new Error("Backup directory is on another filesystem; an atomic rollback-safe switch is not possible.");
    }
    pacedBackupPath = join(
      BACKUP_ROOT,
      `audio-before-dual-aoede-${timestampForPath()}-${plan.pacedFingerprint.slice(0, 12)}`,
    );
    if (await exists(pacedBackupPath)) {
      throw new Error(`Backup destination already exists: ${pacedBackupPath}`);
    }
    if (standardAlreadyExists) {
      standardBackupPath = join(
        BACKUP_ROOT,
        `audio-standard-before-dual-aoede-${timestampForPath()}-${plan.standardFingerprint.slice(0, 12)}`,
      );
      if (await exists(standardBackupPath)) {
        throw new Error(`Backup destination already exists: ${standardBackupPath}`);
      }
    }

    await rename(PUBLIC_AUDIO_ROOT, pacedBackupPath);
    pacedMoved = true;
    if (standardAlreadyExists) {
      await rename(PUBLIC_STANDARD_AUDIO_ROOT, standardBackupPath);
      standardMoved = true;
    }
    await rename(pacedCandidateRoot, PUBLIC_AUDIO_ROOT);
    pacedCandidateRoot = null;
    pacedInstalled = true;
    await rename(standardCandidateRoot, PUBLIC_STANDARD_AUDIO_ROOT);
    standardCandidateRoot = null;
    standardInstalled = true;
    await validateTree(PUBLIC_AUDIO_ROOT, plan.entries, "Installed paced public audio");
    await validateTree(
      PUBLIC_STANDARD_AUDIO_ROOT,
      plan.standardEntries,
      "Installed standard public audio",
    );
    await assertManifestUnchanged(plan.manifestHash);
    await assertSourceManifestUnchanged(plan.sourceManifestHash);

    const receiptPath = join(STAGING_ROOT, `promotion-${timestampForPath()}.json`);
    await atomicWriteReceipt(receiptPath, {
      schemaVersion: 1,
      promotedAt: new Date().toISOString(),
      manifestPath: relative(PROJECT_ROOT, MANIFEST_PATH),
      manifestSha256: plan.manifestHash,
      manifestUpdatedAt: plan.manifestUpdatedAt,
      clipCount: plan.entries.length,
      sourceManifestSha256: plan.sourceManifestHash,
      sourceModelVoice: plan.sourceCombination,
      publicAudioPath: relative(PROJECT_ROOT, PUBLIC_AUDIO_ROOT),
      publicAudioFingerprint: plan.pacedFingerprint,
      publicStandardAudioPath: relative(PROJECT_ROOT, PUBLIC_STANDARD_AUDIO_ROOT),
      publicStandardAudioFingerprint: plan.standardFingerprint,
      publicAudioRollbackBackupPath: relative(PROJECT_ROOT, pacedBackupPath),
      publicStandardAudioRollbackBackupPath: standardBackupPath
        ? relative(PROJECT_ROOT, standardBackupPath)
        : null,
    });
    process.stdout.write(
      [
        "Dual promotion complete.",
        `Paced fingerprint: ${plan.pacedFingerprint}`,
        `Standard fingerprint: ${plan.standardFingerprint}`,
        `Previous public/audio: ${pacedBackupPath}`,
        standardBackupPath
          ? `Previous public/audio-standard: ${standardBackupPath}`
          : "Previous public/audio-standard: absent (no tree was overwritten)",
        "",
      ].join("\n"),
    );
  } catch (error) {
    const rollbackProblems = [];
    const rejectedInstalled = [];
    try {
      if (standardInstalled && (await exists(PUBLIC_STANDARD_AUDIO_ROOT))) {
        const rejected = join(PUBLIC_ROOT, `.audio-standard-aoede-rejected-${randomUUID()}`);
        await rename(PUBLIC_STANDARD_AUDIO_ROOT, rejected);
        rejectedInstalled.push([rejected, "rejected-installed-standard-audio"]);
        standardInstalled = false;
      }
      if (pacedInstalled && (await exists(PUBLIC_AUDIO_ROOT))) {
        const rejected = join(PUBLIC_ROOT, `.audio-aoede-rejected-${randomUUID()}`);
        await rename(PUBLIC_AUDIO_ROOT, rejected);
        rejectedInstalled.push([rejected, "rejected-installed-paced-audio"]);
        pacedInstalled = false;
      }
      if (
        standardMoved &&
        !(await exists(PUBLIC_STANDARD_AUDIO_ROOT)) &&
        standardBackupPath &&
        (await exists(standardBackupPath))
      ) {
        await rename(standardBackupPath, PUBLIC_STANDARD_AUDIO_ROOT);
        standardMoved = false;
      }
      if (
        pacedMoved &&
        !(await exists(PUBLIC_AUDIO_ROOT)) &&
        pacedBackupPath &&
        (await exists(pacedBackupPath))
      ) {
        await rename(pacedBackupPath, PUBLIC_AUDIO_ROOT);
        pacedMoved = false;
      }
      process.stderr.write("Dual promotion failed; all previous public audio trees were restored automatically.\n");
    } catch (rollbackError) {
      rollbackProblems.push(rollbackError?.message || String(rollbackError));
    }
    for (const [rejected, label] of rejectedInstalled) {
      try {
        await moveToFailedArea(rejected, label);
      } catch (archiveError) {
        rollbackProblems.push(
          `Rejected candidate remains at ${rejected}: ${archiveError?.message || String(archiveError)}`,
        );
      }
    }
    for (const [candidateRoot, label] of [
      [pacedCandidateRoot, "rejected-paced-candidate-audio"],
      [standardCandidateRoot, "rejected-standard-candidate-audio"],
    ]) {
      if (!candidateRoot || !(await exists(candidateRoot))) continue;
      try {
        await moveToFailedArea(candidateRoot, label);
      } catch (archiveError) {
        rollbackProblems.push(archiveError?.message || String(archiveError));
      }
    }
    const suffix = rollbackProblems.length
      ? ` Rollback/archive problem(s): ${rollbackProblems.join("; ")}`
      : "";
    throw new Error(`${error?.message || String(error)}${suffix}`);
  } finally {
    try {
      await releaseLock();
    } catch (lockError) {
      process.stderr.write(
        `Warning: promotion lock cleanup needs attention: ${lockError?.message || String(lockError)}\n`,
      );
    }
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (options.promote) {
    await promote();
    return;
  }
  const plan = await preflight();
  process.stdout.write(
    [
      `Preflight passed: ${plan.entries.length}/${EXPECTED_TOTAL} paced and ${plan.standardEntries.length}/${EXPECTED_TOTAL} standard Aoede clips are receipt-backed, source-verified, and fully decodable.`,
      `Paced fingerprint: ${plan.pacedFingerprint}`,
      `Standard fingerprint: ${plan.standardFingerprint}`,
      "No public file was changed.",
      "",
    ].join("\n"),
  );
}

main().catch((error) => {
  process.stderr.write(`Aoede promotion blocked: ${error?.message || String(error)}\n`);
  process.exitCode = 1;
});
