#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { BOOKS } from "../app/book-data.ts";
import { WORD_SETS, WORDS_PER_BOOK } from "../app/word-data.ts";

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORK_ROOT = join(ROOT, "work", "word-audio-production");
const MANIFEST_PATH = join(WORK_ROOT, "manifest.json");
const STANDARD_ROOT = join(ROOT, "public", "word-audio-standard");
const CHILD_ROOT = join(ROOT, "public", "word-audio");
const MODEL = "gemini-2.5-pro-preview-tts";
const FLASH_REPAIR_MODEL = "gemini-2.5-flash-preview-tts";
const GEMINI31_REPAIR_MODEL = "gemini-3.1-flash-tts-preview";
const VOICE = "Aoede";
const PROMPT_VERSION = "p1-isolated-word-aoede-v1";
const EXPECTED = BOOKS.length * WORDS_PER_BOOK;
const REQUEST_DELAY_MS = 6_500;
const MAX_ATTEMPTS = 5;
const sensitiveValues = new Set();

const PRECISION_DIRECTIONS = {
  "mrs-wishy-washy/duck": "Precision retake: say duck one time only, with a clear final k sound, then become silent immediately.",
  "walking-through-jungle/ocean": "Precision retake: say the two-syllable word ocean one time only, OH-shun. Stop immediately after that single utterance.",
  "to-town/bike": "Final precision retake: begin with a short silent pause, then say the single audible word bike once in a natural citation form, release the final k clearly, and stop. There must be exactly one audible word.",
  "dans-lost-hat/cat": "Precision retake: say cat one time only, releasing a crisp final t sound, then become silent immediately.",
  "first-day-hari-raya/baju": "Precision retake: say the Singapore Malay word baju one time only, as two syllables, bah-joo. Stop immediately after it.",
  "first-day-hari-raya/kurung": "Precision retake: say the Singapore Malay word kurung one time only, as two syllables, koo-roong, ending with the ng sound. Stop immediately after it.",
  "lazy-duck/prowled": "Precision retake: say prowled one time only. Make the l sound clearly audible before the final d, so it sounds like prowl plus d, not proud. Stop immediately.",
  "mr-gumpys-outing/bleating": "Final precision retake: say bleating one time only as BLEE-TING, IPA /ˈbliːtɪŋ/. Keep a tiny natural syllable boundary after bleat and release a crisp unvoiced t before ing. Do not use a voiced d or an American t-flap; it must not sound like bleeding. Stop immediately after the single word.",
  "life-in-a-shell/tide": "Precision retake: say tide one time only, then become silent immediately. Do not add a rhyme, echo, example, or second word.",
  "the-growl/rumble": "Precision retake: say rumble exactly one time, then become silent immediately. Do not repeat or echo the word.",
};

const FLASH25_REPAIR_IDS = new Set([
  "walking-through-jungle/ocean",
]);

const FLASH31_REPAIR_IDS = new Set([
  "to-town/bike",
  "dans-lost-hat/cat",
  "first-day-hari-raya/baju",
  "first-day-hari-raya/kurung",
]);

const SIGNAL_REPAIRS = {};

const TTS_TEXT_OVERRIDES = {
  "mr-gumpys-outing/bleating": "bleat-ing",
};

