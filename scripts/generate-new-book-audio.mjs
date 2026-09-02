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
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { BOOKS } from "../app/book-data.ts";
import { buildStoryNarrationSegments, prepareSpeechText } from "../app/narration.ts";
import { proPacingSettingsForJob } from "./aoede-pro-contract.mjs";

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORK_ROOT = join(ROOT, "work", "new-book-audio-production");
const MANIFEST_PATH = join(WORK_ROOT, "manifest.json");
const STANDARD_ROOT = join(ROOT, "public", "audio-standard");
const CHILD_ROOT = join(ROOT, "public", "audio");
const MODEL = "gemini-2.5-pro-preview-tts";
const VOICE = "Aoede";
const PROMPT_VERSION = "p1-p2-aoede-extension-v1";
const CHILD_TRANSFORM_VERSION = "aoede-extension-content-wpm-v1";
const REQUEST_DELAY_MS = 6_500;
const MAX_ATTEMPTS = 5;
const NEW_BOOK_SLUGS = new Set([
  "lazy-duck",
  "the-kings-cake",
  "chicken-rice",
  "marvel-3-tales-of-adventure",
  "dinosaur-david-lambert",
  "mr-gumpys-outing",
  "a-day-in-the-kitchen-with-grandma",
  "life-in-a-shell",
  "the-growl",
  "magnetic-max",
  "the-feast",
  "willy-and-hugh",
  "the-gruffalo",
  "predators-and-prey",
  "the-stars-of-chek-jawa",
  "dinosaur-school",
  "danny-dinosaur-goes-to-camp",
  "danny-dinosaur-school-days",
  "santas-moose",
  "horse-in-harrys-room",
  "danny-dinosaur-too-tall",
  "danny-dinosaur-sand-castle-contest",
  "danny-dinosaur-new-puppy",
  "sammy-the-seal",
  "danny-dinosaur-mind-manners",
  "danny-dinosaur-ride-a-bike",
]);
const sensitiveValues = new Set();

const BASE_PROMPT = [
  "Read the supplied English text as a warm, patient picture-book storyteller for a Singapore Primary 1 or Primary 2 learner.",
  "Use clear, neutral General American English at a gentle, natural pace of about 90 to 100 words per minute.",
  "Use natural phrasing, crisp consonants, and comfortable pauses so a young reader can follow each sentence.",
  "Sound warm and engaging, but calm and authentic: no baby talk, no cartoon voice, no sing-song delivery, and no exaggerated character acting.",
  "Speak only the supplied reading text, exactly once, preserving every word and its order.",
  "Do not add, omit, repeat, paraphrase, explain, spell, announce, or introduce anything.",
].join(" ");

const STORY_DIRECTION = [
  "Read this as a continuous story page.",
  "Give dialogue subtly distinct natural intonation without shouting.",
  "Let rhyme, repetition, and sound words be easy to hear, but keep them comfortably quiet and natural.",
].join(" ");

const TASK_DIRECTIONS = {
  listen: "Read this as one clear listening example, with a short natural pause between sentences.",
  speak: "Read this as one warm, fluent model line for the learner to imitate.",
  read: "Read this as a natural short passage, with phrasing that supports meaning.",
  write: "Read this as one calm, complete model sentence.",
};

