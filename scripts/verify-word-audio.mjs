#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const AUDIO_MANIFEST_PATH = join(ROOT, "work", "word-audio-production", "manifest.json");
const REPORT_PATH = join(ROOT, "work", "word-audio-production", "transcript-verification.json");
const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const PROMPT = [
  "Transcribe every audible spoken word in this very short recording exactly and in order.",
  "Do not use the file label or any expected answer; listen only to the audio.",
  "Do not correct, explain, infer, add, omit, or repeat anything.",
  "Return JSON containing exactly one string field named transcript.",
].join(" ");
const sensitiveValues = new Set();

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalise(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[a-z]+(?:'[a-z]+)*/g)?.join(" ") || "";
}

function safeMessage(value) {
  let safe = String(value || "Unknown error")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted Google API key]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
  for (const secret of sensitiveValues) safe = safe.split(secret).join("[redacted]");
  return safe.replace(/[\r\n]+/g, " ").slice(0, 500);
}

async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
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
  if (!project || !keyName) throw new Error("Set GEMINI_API_KEY, or both GEMINI_KEY_PROJECT and GEMINI_KEY_NAME.");
  let stdout;
  try {
    ({ stdout } = await run(
      "gcloud",
      ["services", "api-keys", "get-key-string", keyName, "--project", project, "--format=value(keyString)", "--quiet"],
      { encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 },
    ));
  } catch {
    throw new Error("gcloud could not retrieve the configured API key.");
  }
  const key = stdout.trim();
  if (!key || /\s/.test(key) || key.length < 20) throw new Error("gcloud returned an invalid API key.");
  sensitiveValues.add(key);
  return key;
}

function requestBody(audio) {
  return {
    contents: [{ parts: [
      { text: PROMPT },
      { inlineData: { mimeType: "audio/mpeg", data: audio.toString("base64") } },
    ] }],
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

function retryDelay(response, payload, attempt) {
  const header = Number(response.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0) return Math.ceil(header * 1000);
  const seconds = Number(payload?.error?.message?.match(/retry(?:\s+in|Delay[^\d]*)\s*([\d.]+)s/i)?.[1]);
  if (Number.isFinite(seconds)) return Math.ceil(seconds * 1000);
  return Math.min(60_000, 2_000 * (2 ** (attempt - 1)));
}

async function transcribe(key, audio, id) {
  for (let attempt = 1; attempt <= 7; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180_000);
    let response;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(requestBody(audio)),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      if (attempt === 7) throw error;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000 * attempt));
      continue;
    }
    clearTimeout(timeout);
    let payload;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok) {
      if ((response.status === 429 || response.status >= 500) && attempt < 7) {
        const delay = retryDelay(response, payload, attempt);
        process.stdout.write(`[retry ${attempt}/7] ${id}; waiting ${(delay / 1000).toFixed(1)}s\n`);
        await new Promise((resolvePromise) => setTimeout(resolvePromise, delay));
        continue;
      }
      throw new Error(`Transcription failed for ${id}: ${safeMessage(payload?.error?.message || response.status)}`);
    }
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    if (typeof parsed?.transcript !== "string") throw new Error(`Invalid transcription response for ${id}.`);
    return {
      transcript: parsed.transcript.trim(),
      responseId: payload?.responseId || null,
      modelVersion: payload?.modelVersion || null,
      usageMetadata: payload?.usageMetadata || null,
      attempts: attempt,
    };
  }
  throw new Error(`No transcription returned for ${id}.`);
}

async function main() {
  const manifest = JSON.parse(await readFile(AUDIO_MANIFEST_PATH, "utf8"));
  if (manifest?.model !== "gemini-2.5-pro-preview-tts" || manifest?.voice !== "Aoede" || manifest?.jobs?.length !== 50) {
    throw new Error("The 50-clip Pro + Aoede word manifest is not complete.");
  }
  let report = {
    schemaVersion: 1,
    verifier: "gemini-independent-word-transcript-v1",
    model: MODEL,
    promptSha256: sha256(PROMPT),
    expectedJobs: 50,
    updatedAt: new Date().toISOString(),
    records: [],
  };
  try {
    const existing = JSON.parse(await readFile(REPORT_PATH, "utf8"));
    if (existing?.model === MODEL && existing?.promptSha256 === sha256(PROMPT) && existing?.expectedJobs === 50) {
      report = existing;
    }
  } catch {
    // A missing report starts a fresh, resumable verification run.
  }
  const records = new Map(report.records.map((record) => [record.id, record]));
  const key = await apiKey();

  for (const [index, job] of manifest.jobs.entries()) {
    const audioPath = join(ROOT, "public", job.standardPath);
    const audio = await readFile(audioPath);
    const audioSha256 = sha256(audio);
    const existing = records.get(job.id);
    if (existing?.audioSha256 === audioSha256 && existing?.promptSha256 === sha256(PROMPT)) {
      process.stdout.write(`[${index + 1}/50] verified receipt ${job.id}: ${JSON.stringify(existing.transcript)}\n`);
      continue;
    }
    const response = await transcribe(key, audio, job.id);
    const expected = normalise(job.spokenText);
    const actual = normalise(response.transcript);
    const record = {
      id: job.id,
      expected: job.spokenText,
      transcript: response.transcript,
      expectedNormalised: expected,
      transcriptNormalised: actual,
      match: expected === actual,
      audioSha256,
      promptSha256: sha256(PROMPT),
      model: MODEL,
      modelVersion: response.modelVersion,
      responseId: response.responseId,
      requestAttempts: response.attempts,
      usageMetadata: response.usageMetadata,
      completedAt: new Date().toISOString(),
    };
    records.set(job.id, record);
    report.records = manifest.jobs.map((planned) => records.get(planned.id)).filter(Boolean);
    report.updatedAt = new Date().toISOString();
    await atomicJson(REPORT_PATH, report);
    process.stdout.write(`[${index + 1}/50] ${record.match ? "match" : "MISMATCH"} ${job.id}: ${JSON.stringify(record.transcript)}\n`);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000));
  }

  report.records = manifest.jobs.map((job) => records.get(job.id));
  report.updatedAt = new Date().toISOString();
  report.completedAt = new Date().toISOString();
  report.matches = report.records.filter((record) => record.match).length;
  report.mismatches = report.records.filter((record) => !record.match).map((record) => record.id);
  await atomicJson(REPORT_PATH, report);
  process.stdout.write(`Transcript verification: ${report.matches}/50 exact matches.\n`);
  if (report.mismatches.length) {
    throw new Error(`Transcript mismatches: ${report.mismatches.join(", ")}`);
  }
}

main().catch((error) => {
  process.stderr.write(`${safeMessage(error?.stack || error?.message)}\n`);
  process.exitCode = 1;
});
