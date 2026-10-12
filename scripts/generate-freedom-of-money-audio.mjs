#!/usr/bin/env node

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LIBRARY_BOOKS } from "../app/book-data.ts";
import {
  MODEL, ROOT, VOICE, apiKey, atomicJson, exists, inspect, makeStandard,
  safeMessage, sha256,
} from "./generate-new-book-audio.mjs";

const WORK = join(ROOT, "work", "freedom-of-money-audio");
const PROMPT_VERSION = "memoir-normal-speed-v1";
const book = LIBRARY_BOOKS.find((candidate) => candidate.slug === "freedom-of-money");
const availableJobs = book.pages.flatMap((page, index) => page.transcript ? [{
  page: index + 1,
  printedPage: index - 9,
  text: page.transcript,
  output: join(ROOT, "public", "library", book.slug, "audio-standard", `${String(index + 1).padStart(3, "0")}.mp3`),
}] : []);

function parseArguments(args) {
  const options = { dryRun: false, startPage: availableJobs[0].page, endPage: availableJobs.at(-1).page };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--start-page" || argument === "--end-page") {
      const value = Number(args[++index]);
      if (!Number.isInteger(value)) throw new Error(`${argument} requires an integer PDF page number`);
      options[argument === "--start-page" ? "startPage" : "endPage"] = value;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (options.startPage < availableJobs[0].page || options.endPage > availableJobs.at(-1).page || options.endPage < options.startPage) {
    throw new Error("The requested page range must have prepared body-page transcripts");
  }
  return options;
}
const direction = [
  "Read the supplied memoir excerpt as a professional audiobook narrator for an adult listener.",
  "Use clear, natural General American English at a normal conversational reading pace, about 155 to 170 words per minute.",
  "Use thoughtful, understated expression and natural sentence pauses. Do not use a slow teaching pace or exaggerated acting.",
  "Read every supplied word exactly once, in order, including chapter headings. Do not add an introduction, summary, commentary, or closing words.",
  "The excerpt may begin or end in the middle of a sentence because it is one original book page. Preserve the supplied text; do not complete missing sentences.",
  "Read only the text between TEXT START and TEXT END. Do not speak the markers.",
].join(" ");

function tokens(text) {
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'").replace(/(?<=\d),(?=\d)/g, "")
    .replace(/\b(\d+)(?:st|nd|rd|th)\b/gi, "$1")
    .toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)*/g) ?? [];
}

function distance(expected, actual) {
  let row = Array.from({ length: actual.length + 1 }, (_, index) => index);
  for (let i = 0; i < expected.length; i++) {
    const next = [i + 1];
    for (let j = 0; j < actual.length; j++) {
      next.push(Math.min(next[j] + 1, row[j + 1] + 1, row[j] + (expected[i] === actual[j] ? 0 : 1)));
    }
    row = next;
  }
  return row[actual.length];
}

async function request(key, model, body, label) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    let response;
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(240_000),
      });
    } catch (error) {
      if (attempt === 4) throw error;
      process.stdout.write(`${label}: network retry ${attempt}\n`);
      continue;
    }
    const payload = await response.json().catch(() => ({}));
    if (response.ok) return payload;
    if ((response.status === 429 || response.status >= 500) && attempt < 4) {
      const seconds = Number(payload?.error?.message?.match(/retry in ([0-9.]+)s/i)?.[1] ?? 30);
      const delay = Math.min(60_000, Math.max(3_000, seconds * 1000));
      process.stdout.write(`${label}: retry ${attempt} in ${Math.ceil(delay / 1000)}s (HTTP ${response.status})\n`);
      await new Promise((resolveWait) => setTimeout(resolveWait, delay));
      continue;
    }
    throw new Error(`${label}: HTTP ${response.status}: ${safeMessage(payload?.error?.message)}`);
  }
  throw new Error(`${label}: no response`);
}