function parseArguments(argv) {
  const options = { dryRun: false, limit: Number.POSITIVE_INFINITY };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--limit") {
      const limit = Number(argv[++index]);
      if (!Number.isInteger(limit) || limit < 1) throw new Error("--limit must be a positive integer.");
      options.limit = limit;
    } else throw new Error(`Unknown option: ${argument}`);
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
    if (/\s/.test(direct) || direct.length < 20) throw new Error("GEMINI_API_KEY is invalid.");
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
  const direction = job.kind === "story" ? STORY_DIRECTION : TASK_DIRECTIONS[job.taskType];
  return [
    BASE_PROMPT,
    direction,
    "Read only the text between READING TEXT START and READING TEXT END. Do not speak either marker.",
    "",
    "READING TEXT START",
    job.ttsText,
    "READING TEXT END",
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

function wordCount(text) {
  return text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length || 0;
}

function planJobs() {
  const selected = BOOKS.filter((book) => NEW_BOOK_SLUGS.has(book.slug));
  if (selected.length !== NEW_BOOK_SLUGS.size) throw new Error("One or more new books are missing from BOOKS.");
  const jobs = selected.flatMap((book) => {
    const pages = book.pages.flatMap((page, index) => {
      if (!page.audioSrc || !page.transcript.trim()) return [];
      const file = `${String(index + 1).padStart(2, "0")}.mp3`;
      return [{
        id: `${book.slug}/${file.slice(0, -4)}`,
        bookSlug: book.slug,
        bookTitle: book.title,
        kind: "story",
        taskType: null,
        displayText: page.transcript,
        standardPath: `audio-standard/${book.slug}/${file}`,
        childPath: `audio/${book.slug}/${file}`,
      }];
    });
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
      taskType,
      displayText,
      standardPath: `audio-standard/${book.slug}/${taskType}.mp3`,
      childPath: `audio/${book.slug}/${taskType}.mp3`,
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
      wordCount: wordCount(spokenText),
      displayTextSha256: sha256(job.displayText),
      spokenTextSha256: sha256(spokenText),
    };
    if (!enriched.spokenText.trim() || !enriched.ttsText.trim() || enriched.wordCount < 1) {
      throw new Error(`Empty audio job: ${job.id}`);
    }
    enriched.requestSha256 = sha256(stableJson({ model: MODEL, voice: VOICE, request: requestFor(enriched) }));
    return enriched;
  });
  if (new Set(jobs.map((job) => job.id)).size !== jobs.length) throw new Error("Duplicate audio job IDs.");
  return jobs;
}

async function fetchAudio(key, job) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180_000);
    let response;
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
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
    let payload = null;
    try { payload = await response.json(); } catch {}
    if (!response.ok) {
      const detail = safeMessage(payload?.error?.message || `${response.status} ${response.statusText}`);
      if ((response.status === 429 || response.status >= 500) && attempt < MAX_ATTEMPTS) {
        process.stdout.write(`Retrying ${job.id} after ${detail}\n`);
        await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt * 12_000));
        continue;
      }
      throw new Error(`Gemini rejected ${job.id}: ${detail}`);
    }
    const candidate = payload?.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find((part) => typeof part?.inlineData?.data === "string");
    const encoded = audioPart?.inlineData?.data?.replace(/\s/g, "");
    const mimeType = audioPart?.inlineData?.mimeType || "";
    if (
      candidate?.finishReason !== "STOP" ||
      !encoded ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) ||
      encoded.length % 4 !== 0 ||
      !/^audio\//i.test(mimeType) ||
      !/(?:pcm|l16)/i.test(mimeType)
    ) {
      if (attempt < MAX_ATTEMPTS) {
        process.stdout.write(`Retrying unusable audio for ${job.id}\n`);
        await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt * 8_000));
        continue;
      }
      throw new Error(`Gemini returned no usable PCM audio for ${job.id}.`);
    }
    const pcm = Buffer.from(encoded, "base64");
    if (pcm.length < 1_024 || pcm.length % 2) throw new Error(`Invalid PCM length for ${job.id}.`);
    return {
      pcm,
      mimeType,
      modelVersion: payload?.modelVersion || null,
      responseId: payload?.responseId || null,
      usageMetadata: payload?.usageMetadata || null,
    };
  }
  throw new Error(`No response for ${job.id}.`);
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

async function probe(path) {
  const { stdout } = await run(
    "ffprobe",
    ["-v", "error", "-show_entries", "stream=codec_name,sample_rate,channels:format=duration", "-of", "json", path],
    { encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 },
  );
  const result = JSON.parse(stdout);
  const stream = result?.streams?.[0];
  const durationSeconds = Number(result?.format?.duration);
  if (
    result?.streams?.length !== 1 ||
    stream?.codec_name !== "mp3" ||
    Number(stream?.sample_rate) !== 24_000 ||
    Number(stream?.channels) !== 1 ||
    !Number.isFinite(durationSeconds)
  ) throw new Error(`Invalid MP3 stream: ${path}`);
  return durationSeconds;
}

