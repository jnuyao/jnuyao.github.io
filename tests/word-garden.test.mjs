import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

const BOOK_SLUGS = [
  "dan-the-flying-man",
  "mrs-wishy-washy",
  "walking-through-jungle",
  "to-town",
  "the-hungry-giant",
  "ants-in-a-hurry",
  "dans-lost-hat",
  "baby-sister-came-home",
  "mid-autumn-festival",
  "first-day-hari-raya",
  "lazy-duck",
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
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normaliseText(value) {
  return value
    .normalize("NFKC")
    .replace(/[“”]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9']+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function loadCourseModules() {
  const directory = await mkdtemp(join(tmpdir(), "story-garden-tests-"));
  const files = [
    "story-page-sides",
    "book-data",
    "art-studio-data",
    "word-data",
    "word-progress",
    "progress",
  ];
  try {
    for (const name of files) {
      let source = await readFile(new URL(`../app/${name}.ts`, import.meta.url), "utf8");
      source = source.replace(
        /from\s+(["'])(\.\/[a-z0-9-]+)(?:\.ts)?\1/g,
        "from $1$2.mjs$1",
      );
      const transpiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
        fileName: `${name}.ts`,
        reportDiagnostics: true,
      });
      const errors = (transpiled.diagnostics ?? []).filter(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
      );
      assert.deepEqual(
        errors,
        [],
        `${name}.ts did not transpile cleanly: ${errors.map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")).join("; ")}`,
      );
      await writeFile(join(directory, `${name}.mjs`), transpiled.outputText);
    }
    const cacheBust = `?test=${process.pid}-${Date.now()}-${Math.random()}`;
    const [bookData, wordData, wordProgress, progress] = await Promise.all([
      import(`${pathToFileURL(join(directory, "book-data.mjs")).href}${cacheBust}`),
      import(`${pathToFileURL(join(directory, "word-data.mjs")).href}${cacheBust}`),
      import(`${pathToFileURL(join(directory, "word-progress.mjs")).href}${cacheBust}`),
      import(`${pathToFileURL(join(directory, "progress.mjs")).href}${cacheBust}`),
    ]);
    return { bookData, wordData, wordProgress, progress };
  } finally {
    // Imported ESM modules are already in memory; their temporary source can go.
    await rm(directory, { recursive: true, force: true });
  }
}

test("thirty-two books each expose five unique, story-grounded words", async () => {
  const { bookData, wordData } = await loadCourseModules();
  assert.equal(bookData.BOOKS.length, 32);
  assert.equal(wordData.WORDS_PER_BOOK, 5);
  assert.deepEqual(Object.keys(wordData.WORD_SETS).sort(), [...BOOK_SLUGS].sort());

  let total = 0;
  for (const book of bookData.BOOKS) {
    const words = wordData.WORD_SETS[book.slug];
    assert.equal(words.length, 5, `${book.slug} word count`);
    assert.equal(new Set(words.map((word) => word.id)).size, 5, `${book.slug} word IDs`);
    const story = normaliseText(book.pages.map((page) => page.transcript).join(" "));

    for (const word of words) {
      assert.match(word.id, /^[a-z0-9-]+$/, `${book.slug}/${word.id} safe ID`);
      assert.ok(word.word.trim(), `${book.slug}/${word.id} display word`);
      assert.ok(word.meaning.trim() && word.meaningZh.trim(), `${book.slug}/${word.id} two-language clue`);
      assert.ok(Number.isInteger(word.pageIndex), `${book.slug}/${word.id} page index is an integer`);
      assert.ok(word.pageIndex >= 0 && word.pageIndex < book.pages.length, `${book.slug}/${word.id} page index`);
      assert.equal(
        normaliseText(word.soundParts.join("")),
        normaliseText(word.word),
        `${book.slug}/${word.id} sound parts rebuild the word`,
      );
      assert.ok(
        story.includes(normaliseText(word.word)),
        `${book.slug}/${word.id} must appear in its story`,
      );
      const page = normaliseText(book.pages[word.pageIndex].transcript);
      assert.ok(
        page.includes(normaliseText(word.example)),
        `${book.slug}/${word.id} example must come from its linked page`,
      );
      total += 1;
    }
  }
  assert.equal(total, 160);
});

test("v2 progress migrates to v3 without losing story or mission work", async () => {
  const { bookData, progress } = await loadCourseModules();
  const book = bookData.BOOKS[0];
  const longDraft = "A".repeat(400);
  const migrated = progress.normaliseProgress({
    version: 2,
    books: {
      [book.slug]: {
        lastPage: 999,
        readPages: [0, 1, 1, book.pages.length, "2"],
        steps: { listen: true, speak: false, read: true, write: false },
        writingDraft: longDraft,
        completedAt: "2026-07-15T12:34:56.000Z",
        lastOpened: 12345,
        unknown: "drop me",
      },
      "not-a-course-book": { steps: { listen: true } },
    },
  });

  assert.equal(migrated.version, 3);
  assert.deepEqual(Object.keys(migrated.books), [book.slug]);
  assert.equal(migrated.books[book.slug].lastPage, book.pages.length - 1);
  assert.deepEqual(migrated.books[book.slug].readPages, [0, 1]);
  assert.deepEqual(migrated.books[book.slug].steps, {
    listen: true,
    speak: false,
    read: true,
    write: false,
  });
  assert.equal(migrated.books[book.slug].writingDraft.length, 240);
  assert.deepEqual(migrated.books[book.slug].wordPractice, { words: {} });
  assert.equal(migrated.books[book.slug].lastOpened, 12345);
});

test("v3 word progress is allow-listed, bounded and mastery is deterministic", async () => {
  const { bookData, wordData, wordProgress, progress } = await loadCourseModules();
  const book = bookData.BOOKS[0];
  const [first, second] = wordData.WORD_SETS[book.slug];
  const clean = progress.normaliseProgress({
    version: 3,
    books: {
      [book.slug]: {
        lastPage: 0,
        readPages: [],
        steps: {},
        wordPractice: {
          words: {
            [first.id]: {
              readConfirmed: true,
              spelling: "correct",
              attempts: 10_000,
              lastPractisedAt: 123,
              rawAnswer: "must disappear",
              recording: "blob:must-disappear",
            },
            [second.id]: { readConfirmed: true, spelling: "magic", attempts: -8 },
            unknown: { readConfirmed: true, spelling: "correct", attempts: 1 },
          },
          completedAt: "x".repeat(100),
        },
      },
    },
  });
  const wordState = clean.books[book.slug].wordPractice;
  assert.deepEqual(Object.keys(wordState.words).sort(), [first.id, second.id].sort());
  assert.deepEqual(wordState.words[first.id], {
    readConfirmed: true,
    spelling: "correct",
    attempts: 99,
    lastPractisedAt: 123,
  });
  assert.equal(wordState.words[second.id].spelling, "new");
  assert.equal(wordState.words[second.id].attempts, 0);
  assert.equal(wordState.completedAt.length, 40);
  assert.equal(wordProgress.wordIsMastered(wordState.words[first.id]), true);
  assert.equal(wordProgress.wordIsMastered(wordState.words[second.id]), false);
  assert.equal(
    wordProgress.wordIsMastered({ readConfirmed: true, spelling: "supported", attempts: 2 }),
    false,
    "copying a revealed answer must stay in the review queue",
  );
  assert.deepEqual(progress.normaliseProgress({ version: 99, books: {} }), { version: 3, books: {} });
});

test("word practice keeps the microphone optional, local and unscored", async () => {
  const source = await readFile(new URL("../app/word-garden.tsx", import.meta.url), "utf8");
  assert.match(source, /navigator\.mediaDevices\.getUserMedia\(\{\s*audio:\s*true\s*\}\)/);
  const start = source.indexOf("const startRecording");
  const microphone = source.indexOf("getUserMedia", start);
  const stopModel = source.indexOf("narrator.stop()", start);
  assert.ok(start >= 0 && stopModel > start && stopModel < microphone);
  assert.match(source, /window\.setTimeout\(stopRecording,\s*10_000\)/);
  assert.match(source, /URL\.createObjectURL\(blob\)/);
  assert.match(source, /URL\.revokeObjectURL/);
  assert.match(source, /getTracks\(\)\.forEach\(\(track\)\s*=>\s*track\.stop\(\)\)/);
  assert.match(source, /never uploaded and is deleted when you leave/i);
  assert.match(source, /No scores for your accent/i);
  assert.doesNotMatch(source, /SpeechRecognition|webkitSpeechRecognition|FormData|XMLHttpRequest|sendBeacon|WebSocket/);
  assert.doesNotMatch(source, /fetch\s*\(|localStorage|indexedDB|caches\.open/);
  assert.doesNotMatch(source, /phoneme.{0,40}(?:score|confidence)|accent.{0,40}(?:score|rating)/i);
});

test("dictation disables answer helpers and requires a guided rebuild after two misses", async () => {
  const source = await readFile(new URL("../app/word-garden.tsx", import.meta.url), "utf8");
  assert.match(source, /\.normalize\(["']NFKC["']\)\.trim\(\)\.toLocaleLowerCase\(["']en["']\)/);
  assert.match(source, /autoComplete=["']off["']/);
  assert.match(source, /autoCorrect=["']off["']/);
  assert.match(source, /autoCapitalize=["']none["']/);
  assert.match(source, /spellCheck=\{false\}/);
  assert.match(source, /nextTries\s*>=\s*2[\s\S]{0,100}setSupportMode\(true\)/);
  assert.match(source, /supportMode\s*\?\s*["']supported["']\s*:\s*["']correct["']/);
  assert.match(source, /disabled=\{!answer\s*\|\|\s*!heard\}/);
});

test("the site wires Word Garden into reading, the shelf and dual-speed prepared audio", async () => {
  const [page, narration, worker] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/narration.ts", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /stage\s*===\s*["']words["']/);
  assert.match(page, /Grow my Word Garden/);
  assert.match(page, /Practice words/);
  assert.match(page, /LEGACY_PROGRESS_KEY/);
  assert.match(page, /localStorage\.removeItem\(PROGRESS_KEY\)/);
  assert.match(page, /localStorage\.removeItem\(LEGACY_PROGRESS_KEY\)/);
  assert.match(narration, /word-audio-standard/);
  assert.match(narration, /word-audio\//);
  assert.match(worker, /Permissions-Policy["'],\s*["']microphone=\(self\)/);
});

test("all 160 word clips have verified standard and child-slow files", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../work/word-audio-production/manifest.json", import.meta.url), "utf8"),
  );
  assert.equal(manifest.expectedJobs, 160);
  assert.equal(manifest.model, "gemini-2.5-pro-preview-tts");
  assert.equal(manifest.voice, "Aoede");
  assert.equal(manifest.jobs.length, 160);
  assert.equal(new Set(manifest.jobs.map((job) => job.id)).size, 160);

  const expectedPaths = new Set();
  for (const job of manifest.jobs) {
    assert.match(job.id, /^[a-z0-9-]+\/[a-z0-9-]+$/);
    assert.ok(job.standard.durationSeconds >= 0.65 && job.standard.durationSeconds <= 7);
    assert.ok(job.child.durationSeconds > job.standard.durationSeconds);
    for (const [kind, record, relativePath] of [
      ["standard", job.standard, job.standardPath],
      ["child", job.child, job.childPath],
    ]) {
      const file = new URL(`../public/${relativePath}`, import.meta.url);
      const bytes = await readFile(file);
      assert.ok(bytes.length >= 4_000 && bytes.length <= 250_000, `${job.id} ${kind} size`);
      assert.equal(sha256(bytes), record.sha256, `${job.id} ${kind} hash`);
      assert.equal(bytes.length, record.bytes, `${job.id} ${kind} byte receipt`);
      expectedPaths.add(relativePath);
    }
  }
  assert.equal(expectedPaths.size, 320);

  for (const root of ["word-audio", "word-audio-standard"]) {
    const folders = (await readdir(new URL(`../public/${root}/`, import.meta.url), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    assert.deepEqual(folders, [...BOOK_SLUGS].sort(), `${root} book folders`);
    for (const slug of BOOK_SLUGS) {
      const files = (await readdir(new URL(`../public/${root}/${slug}/`, import.meta.url)))
        .filter((file) => file.endsWith(".mp3"));
      assert.equal(files.length, 5, `${root}/${slug} file count`);
    }
  }
});

test("independent blind-transcription receipts remain valid for every verified word clip", async () => {
  const [manifest, report] = await Promise.all([
    readFile(new URL("../work/word-audio-production/manifest.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(
      new URL("../work/word-audio-production/transcript-verification.json", import.meta.url),
      "utf8",
    ).then(JSON.parse),
  ]);
  const jobs = new Map(manifest.jobs.map((job) => [job.id, job]));
  const acceptedTranscriptVariants = new Set([
    "a-day-in-the-kitchen-with-grandma/dough",
    "mr-gumpys-outing/bleating",
  ]);

  assert.ok([50, 90, 105, 110, 120, 160].includes(report.expectedJobs));
  assert.equal(report.records.length, report.expectedJobs);
  assert.equal(report.matches, report.expectedJobs);
  assert.deepEqual(report.mismatches, []);
  assert.equal(new Set(report.records.map((record) => record.id)).size, report.expectedJobs);

  for (const record of report.records) {
    const job = jobs.get(record.id);
    assert.ok(job, `${record.id} exists in the generation manifest`);
    assert.equal(record.match, true, `${record.id} transcription match`);
    assert.equal(record.audioSha256, job.standard.sha256, `${record.id} verified audio hash`);
    if (record.matchBasis === "accepted-transcript-variant") {
      assert.ok(acceptedTranscriptVariants.has(record.id), `${record.id} approved transcript variant`);
    } else {
      assert.equal(record.matchBasis, "exact", `${record.id} exact-match basis`);
      assert.equal(record.expectedNormalised, record.transcriptNormalised, `${record.id} blind transcript`);
    }
  }
});
