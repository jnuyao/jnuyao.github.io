#!/usr/bin/env node

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { STORY_GUIDES } from "../app/story-guide-data.ts";
import {
  MODEL,
  ROOT,
  VOICE,
  apiKey,
  atomicJson,
  exists,
  inspect,
  makeStandard,
  safeMessage,
  sha256,
  stableJson,
} from "./generate-new-book-audio.mjs";

const run = promisify(execFile);
const WORK_ROOT = join(ROOT, "work", "story-guide-audio-production-v2-full-english");
const MANIFEST_PATH = join(WORK_ROOT, "manifest.json");
const PROMPT_VERSION = "p1-bilingual-picture-book-guide-v2-full-english";
const REQUEST_DELAY_MS = 6_500;
const MAX_ATTEMPTS = 5;

const BASE_PROMPT = [
  "Read the supplied bilingual script as a warm, engaging picture-book guide for a Singapore Primary 1 child.",
  "Speak the Chinese in clear, natural Standard Mandarin at an unhurried parent-child storytelling pace.",
  "Pronounce every embedded English word or sentence in clear, neutral General American English, then switch back to Mandarin smoothly.",
  "The script contains a complete English page passage between short Mandarin teaching sections. Read every word of that English passage clearly and naturally without rushing it.",
  "Pause briefly when switching languages, and give the final English repeat-after-me line extra clarity so a child can imitate it.",
  "Use gentle expression, natural phrasing, and comfortable pauses that invite the child to look at the picture and think.",
  "Sound like a kind real teacher sharing a story: never robotic, rushed, babyish, theatrical, or sing-song.",
  "Speak only the supplied script, exactly once. Do not add, omit, repeat, paraphrase, explain, announce, or introduce anything.",
].join(" ");

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

function promptFor(job) {
  return [
    BASE_PROMPT,
    "Read only the text between STORY GUIDE START and STORY GUIDE END. Do not speak either marker.",
    "",
    "STORY GUIDE START",
    job.script,
    "STORY GUIDE END",
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
  const jobs = Object.entries(STORY_GUIDES).flatMap(([bookSlug, guide]) => {
    if (!guide) return [];
    return guide.pages.map((page, index) => {
      const number = String(index + 1).padStart(2, "0");
      const job = {
        id: `${bookSlug}/${number}`,
        bookSlug,
        pageNumber: index + 1,
        language: "zh-CN",
        mode: "bilingual-picture-book-guide",
        script: page.narration,
        keyEnglish: page.keyEnglish,
        outputPath: page.audioSrc.replace(/^\//, ""),
        scriptSha256: sha256(page.narration),
      };
      return {
        ...job,
        requestSha256: sha256(stableJson({
          model: MODEL,
          voice: VOICE,
          promptVersion: PROMPT_VERSION,
          request: requestFor(job),
        })),
      };
    });
  });
  if (!jobs.length) throw new Error("No story guide audio jobs were found.");
  if (new Set(jobs.map((job) => job.id)).size !== jobs.length) {
    throw new Error("Story guide audio job IDs must be unique.");
  }
  return jobs;
}

async function fetchAudio(key, job) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180_000);
    let response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify(requestFor(job)),
          signal: controller.signal,
        },
      );
    } catch (error) {
      clearTimeout(timer);
      if (attempt === MAX_ATTEMPTS) {
        throw new Error(`Request failed for ${job.id}: ${safeMessage(error?.message)}`);
      }
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
      modelVersion: payload?.modelVersion || null,
      responseId: payload?.responseId || null,
      usageMetadata: payload?.usageMetadata || null,
    };
  }
  throw new Error(`No response for ${job.id}.`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const jobs = planJobs();
  process.stdout.write(`Plan: ${jobs.length} bilingual story guide clips.\n`);
  if (options.dryRun) {
    process.stdout.write(`${jobs.map((job) => job.id).join("\n")}\n`);
    return;
  }

  await run("ffmpeg", ["-version"], {
    encoding: "utf8",
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
  });
  await mkdir(WORK_ROOT, { recursive: true });

  let manifest = {
    schemaVersion: 1,
    model: MODEL,
    voice: VOICE,
    promptVersion: PROMPT_VERSION,
    expectedJobs: jobs.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    jobs: [],
  };
  if (await exists(MANIFEST_PATH)) {
    const loaded = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
    if (
      loaded?.schemaVersion !== 1
      || loaded?.model !== MODEL
      || loaded?.voice !== VOICE
      || loaded?.promptVersion !== PROMPT_VERSION
      || !Array.isArray(loaded?.jobs)
    ) throw new Error("Existing story guide audio manifest has an incompatible identity.");
    manifest = { ...loaded, expectedJobs: jobs.length };
  }

  const records = new Map(manifest.jobs.map((record) => [record.id, record]));
  let generated = 0;
  let key = null;

  for (const [index, job] of jobs.entries()) {
    const outputPath = join(ROOT, "public", job.outputPath);
    const existing = records.get(job.id);
    if (existing?.requestSha256 === job.requestSha256 && await exists(outputPath)) {
      const audio = await inspect(outputPath);
      if (audio.sha256 === existing.audio?.sha256) {
        process.stdout.write(`[${index + 1}/${jobs.length}] verified ${job.id}\n`);
        continue;
      }
    }
    if (generated >= options.limit) {
      process.stdout.write(`Stopped after ${generated} new Gemini requests because of --limit.\n`);
      break;
    }
    key ??= await apiKey();
    const decoded = await fetchAudio(key, job);
    const temporaryRoot = await mkdtemp(join(tmpdir(), "story-guide-audio-"));
    try {
      const pcmPath = join(temporaryRoot, "source.pcm");
      await writeFile(pcmPath, decoded.pcm, { flag: "wx", mode: 0o600 });
      await mkdir(dirname(outputPath), { recursive: true });
      await makeStandard(pcmPath, outputPath);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
    const audio = await inspect(outputPath);
    records.set(job.id, {
      ...job,
      model: MODEL,
      voice: VOICE,
      promptVersion: PROMPT_VERSION,
      audio,
      source: {
        type: "gemini",
        modelVersion: decoded.modelVersion,
        responseId: decoded.responseId,
      },
      usageMetadata: decoded.usageMetadata,
      generatedAt: new Date().toISOString(),
    });
    generated += 1;
    manifest.jobs = jobs.map((planned) => records.get(planned.id)).filter(Boolean);
    manifest.updatedAt = new Date().toISOString();
    await atomicJson(MANIFEST_PATH, manifest);
    process.stdout.write(`[${index + 1}/${jobs.length}] generated ${job.id}\n`);
    if (index < jobs.length - 1) {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, REQUEST_DELAY_MS));
    }
  }

  manifest.jobs = jobs.map((job) => records.get(job.id)).filter(Boolean);
  manifest.expectedJobs = jobs.length;
  manifest.planSha256 = sha256(stableJson(
    jobs.map((job) => ({ id: job.id, requestSha256: job.requestSha256 })),
  ));
  manifest.updatedAt = new Date().toISOString();
  if (manifest.jobs.length === jobs.length) {
    manifest.completedAt = manifest.completedAt || new Date().toISOString();
  } else {
    delete manifest.completedAt;
  }
  await atomicJson(MANIFEST_PATH, manifest);
  process.stdout.write(
    `Checkpoint: ${manifest.jobs.length}/${jobs.length} guide clips complete; ${generated} new Gemini requests this run.\n`,
  );
}

export { MANIFEST_PATH, PROMPT_VERSION, planJobs, requestFor };

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${safeMessage(error?.stack || error?.message)}\n`);
    process.exitCode = 1;
  });
}