async function silenceMetrics(path, durationSeconds, words) {
  let stderr = "";
  try {
    ({ stderr } = await run(
      "ffmpeg",
      ["-nostdin", "-hide_banner", "-nostats", "-i", path, "-af", "silencedetect=noise=-40dB:d=0.05", "-f", "null", "-"],
      { encoding: "utf8", timeout: 60_000, maxBuffer: 4 * 1024 * 1024 },
    ));
  } catch (error) {
    stderr = String(error?.stderr || "");
    if (!stderr.includes("silence_")) throw error;
  }
  const intervals = [];
  let openStart = null;
  for (const match of stderr.matchAll(/silence_(start|end):\s*(-?\d+(?:\.\d+)?)/g)) {
    const value = Math.max(0, Math.min(durationSeconds, Number(match[2])));
    if (match[1] === "start") openStart = value;
    else if (openStart !== null && value >= openStart) {
      intervals.push({ start: openStart, end: value, duration: value - openStart });
      openStart = null;
    }
  }
  if (openStart !== null) intervals.push({ start: openStart, end: durationSeconds, duration: durationSeconds - openStart });
  const leading = intervals.find((interval) => interval.start <= 0.03) || null;
  const trailing = [...intervals].reverse().find((interval) => interval.end >= durationSeconds - 0.03) || null;
  const allSilence = intervals.reduce((sum, interval) => sum + interval.duration, 0);
  const leadingSeconds = leading?.duration || 0;
  const trailingSeconds = trailing && trailing !== leading ? trailing.duration : 0;
  const activeSeconds = Math.max(0.001, durationSeconds - allSilence);
  const contentSeconds = Math.max(0.001, durationSeconds - leadingSeconds - trailingSeconds);
  return {
    activeWpm: (words / activeSeconds) * 60,
    contentSeconds,
    contentWpm: (words / contentSeconds) * 60,
  };
}

async function makeChild(job, standard, destination) {
  const durationSeconds = await probe(standard);
  const metrics = await silenceMetrics(standard, durationSeconds, job.wordCount);
  const settings = proPacingSettingsForJob(job);
  const unconstrained = settings.minimumContentSeconds !== null
    ? Math.min(1, metrics.contentSeconds / settings.minimumContentSeconds, settings.activeWpmCap / metrics.activeWpm)
    : Math.min(1, settings.contentWpmTarget / metrics.contentWpm, settings.activeWpmCap / metrics.activeWpm);
  const tempo = Math.max(settings.tempoFloor, Math.min(1, unconstrained));
  await mkdir(dirname(destination), { recursive: true });
  await run(
    "ffmpeg",
    [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", standard,
      "-vn", "-af", `atempo=${tempo.toFixed(6)},adelay=100,apad=pad_dur=0.16,loudnorm=I=-18:TP=-2:LRA=7`,
      "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "64k", "-ar", "24000", "-ac", "1", destination,
    ],
    { encoding: "utf8", timeout: 120_000, maxBuffer: 4 * 1024 * 1024 },
  );
  return {
    tempo: Number(tempo.toFixed(6)),
    sourceActiveWpm: Number(metrics.activeWpm.toFixed(1)),
    sourceContentWpm: Number(metrics.contentWpm.toFixed(1)),
  };
}