async function verify(key, job, info) {
  const payload = await request(key, "gemini-2.5-flash", {
    contents: [{ parts: [
      { text: "Transcribe every audible spoken word in this audiobook recording exactly and in order. Listen only to the audio. Do not infer missing words, summarize, correct, or add anything. Return JSON with one string field: transcript." },
      { inlineData: { mimeType: "audio/mpeg", data: (await readFile(job.output)).toString("base64") } },
    ] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: { type: "OBJECT", properties: { transcript: { type: "STRING" } }, required: ["transcript"] },
    },
  }, `Page ${job.page} transcript`);
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
  const transcript = JSON.parse(text).transcript;
  if (typeof transcript !== "string") throw new Error(`Page ${job.page}: empty transcription`);
  const expected = tokens(job.text);
  const actual = tokens(transcript);
  const wordErrorRate = distance(expected, actual) / expected.length;
  const wordsPerMinute = expected.length * 60 / info.durationSeconds;
  // Independent transcription catches omitted or repeated material; token differences
  // include legitimate spoken forms of dates, numbers, and proper names.
  const complete = wordErrorRate <= 0.09 &&
    distance(expected.slice(-8), actual.slice(-8)) <= 2 &&
    distance(expected.slice(0, 8), actual.slice(0, 8)) <= 3;
  return {
    transcript, wordErrorRate, wordsPerMinute, complete,
    modelVersion: payload.modelVersion ?? null,
    responseId: payload.responseId ?? null,
  };
}

async function generate(key, job) {
  const prompt = `${direction}\n\nTEXT START\n${job.text}\nTEXT END`;
  const requestHash = sha256(JSON.stringify({ model: MODEL, voice: VOICE, promptVersion: PROMPT_VERSION, prompt }));
  const receiptPath = join(WORK, "receipts", `${job.page}.json`);
  if (await exists(receiptPath) && await exists(job.output)) {
    const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
    const info = await inspect(job.output);
    if (receipt.requestHash === requestHash && receipt.audio.sha256 === info.sha256 && receipt.verification?.complete &&
      receipt.verification.wordsPerMinute >= 120 && receipt.verification.wordsPerMinute <= 215) {
      process.stdout.write(`Verified existing page ${job.page} (printed ${job.printedPage})\n`);
      return receipt;
    }
  }
  for (let attempt = 1; attempt <= 3; attempt++) {
    process.stdout.write(`Generating page ${job.page} (printed ${job.printedPage}), attempt ${attempt}\n`);
    const payload = await request(key, MODEL, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
      },
    }, `Page ${job.page} TTS`);
    const candidate = payload?.candidates?.[0];
    const data = candidate?.content?.parts?.find((part) => part.inlineData)?.inlineData;
    if (candidate?.finishReason !== "STOP" || !data?.data || !/(pcm|l16)/i.test(data.mimeType ?? "") ||
      Number(data.mimeType.match(/rate=(\d+)/i)?.[1] ?? 24000) !== 24000) {
      if (attempt < 3) continue;
      throw new Error(`Page ${job.page}: no complete PCM audio returned`);
    }
    const pcm = Buffer.from(data.data, "base64");
    if (pcm.length < 1024 || pcm.length % 2) throw new Error(`Page ${job.page}: invalid PCM`);
    const temporary = await mkdtemp(join(tmpdir(), "freedom-of-money-audio-"));
    try {
      const pcmPath = join(temporary, "source.pcm");
      await writeFile(pcmPath, pcm, { mode: 0o600 });
      // This only encodes and normalizes volume. It performs no speed transform.
      await makeStandard(pcmPath, job.output);
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
    const info = await inspect(job.output);
    const verification = await verify(key, job, info);
    const receipt = {
      page: job.page, printedPage: job.printedPage,
      model: MODEL, voice: VOICE, promptVersion: PROMPT_VERSION,
      requestHash, textSha256: sha256(job.text), text: job.text,
      speed: "standard", playbackRate: 1, speedTransform: null,
      audio: info, verification,
      modelVersion: payload.modelVersion ?? null,
      responseId: payload.responseId ?? null,
      createdAt: new Date().toISOString(),
    };
    await atomicJson(receiptPath, receipt);
    process.stdout.write(`Page ${job.page}: ${info.durationSeconds.toFixed(1)}s, ${verification.wordsPerMinute.toFixed(0)} words/min, transcription differences ${(verification.wordErrorRate * 100).toFixed(1)}%\n`);
    if (verification.complete && verification.wordsPerMinute >= 120 && verification.wordsPerMinute <= 215) return receipt;
    if (attempt === 3) throw new Error(`Page ${job.page}: audio did not pass completeness or normal-speed checks`);
    process.stdout.write(`Page ${job.page}: regenerating after verification\n`);
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const jobs = availableJobs.filter((job) => job.page >= options.startPage && job.page <= options.endPage);
  if (jobs.length !== options.endPage - options.startPage + 1 || jobs.some((job) => !job.text)) {
    throw new Error("Every requested body page must have a transcript");
  }
  if (options.dryRun) {
    process.stdout.write(JSON.stringify(jobs.map(({ page, printedPage, text }) => ({ page, printedPage, words: tokens(text).length })), null, 2) + "\n");
    return;
  }
  process.env.GEMINI_KEY_PROJECT ??= "gen-lang-client-0243749216";
  process.env.GEMINI_KEY_NAME ??= "371612a2-b9b8-449a-b866-741d1dc11b5c";
  const key = await apiKey();
  await mkdir(WORK, { recursive: true });
  const queue = [...jobs];
  const receipts = [];
  const worker = async () => {
    while (queue.length) {
      const job = queue.shift();
      receipts.push(await generate(key, job));
    }
  };
  const results = await Promise.allSettled([worker(), worker(), worker()]);
  const allReceipts = [];
  for (const job of availableJobs) {
    const path = join(WORK, "receipts", `${job.page}.json`);
    if (!await exists(path) || !await exists(job.output)) continue;
    const receipt = JSON.parse(await readFile(path, "utf8"));
    if (receipt.textSha256 !== sha256(job.text) || !receipt.verification?.complete ||
      receipt.verification.wordsPerMinute < 120 || receipt.verification.wordsPerMinute > 215) continue;
    const info = await inspect(job.output);
    if (receipt.audio.sha256 === info.sha256) allReceipts.push(receipt);
  }
  await atomicJson(join(WORK, "manifest.json"), {
    bookSlug: book.slug, expectedPages: availableJobs.map((job) => job.page),
    model: MODEL, voice: VOICE, speed: "standard", childVersions: 0,
    receipts: allReceipts.sort((a, b) => a.page - b.page),
    completed: allReceipts.length === availableJobs.length,
    batchPages: jobs.map((job) => job.page), batchCompleted: receipts.length === jobs.length,
    updatedAt: new Date().toISOString(),
  });
  const failure = results.find((result) => result.status === "rejected");
  if (failure) throw failure.reason;
  process.stdout.write(`Ready: ${receipts.length} verified normal-speed clips in this batch; ${allReceipts.length} total. No slow versions generated.\n`);
}

main().catch((error) => {
  process.stderr.write(`${safeMessage(error?.message)}\n`);
  process.exitCode = 1;
});