function sourceModelFor(job) {
  if (FLASH25_REPAIR_IDS.has(job.id)) return FLASH_REPAIR_MODEL;
  if (FLASH31_REPAIR_IDS.has(job.id)) return GEMINI31_REPAIR_MODEL;
  return MODEL;
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
  return safe.replace(/[\r\n]+/g, " ").slice(0, 500);
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
  if (!project || !keyName) {
    throw new Error("Set GEMINI_API_KEY, or both GEMINI_KEY_PROJECT and GEMINI_KEY_NAME.");
  }
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

function promptFor(job) {
  const culturalDirection = job.bookSlug === "first-day-hari-raya" && ["baju", "kurung"].includes(job.wordId)
    ? "This is a Malay-origin word used in Singapore. Use its natural Singapore pronunciation, not an invented English phonics reading."
    : "Use clear, neutral General American English pronunciation suitable for a Singapore Primary 1 classroom.";
  const precisionDirection = PRECISION_DIRECTIONS[job.id];
  const targetText = TTS_TEXT_OVERRIDES[job.id] || job.spokenText;
  return [
    "Say the supplied target word as a warm, patient Primary 1 English teacher.",
    culturalDirection,
    "Use its natural standalone dictionary form, with crisp consonants and a calm friendly tone.",
    "Say only the target word, exactly once. Do not add an article, definition, spelling, example, introduction, or closing sound.",
    ...(precisionDirection ? [precisionDirection] : []),
    "Do not speak the markers.",
    "TARGET WORD START",
    targetText,
    "TARGET WORD END",
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
  const jobs = BOOKS.flatMap((book) => {
    const words = WORD_SETS[book.slug] ?? [];
    if (words.length !== WORDS_PER_BOOK) {
      throw new Error(`${book.slug} has ${words.length} words instead of ${WORDS_PER_BOOK}.`);
    }
    return words.map((word) => ({
      id: `${book.slug}/${word.id}`,
      bookSlug: book.slug,
      wordId: word.id,
      displayText: word.word,
      spokenText: word.word,
      standardPath: `word-audio-standard/${book.slug}/${word.id}.mp3`,
      childPath: `word-audio/${book.slug}/${word.id}.mp3`,
    }));
  });
  if (jobs.length !== EXPECTED || new Set(jobs.map((job) => job.id)).size !== EXPECTED) {
    throw new Error(`Expected ${EXPECTED} unique book-local word jobs.`);
  }
  for (const job of jobs) {
    if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(job.id)) throw new Error(`Unsafe job ID: ${job.id}`);
    if (!job.displayText.trim() || !job.spokenText.trim()) throw new Error(`Empty word: ${job.id}`);
    job.displayTextSha256 = sha256(job.displayText);
    job.spokenTextSha256 = sha256(job.spokenText);
    job.promptSha256 = sha256(promptFor(job));
    job.sourceModel = sourceModelFor(job);
    const requestIdentity = job.sourceModel === MODEL
      ? requestFor(job)
      : { model: job.sourceModel, request: requestFor(job) };
    job.signalRepair = SIGNAL_REPAIRS[job.id] || null;
    job.requestSha256 = sha256(stableJson(job.signalRepair
      ? { requestIdentity, signalRepair: job.signalRepair }
      : requestIdentity));
  }
  return jobs;
}

async function fetchAudio(key, job) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180_000);
    let response;
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${job.sourceModel}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(requestFor(job)),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      if (attempt === MAX_ATTEMPTS) throw new Error(`Request failed for ${job.id}: ${safeMessage(error?.message)}`);
      await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt * 8_000));
      continue;
    }
    clearTimeout(timer);
    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      const detail = safeMessage(payload?.error?.message || `${response.status} ${response.statusText}`);
      if ((response.status === 429 || response.status >= 500) && attempt < MAX_ATTEMPTS) {
        process.stdout.write(`Retrying ${job.id} after ${detail}\n`);
        await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt * 12_000));
        continue;
      }
      throw new Error(`Gemini rejected ${job.id}: ${detail}`);
    }
    return payload;
  }
  throw new Error(`No response for ${job.id}.`);
}

function decodePcm(payload, job) {
  const candidate = payload?.candidates?.[0];
  const audioPart = candidate?.content?.parts?.find((part) => typeof part?.inlineData?.data === "string");
  const encoded = audioPart?.inlineData?.data?.replace(/\s/g, "");
  if (!encoded || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
    throw new Error(`No valid PCM audio returned for ${job.id}.`);
  }
  const mimeType = audioPart.inlineData.mimeType || "";
  if (!/^audio\//i.test(mimeType) || !/(?:pcm|l16)/i.test(mimeType)) {
    throw new Error(`Unexpected audio type for ${job.id}: ${safeMessage(mimeType)}`);
  }
  const pcm = Buffer.from(encoded, "base64");
  if (pcm.length < 1_024 || pcm.length % 2) throw new Error(`Invalid PCM length for ${job.id}.`);
  if (candidate?.finishReason !== "STOP") throw new Error(`Unexpected finish reason for ${job.id}.`);
  return {
    pcm,
    mimeType,
    modelVersion: payload?.modelVersion || null,
    responseId: payload?.responseId || null,
    usageMetadata: payload?.usageMetadata || null,
  };
}

async function fetchDecodedAudio(key, job) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return decodePcm(await fetchAudio(key, job), job);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        process.stdout.write(`Retrying unusable audio for ${job.id} (attempt ${attempt + 1}/3)\n`);
        await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt * 8_000));
      }
    }
  }
  throw lastError;
}