async function inspect(path) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size < 4_000 || info.size > 2 * 1024 * 1024) {
    throw new Error(`Unsafe MP3 size at ${path}.`);
  }
  const durationSeconds = await probe(path);
  if (durationSeconds < 0.65 || durationSeconds > 240) throw new Error(`Unsafe MP3 duration at ${path}.`);
  await run("ffmpeg", ["-nostdin", "-v", "error", "-i", path, "-f", "null", "-"], {
    encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024,
  });
  return {
    bytes: info.size,
    durationSeconds: Number(durationSeconds.toFixed(3)),
    sha256: sha256(await readFile(path)),
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  await Promise.all(["ffmpeg", "ffprobe"].map((command) => run(command, ["-version"], {
    encoding: "utf8", timeout: 15_000, maxBuffer: 1024 * 1024,
  })));
  const jobs = planJobs();
  process.stdout.write(`Plan: ${jobs.length} new story and task clips in two paces.\n`);
  if (options.dryRun) {
    process.stdout.write(`${jobs.map((job) => job.id).join("\n")}\n`);
    return;
  }

  await Promise.all([mkdir(WORK_ROOT, { recursive: true }), mkdir(STANDARD_ROOT, { recursive: true }), mkdir(CHILD_ROOT, { recursive: true })]);
  let manifest = {
    schemaVersion: 1,
    model: MODEL,
    voice: VOICE,
    promptVersion: PROMPT_VERSION,
    childTransformVersion: CHILD_TRANSFORM_VERSION,
    expectedJobs: jobs.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    jobs: [],
  };
  if (await exists(MANIFEST_PATH)) {
    const loaded = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
    if (
      loaded?.schemaVersion !== 1 ||
      loaded?.model !== MODEL ||
      loaded?.voice !== VOICE ||
      loaded?.promptVersion !== PROMPT_VERSION ||
      loaded?.childTransformVersion !== CHILD_TRANSFORM_VERSION ||
      !Number.isInteger(loaded?.expectedJobs) ||
      loaded.expectedJobs > jobs.length ||
      !Array.isArray(loaded?.jobs)
    ) throw new Error("Existing new-book audio manifest has an incompatible identity.");
    manifest = { ...loaded, expectedJobs: jobs.length };
    if (manifest.jobs.length < jobs.length) delete manifest.completedAt;
  }

  const records = new Map(manifest.jobs.map((record) => [record.id, record]));
  const reusable = new Map();
  const key = await apiKey();
  let generated = 0;

  for (const [index, job] of jobs.entries()) {
    const standardPath = join(ROOT, "public", job.standardPath);
    const childPath = join(ROOT, "public", job.childPath);
    const existing = records.get(job.id);
    if (
      existing?.requestSha256 === job.requestSha256 &&
      await exists(standardPath) &&
      await exists(childPath)
    ) {
      const [standard, child] = await Promise.all([inspect(standardPath), inspect(childPath)]);
      if (standard.sha256 === existing.standard.sha256 && child.sha256 === existing.child.sha256) {
        reusable.set(job.requestSha256, { record: existing, standardPath, childPath });
        process.stdout.write(`[${index + 1}/${jobs.length}] verified ${job.id}\n`);
        continue;
      }
    }

    const duplicate = reusable.get(job.requestSha256);
    let decoded = null;
    let pacing = null;
    if (duplicate) {
      await Promise.all([mkdir(dirname(standardPath), { recursive: true }), mkdir(dirname(childPath), { recursive: true })]);
      await copyFile(duplicate.standardPath, standardPath);
      await copyFile(duplicate.childPath, childPath);
      pacing = duplicate.record.pacing;
      process.stdout.write(`[${index + 1}/${jobs.length}] copied duplicate ${job.id}\n`);
    } else {
      if (generated >= options.limit) {
        process.stdout.write(`Stopped after ${generated} new Gemini requests because of --limit.\n`);
        break;
      }
      decoded = await fetchAudio(key, job);
      const temporaryRoot = await mkdtemp(join(tmpdir(), "story-garden-new-book-"));
      try {
        const pcmPath = join(temporaryRoot, "source.pcm");
        await writeFile(pcmPath, decoded.pcm, { flag: "wx", mode: 0o600 });
        await makeStandard(pcmPath, standardPath);
        pacing = await makeChild(job, standardPath, childPath);
      } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
      }
      generated += 1;
      process.stdout.write(`[${index + 1}/${jobs.length}] generated ${job.id}\n`);
    }

    const [standard, child] = await Promise.all([inspect(standardPath), inspect(childPath)]);
    if (child.durationSeconds + 0.02 < standard.durationSeconds) {
      throw new Error(`Child version is unexpectedly shorter for ${job.id}.`);
    }
    const record = {
      ...job,
      model: MODEL,
      voice: VOICE,
      promptVersion: PROMPT_VERSION,
      requestSha256: job.requestSha256,
      pacing,
      standard,
      child,
      source: duplicate
        ? { type: "verified-copy", canonicalId: duplicate.record.id }
        : { type: "gemini", modelVersion: decoded.modelVersion, responseId: decoded.responseId },
      usageMetadata: duplicate ? null : decoded.usageMetadata,
      generatedAt: new Date().toISOString(),
    };
    records.set(job.id, record);
    reusable.set(job.requestSha256, { record, standardPath, childPath });
    manifest.jobs = jobs.map((planned) => records.get(planned.id)).filter(Boolean);
    manifest.updatedAt = new Date().toISOString();
    await atomicJson(MANIFEST_PATH, manifest);
    if (!duplicate && index < jobs.length - 1) {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, REQUEST_DELAY_MS));
    }
  }

  manifest.jobs = jobs.map((job) => records.get(job.id)).filter(Boolean);
  manifest.updatedAt = new Date().toISOString();
  manifest.planSha256 = sha256(stableJson(jobs.map((job) => ({ id: job.id, requestSha256: job.requestSha256 }))));
  if (manifest.jobs.length === jobs.length) manifest.completedAt = manifest.completedAt || new Date().toISOString();
  await atomicJson(MANIFEST_PATH, manifest);
  process.stdout.write(`Checkpoint: ${manifest.jobs.length}/${jobs.length} pairs complete; ${generated} new Gemini requests this run.\n`);
}

export {
  CHILD_TRANSFORM_VERSION,
  MANIFEST_PATH,
  MODEL,
  PROMPT_VERSION,
  ROOT,
  VOICE,
  apiKey,
  atomicJson,
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
