import { execFile } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { BOOKS } from "../app/book-data.ts";
import { buildStoryNarrationSegments } from "../app/narration.ts";

const run = promisify(execFile);
const voice = process.env.STORY_VOICE || "Shelley (English (UK))";
const wordsPerMinute = process.env.STORY_WPM || "90";
const outputRoot = new URL("../public/audio/", import.meta.url);

function studioScript(text, purpose) {
  const segments = buildStoryNarrationSegments(text, purpose);
  return segments
    .map((segment, index) => {
      if (index === segments.length - 1) return segment.text;
      return `${segment.text} [[slnc ${segment.pauseAfterMs}]]`;
    })
    .join(" ");
}

async function generateClip({ book, text, filename, purpose }) {
  const folder = new URL(`${book.slug}/`, outputRoot);
  await mkdir(folder, { recursive: true });
  const aiff = join(tmpdir(), `story-garden-${book.slug}-${filename}-${process.pid}.aiff`);
  const output = new URL(`${filename}.m4a`, folder);

  try {
    await run("say", [
      "-v",
      voice,
      "-r",
      wordsPerMinute,
      "-o",
      aiff,
      studioScript(text, purpose),
    ]);
    await run("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      aiff,
      "-af",
      "loudnorm=I=-18:TP=-1.5:LRA=7",
      "-c:a",
      "aac",
      "-b:a",
      "48k",
      "-ac",
      "1",
      "-movflags",
      "+faststart",
      fileURLToPath(output),
    ]);
  } finally {
    await rm(aiff, { force: true });
  }
}

const jobs = BOOKS.flatMap((book) => [
  ...book.pages.map((page, index) => ({
    book,
    text: page.transcript,
    filename: String(index + 1).padStart(2, "0"),
    purpose: "story",
  })),
  { book, text: book.tasks.listen.audioText, filename: "listen", purpose: "practice" },
  { book, text: book.tasks.speak.modelLine, filename: "speak", purpose: "practice" },
  { book, text: book.tasks.read.passage, filename: "read", purpose: "practice" },
  { book, text: book.tasks.write.modelSentence, filename: "write", purpose: "practice" },
]);
let cursor = 0;
let finished = 0;

async function worker() {
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    await generateClip(job);
    finished += 1;
    process.stdout.write(`\rGenerated ${finished}/${jobs.length} narration clips`);
  }
}

await Promise.all(Array.from({ length: 3 }, () => worker()));
process.stdout.write(`\nStory voice: ${voice}, ${wordsPerMinute} words per minute\n`);