async function makeStandard(pcmPath, destination) {
  await mkdir(dirname(destination), { recursive: true });
  await run(
    "ffmpeg",
    [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
      "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", pcmPath,
      "-vn", "-af", "adelay=120,apad=pad_dur=0.28,loudnorm=I=-18:TP=-2:LRA=7",
      "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "64k", "-ar", "24000", "-ac", "1", destination,
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
      "-vn", "-af", "atempo=0.88,adelay=100,apad=pad_dur=0.16,loudnorm=I=-18:TP=-2:LRA=7",
      "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "64k", "-ar", "24000", "-ac", "1", destination,
    ],
    { encoding: "utf8", timeout: 120_000, maxBuffer: 4 * 1024 * 1024 },
  );
}

async function applySignalRepair(job, standard) {
  const repair = job.signalRepair;
  if (!repair) return;
  const temporary = `${standard}.repair-${randomUUID()}.mp3`;
  try {
    await run(
      "ffmpeg",
      [
        "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", standard,
        "-vn", "-af", `atrim=end=${repair.trimEndSeconds},asetpts=PTS-STARTPTS,apad=pad_dur=${repair.trailingPadSeconds},loudnorm=I=-18:TP=-2:LRA=7`,
        "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "64k", "-ar", "24000", "-ac", "1", temporary,
      ],
      { encoding: "utf8", timeout: 120_000, maxBuffer: 4 * 1024 * 1024 },
    );
    await rename(temporary, standard);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function inspect(path) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size < 4_000 || info.size > 250_000) {
    throw new Error(`Unsafe MP3 at ${path}.`);
  }
  const { stdout } = await run(
    "ffprobe",
    ["-v", "error", "-show_entries", "stream=codec_name,sample_rate,channels:format=duration", "-of", "json", path],
    { encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 },
  );
  const probe = JSON.parse(stdout);
  const stream = probe?.streams?.[0];
  const durationSeconds = Number(probe?.format?.duration);
  if (probe?.streams?.length !== 1 || stream?.codec_name !== "mp3" || Number(stream?.sample_rate) !== 24_000 || Number(stream?.channels) !== 1 || durationSeconds < 0.65 || durationSeconds > 7) {
    throw new Error(`Invalid MP3 format or duration at ${path}.`);
  }
  await run("ffmpeg", ["-nostdin", "-v", "error", "-i", path, "-f", "null", "-"], {
    encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024,
  });
  return { bytes: info.size, durationSeconds, sha256: sha256(await readFile(path)) };
}

