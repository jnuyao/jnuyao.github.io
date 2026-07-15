#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { assertProGeneratorReceipt } from "./aoede-pro-contract.mjs";

const run = promisify(execFile);
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(PROJECT_ROOT, "work", "pro-aoede-production");
const MANIFEST_PATH = join(ROOT, "manifest.json");
const RAW_MANIFEST_PATH = join(PROJECT_ROOT, "work", "aoede-production", "manifest.json");
const LOCK_PATH = join(ROOT, ".generate.lock");
const HASH = /^[a-f0-9]{64}$/;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function within(candidate, parent) {
  const value = relative(resolve(parent), resolve(candidate));
  return value === "" || (value !== ".." && !value.startsWith(`..${sep}`) && !isAbsolute(value));
}

async function exists(path) {
  try { await lstat(path); return true; } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function regularFile(path, label) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`${label} must be a regular non-symlink file.`);
  return info;
}

async function inspectAndDecode(path) {
  await regularFile(path, "Audio");
  const { stdout } = await run(
    "ffprobe",
    [
      "-v", "error",
      "-show_entries", "stream=codec_type,codec_name,sample_rate,channels,bit_rate:format=duration,size",
      "-of", "json", path,
    ],
    { encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 },
  );
  const probe = JSON.parse(stdout);
  const stream = probe?.streams?.[0];
  const durationSeconds = Number(probe?.format?.duration);
  const bytes = Number(probe?.format?.size);
  const bitrate = Number(stream?.bit_rate);
  if (
    probe?.streams?.length !== 1 || stream?.codec_type !== "audio" || stream?.codec_name !== "mp3" ||
    Number(stream?.sample_rate) !== 24000 || Number(stream?.channels) !== 1 ||
    !Number.isFinite(bitrate) || bitrate < 60000 || bitrate > 70000 ||
    !Number.isFinite(durationSeconds) || durationSeconds <= 0 || !Number.isInteger(bytes) || bytes < 1024
  ) throw new Error(`Media invariants failed for ${path}.`);
  await run(
    "ffmpeg",
    ["-nostdin", "-v", "error", "-i", path, "-map", "0:a:0", "-f", "null", "-"],
    { encoding: "utf8", timeout: 60_000, maxBuffer: 4 * 1024 * 1024 },
  );
  const content = await readFile(path);
  return { bytes, durationSeconds, bitrate, sha256: sha256(content), fullDecodePassed: true };
}

async function main() {
  if (await exists(LOCK_PATH)) throw new Error("Generator lock still exists; checkpoint is not quiescent.");
  await regularFile(MANIFEST_PATH, "Pro manifest");
  await regularFile(RAW_MANIFEST_PATH, "Raw Flash manifest");
  const manifestBytes = await readFile(MANIFEST_PATH);
  const rawBytes = await readFile(RAW_MANIFEST_PATH);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (
    manifest?.schemaVersion !== 1 || manifest?.generatorVersion !== "pro-aoede-production-v1" ||
    manifest?.isolatedProduction !== true || manifest?.model !== "gemini-2.5-pro-preview-tts" ||
    manifest?.voice !== "Aoede" || !HASH.test(manifest?.plan?.planSha256 || "") ||
    manifest?.source?.manifestSha256 !== sha256(rawBytes) || !Array.isArray(manifest?.jobs) ||
    manifest.jobs.length !== 134 || !Array.isArray(manifest?.clips) || manifest.clips.length !== 134
  ) throw new Error("Pro checkpoint manifest identity is invalid.");
  if (new Set(manifest.jobs.map((job) => job.id)).size !== 134) throw new Error("Duplicate job IDs.");
  if (new Set(manifest.jobs.map((job) => job.outputPath)).size !== 134) throw new Error("Duplicate output paths.");
  const clips = new Map(manifest.clips.map((clip) => [clip.id, clip]));
  const complete = manifest.jobs.filter((job) => job.status === "complete");
  const pending = manifest.jobs.filter((job) => job.status !== "complete");
  const responseIds = new Set();
  const batchNames = new Set();
  const totals = { bytes: 0, durationSeconds: 0, promptTokens: 0, outputTokens: 0, estimatedUsd: 0 };

  for (const job of complete) {
    const clip = clips.get(job.id);
    const audioPath = resolve(ROOT, job.outputPath);
    const receiptPath = resolve(ROOT, job.receiptPath || "");
    if (!within(audioPath, join(ROOT, "audio")) || !within(receiptPath, join(ROOT, ".receipts"))) {
      throw new Error(`Path escapes approved root for ${job.id}.`);
    }
    const media = await inspectAndDecode(audioPath);
    const receiptBytes = await readFile(receiptPath);
    const receipt = JSON.parse(receiptBytes.toString("utf8"));
    const receiptSha256 = sha256(receiptBytes);
    if (
      media.sha256 !== job.audioSha256 || media.sha256 !== clip?.fileHash ||
      media.bytes !== job.bytes || Math.abs(media.durationSeconds - job.durationSeconds) > 0.002 ||
      receiptSha256 !== job.receiptSha256
    ) throw new Error(`Audio/manifest hash or media mismatch for ${job.id}.`);
    assertProGeneratorReceipt({ receipt, sourceJob: job, sourceClip: clip, sourceManifest: manifest, receiptSha256 });

    const requestPlanSha256 = receipt.batch.requestPlanSha256;
    const journalPath = join(ROOT, "batch-runs", `batch-${requestPlanSha256.slice(0, 20)}.json`);
    await regularFile(journalPath, "Supporting Batch journal");
    const journal = JSON.parse(await readFile(journalPath, "utf8"));
    const planned = journal?.jobs?.[receipt.batch.requestIndex];
    if (
      journal?.phase !== "applied" || journal?.failureCount !== 0 ||
      journal?.requestPlanSha256 !== requestPlanSha256 || journal?.batchName !== receipt.batch.name ||
      journal?.poll?.state !== "BATCH_STATE_SUCCEEDED" ||
      Number(journal?.poll?.stats?.successfulRequestCount) !== journal?.jobs?.length ||
      planned?.id !== job.id || planned?.promptSha256 !== job.promptSha256 || planned?.requestSha256 !== job.requestSha256
    ) throw new Error(`Supporting Batch journal mismatch for ${job.id}.`);
    if (journal?.results?.[job.id]?.status !== "complete") throw new Error(`Journal result is incomplete for ${job.id}.`);

    responseIds.add(receipt.modelResponse.responseId);
    batchNames.add(receipt.batch.name);
    totals.bytes += media.bytes;
    totals.durationSeconds += media.durationSeconds;
    totals.promptTokens += Number(receipt.costEstimate?.promptTokens || 0);
    totals.outputTokens += Number(receipt.costEstimate?.outputTokens || 0);
    totals.estimatedUsd += Number(receipt.costEstimate?.estimatedUsd || 0);
  }
  if (responseIds.size !== complete.length) throw new Error("Completed jobs do not have unique response IDs.");
  for (const job of pending) {
    const path = resolve(ROOT, job.outputPath);
    if (await exists(path)) throw new Error(`Non-complete job has an untracked output: ${job.id}.`);
  }
  console.log(JSON.stringify({
    pass: true,
    manifestSha256: sha256(manifestBytes),
    planSha256: manifest.plan.planSha256,
    sourceManifestSha256: manifest.source.manifestSha256,
    complete: complete.length,
    pending: pending.length,
    batches: batchNames.size,
    uniqueResponseIds: responseIds.size,
    fullDecodePassed: complete.length,
    ...totals,
  }, null, 2));
}

main().catch((error) => {
  process.stderr.write(`Pro checkpoint verification failed: ${error?.message}\n`);
  process.exitCode = 1;
});