async function main() {
  for (const command of ["ffmpeg", "ffprobe"]) {
    await run(command, ["-version"], { encoding: "utf8", timeout: 15_000, maxBuffer: 1024 * 1024 });
  }
  const jobs = planJobs();
  if (![WORK_ROOT, STANDARD_ROOT, CHILD_ROOT].every((path) => within(path, ROOT))) {
    throw new Error("An output root escapes the project.");
  }
  await Promise.all([mkdir(WORK_ROOT, { recursive: true }), mkdir(STANDARD_ROOT, { recursive: true }), mkdir(CHILD_ROOT, { recursive: true })]);

  let manifest = {
    schemaVersion: 1,
    model: MODEL,
    voice: VOICE,
    promptVersion: PROMPT_VERSION,
    expectedJobs: EXPECTED,
    childTransform: { version: "word-child-atempo-v1", atempo: 0.88 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    jobs: [],
  };
  if (await exists(MANIFEST_PATH)) {
    const loaded = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
    if (
      loaded?.model !== MODEL ||
      loaded?.voice !== VOICE ||
      loaded?.promptVersion !== PROMPT_VERSION ||
      !Number.isInteger(loaded?.expectedJobs) ||
      loaded.expectedJobs > EXPECTED ||
      !Array.isArray(loaded?.jobs)
    ) {
      throw new Error("Existing word-audio manifest has an incompatible identity.");
    }
    manifest = { ...loaded, expectedJobs: EXPECTED };
  }
  const records = new Map(manifest.jobs.map((record) => [record.id, record]));
  const generatedBySpokenHash = new Map();
  const key = await apiKey();
  let generated = 0;

  for (const [index, job] of jobs.entries()) {
    const standardPath = join(ROOT, "public", job.standardPath);
    const childPath = join(ROOT, "public", job.childPath);
    const existing = records.get(job.id);
    if (existing?.requestSha256 === job.requestSha256 && await exists(standardPath) && await exists(childPath)) {
      const [standard, child] = await Promise.all([inspect(standardPath), inspect(childPath)]);
      if (standard.sha256 === existing.standard.sha256 && child.sha256 === existing.child.sha256) {
        generatedBySpokenHash.set(job.spokenTextSha256, existing);
        process.stdout.write(`[${index + 1}/${EXPECTED}] verified ${job.id}\n`);
        continue;
      }
    }

    let decoded = null;
    const duplicate = generatedBySpokenHash.get(job.spokenTextSha256);
    if (duplicate) {
      const duplicateStandard = join(ROOT, "public", duplicate.standardPath);
      const duplicateChild = join(ROOT, "public", duplicate.childPath);
      await Promise.all([mkdir(dirname(standardPath), { recursive: true }), mkdir(dirname(childPath), { recursive: true })]);
      await copyFile(duplicateStandard, standardPath);
      await copyFile(duplicateChild, childPath);
      process.stdout.write(`[${index + 1}/${EXPECTED}] copied verified duplicate ${job.id}\n`);
    } else {
      decoded = await fetchDecodedAudio(key, job);
      const temporaryRoot = await mkdtemp(join(tmpdir(), "story-garden-word-"));
      try {
        const pcmPath = join(temporaryRoot, "source.pcm");
        await writeFile(pcmPath, decoded.pcm, { flag: "wx", mode: 0o600 });
        await makeStandard(pcmPath, standardPath);
        await applySignalRepair(job, standardPath);
        await makeChild(standardPath, childPath);
      } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
      }
      generated += 1;
      process.stdout.write(`[${index + 1}/${EXPECTED}] generated ${job.id}\n`);
      if (index < jobs.length - 1) await new Promise((resolvePromise) => setTimeout(resolvePromise, REQUEST_DELAY_MS));
    }

    const [standard, child] = await Promise.all([inspect(standardPath), inspect(childPath)]);
    if (child.durationSeconds <= standard.durationSeconds) {
      throw new Error(`Child version is not slower for ${job.id}.`);
    }
    const record = {
      ...job,
      model: job.sourceModel,
      voice: VOICE,
      promptVersion: PROMPT_VERSION,
      standardPath: job.standardPath,
      childPath: job.childPath,
      standard,
      child,
      source: duplicate ? { type: "verified-copy", canonicalId: duplicate.id } : { type: "gemini", requestedModel: job.sourceModel, modelVersion: decoded.modelVersion, responseId: decoded.responseId },
      signalRepair: job.signalRepair,
      usageMetadata: duplicate ? null : decoded.usageMetadata,
      generatedAt: new Date().toISOString(),
    };
    records.set(job.id, record);
    generatedBySpokenHash.set(job.spokenTextSha256, record);
    manifest.jobs = jobs.map((planned) => records.get(planned.id)).filter(Boolean);
    manifest.updatedAt = new Date().toISOString();
    await atomicJson(MANIFEST_PATH, manifest);
  }

  manifest.jobs = jobs.map((job) => records.get(job.id));
  if (manifest.jobs.some((record) => !record) || manifest.jobs.length !== EXPECTED) {
    throw new Error("Word-audio manifest is incomplete.");
  }
  manifest.completedAt = manifest.completedAt || new Date().toISOString();
  manifest.updatedAt = new Date().toISOString();
  manifest.planSha256 = sha256(stableJson(jobs.map((job) => ({ id: job.id, requestSha256: job.requestSha256 }))));
  await atomicJson(MANIFEST_PATH, manifest);
  process.stdout.write(`Complete: ${EXPECTED} book-local pairs; ${generated} new Gemini requests this run.\n`);
}

export {
  EXPECTED,
  MANIFEST_PATH,
  MODEL,
  PROMPT_VERSION,
  ROOT,
  VOICE,
  apiKey,
  applySignalRepair,
  atomicJson,
  decodePcm,
  exists,
  inspect,
  makeChild,
  makeStandard,
  planJobs,
  requestFor,
  safeMessage,
  sha256,
  stableJson,
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${safeMessage(error?.stack || error?.message)}\n`);
    process.exitCode = 1;
  });
}
