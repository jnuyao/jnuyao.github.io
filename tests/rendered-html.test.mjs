import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const EXPECTED_PAGE_COUNTS = new Map([
  ["ants-in-a-hurry", 10],
  ["baby-sister-came-home", 9],
  ["dan-the-flying-man", 9],
  ["dans-lost-hat", 9],
  ["first-day-hari-raya", 9],
  ["mid-autumn-festival", 8],
  ["mrs-wishy-washy", 8],
  ["the-hungry-giant", 9],
  ["to-town", 9],
  ["walking-through-jungle", 14],
  ["lazy-duck", 12],
  ["mr-gumpys-outing", 16],
  ["a-day-in-the-kitchen-with-grandma", 9],
  ["life-in-a-shell", 16],
  ["the-growl", 9],
  ["magnetic-max", 9],
  ["the-feast", 17],
  ["willy-and-hugh", 13],
]);

const LSRW_STEPS = ["listen", "speak", "read", "write"];
const MAX_STORY_PAGE_BYTES = 500 * 1024;
const MIN_STORY_AUDIO_BYTES = 4 * 1024;
const MAX_STORY_AUDIO_BYTES = 500 * 1024;

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

async function loadBookData() {
  const dataUrl = new URL("../app/book-data.ts", import.meta.url);
  const source = await readFile(dataUrl, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: "book-data.ts",
    reportDiagnostics: true,
  });

  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(
    errors,
    [],
    `app/book-data.ts did not transpile cleanly: ${errors
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
      .join("; ")}`,
  );

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(
    transpiled.outputText,
  ).toString("base64")}#${Date.now()}`;
  const dataModule = await import(moduleUrl);
  const books = dataModule.BOOKS ?? dataModule.books ?? dataModule.default;

  assert.ok(
    Array.isArray(books),
    "app/book-data.ts must export the story array as BOOKS, books, or default",
  );
  return books;
}

async function loadNarrationSource() {
  const candidates = ["../app/narration.ts", "../app/page.tsx"];
  const sources = [];

  for (const candidate of candidates) {
    try {
      sources.push(await readFile(new URL(candidate, import.meta.url), "utf8"));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  assert.ok(sources.length > 0, "Narration logic must live in app/narration.ts or app/page.tsx");
  return sources.join("\n");
}

function stringLeaves(value) {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(stringLeaves);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(stringLeaves);
  }
  return [];
}

test("server-renders the child-first Story Garden bookshelf", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>[^<]*Story Garden[^<]*<\/title>/i);
  assert.match(html, /Story Garden/i);
  assert.match(
    html,
    /Which story|Choose (?:a|your) (?:book|story)|Pick (?:a|your) (?:book|story)|Bookshelf/i,
  );
  for (const step of ["Listen", "Speak", "Read", "Write"]) {
    assert.match(html, new RegExp(`\\b${step}\\b`, "i"));
  }

  // These were the previous parent-dashboard's primary modules. A small parent
  // corner may remain, but the old dashboard must not be the homepage experience.
  assert.doesNotMatch(html, /Ready for today|Word Safari/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("book data contains eighteen complete Listen-Speak-Read-Write journeys", async () => {
  const books = await loadBookData();
  assert.equal(books.length, 18);

  const actualSlugs = books.map((book) => book.slug).sort();
  assert.deepEqual(actualSlugs, [...EXPECTED_PAGE_COUNTS.keys()].sort());

  for (const book of books) {
    assert.ok(
      typeof book.title === "string" && book.title.trim(),
      `${book.slug || "A book"} needs a title`,
    );
    assert.ok([1, 2].includes(book.level), `${book.slug} needs a Primary level`);
    assert.ok([1, 2, 3, 4].includes(book.term), `${book.slug} needs a valid term`);
    assert.ok(book.tasks && typeof book.tasks === "object", `${book.slug} needs tasks`);

    for (const step of LSRW_STEPS) {
      assert.ok(
        Object.hasOwn(book.tasks, step),
        `${book.slug} is missing its ${step} task`,
      );
      assert.ok(
        stringLeaves(book.tasks[step]).length > 0,
        `${book.slug}'s ${step} task needs child-facing content`,
      );
    }
  }
});

test("all 195 story images are referenced once and web-sized", async () => {
  const books = await loadBookData();
  const referencedAssets = new Set();
  let pageTotal = 0;
  let wordlessTotal = 0;

  for (const book of books) {
    const expectedCount = EXPECTED_PAGE_COUNTS.get(book.slug);
    assert.ok(expectedCount, `Unexpected story slug: ${book.slug}`);
    assert.ok(Array.isArray(book.pages), `${book.slug} needs a pages array`);
    assert.equal(book.pages.length, expectedCount, `${book.slug} page count`);

    for (const [index, page] of book.pages.entries()) {
      const label = `${book.slug} page ${index + 1}`;
      assert.equal(typeof page, "object", `${label} must pair an image with its transcript`);
      assert.equal(typeof page.transcript, "string", `${label} needs a transcript string`);
      if (!page.transcript.trim()) {
        wordlessTotal += 1;
        assert.equal(page.audioSrc, null, `${label} is wordless and must not invent narration`);
      }
      assert.match(
        page.src ?? "",
        new RegExp(`^/pages/${book.slug}/\\d{2}\\.webp$`),
        `${label} must reference its own WebP folder`,
      );
      assert.ok(!referencedAssets.has(page.src), `${page.src} is referenced more than once`);
      referencedAssets.add(page.src);

      const asset = await readFile(
        new URL(`../public${page.src}`, import.meta.url),
      );
      assert.ok(
        asset.byteLength <= MAX_STORY_PAGE_BYTES,
        `${page.src} is ${asset.byteLength} bytes; story pages must be at most ${MAX_STORY_PAGE_BYTES} bytes`,
      );
      assert.equal(asset.subarray(0, 4).toString("ascii"), "RIFF", `${page.src} RIFF header`);
      assert.equal(asset.subarray(8, 12).toString("ascii"), "WEBP", `${page.src} WebP header`);
      pageTotal += 1;
    }
  }

  assert.equal(pageTotal, 195);
  assert.equal(wordlessTotal, 6);

  const pageFolders = (await readdir(new URL("../public/pages/", import.meta.url), {
    withFileTypes: true,
  }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(pageFolders, [...EXPECTED_PAGE_COUNTS.keys()].sort());

  const diskAssets = [];
  for (const [slug, expectedCount] of EXPECTED_PAGE_COUNTS) {
    const files = (await readdir(new URL(`../public/pages/${slug}/`, import.meta.url)))
      .filter((file) => file.endsWith(".webp"))
      .sort();
    const expectedFiles = Array.from(
      { length: expectedCount },
      (_, index) => `${String(index + 1).padStart(2, "0")}.webp`,
    );
    assert.deepEqual(files, expectedFiles, `${slug} WebPs must be sequential`);
    diskAssets.push(...files.map((file) => `/pages/${slug}/${file}`));
  }

  assert.equal(diskAssets.length, 195);
  assert.deepEqual([...referencedAssets].sort(), diskAssets.sort());
});

test("all narrated pages and 72 tasks have unique, valid MP3 tracks in both paces", async () => {
  const books = await loadBookData();
  const referencedAudio = new Set();
  let audioTotal = 0;

  const checkAudio = async (audioSrc, label) => {
    assert.ok(
      !referencedAudio.has(audioSrc),
      `${audioSrc} is referenced by more than one page or task`,
    );
    referencedAudio.add(audioSrc);

    const asset = await readFile(new URL(`../public${audioSrc}`, import.meta.url));
    assert.ok(
      asset.byteLength >= MIN_STORY_AUDIO_BYTES,
      `${audioSrc} is only ${asset.byteLength} bytes and is unlikely to contain usable ${label} narration`,
    );
    assert.ok(
      asset.byteLength <= MAX_STORY_AUDIO_BYTES,
      `${audioSrc} is ${asset.byteLength} bytes; narration tracks must be at most ${MAX_STORY_AUDIO_BYTES} bytes`,
    );
    const hasId3Header = asset.subarray(0, 3).toString("ascii") === "ID3";
    let frameSearchStart = 0;
    if (hasId3Header) {
      assert.ok(asset.byteLength >= 10, `${audioSrc} has a truncated ID3 header`);
      const tagSize = ((asset[6] & 0x7f) << 21)
        | ((asset[7] & 0x7f) << 14)
        | ((asset[8] & 0x7f) << 7)
        | (asset[9] & 0x7f);
      frameSearchStart = 10 + tagSize + ((asset[5] & 0x10) ? 10 : 0);
    }
    const frameSearchEnd = Math.min(asset.byteLength - 3, frameSearchStart + 8192);
    let firstFrame = -1;
    for (let offset = frameSearchStart; offset < frameSearchEnd; offset += 1) {
      const byte1 = asset[offset];
      const byte2 = asset[offset + 1];
      const byte3 = asset[offset + 2];
      const hasFrameSync = byte1 === 0xff && (byte2 & 0xe0) === 0xe0;
      const versionIsValid = ((byte2 >> 3) & 0x03) !== 0x01;
      const layerIsValid = ((byte2 >> 1) & 0x03) !== 0x00;
      const bitrateIndex = (byte3 >> 4) & 0x0f;
      const sampleRateIsValid = ((byte3 >> 2) & 0x03) !== 0x03;
      if (
        hasFrameSync
        && versionIsValid
        && layerIsValid
        && bitrateIndex !== 0x00
        && bitrateIndex !== 0x0f
        && sampleRateIsValid
      ) {
        firstFrame = offset;
        break;
      }
    }
    assert.ok(
      firstFrame >= 0,
      `${audioSrc} must contain a valid MPEG audio frame after its optional ID3 tag`,
    );
    assert.ok(
      hasId3Header || firstFrame === 0,
      `${audioSrc} must begin with either an ID3 header or an MPEG audio frame`,
    );

    const standardSrc = audioSrc.replace(/^\/audio\//, "/audio-standard/");
    const standard = await readFile(new URL(`../public${standardSrc}`, import.meta.url));
    assert.ok(
      standard.byteLength >= MIN_STORY_AUDIO_BYTES && standard.byteLength <= MAX_STORY_AUDIO_BYTES,
      `${standardSrc} must be a web-sized standard narration track`,
    );
    assert.ok(
      standard.subarray(0, 3).toString("ascii") === "ID3"
        || (standard[0] === 0xff && (standard[1] & 0xe0) === 0xe0),
      `${standardSrc} must begin with ID3 or an MPEG audio frame`,
    );
    audioTotal += 1;
  };

  for (const book of books) {
    for (const [index, page] of book.pages.entries()) {
      const number = String(index + 1).padStart(2, "0");
      const expectedSrc = `/audio/${book.slug}/${number}.mp3`;
      const label = `${book.slug} page ${index + 1}`;

      if (page.transcript.trim()) {
        assert.equal(
          page.audioSrc,
          expectedSrc,
          `${label} must reference the narration track with the same book slug and page number`,
        );
        await checkAudio(page.audioSrc, label);
      } else {
        assert.equal(page.audioSrc, null, `${label} must stay silent`);
      }
    }

    for (const step of LSRW_STEPS) {
      await checkAudio(`/audio/${book.slug}/${step}.mp3`, `${book.slug} ${step} task`);
    }
  }

  assert.equal(audioTotal, 261);
  assert.equal(referencedAudio.size, 261);

  const audioFolders = (await readdir(new URL("../public/audio/", import.meta.url), {
    withFileTypes: true,
  }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(
    audioFolders,
    [...EXPECTED_PAGE_COUNTS.keys()].sort(),
    "public/audio must contain exactly one folder per available story",
  );

  const diskAudio = [];
  const booksBySlug = new Map(books.map((book) => [book.slug, book]));
  for (const [slug] of EXPECTED_PAGE_COUNTS) {
    const files = (await readdir(new URL(`../public/audio/${slug}/`, import.meta.url)))
      .sort();
    const expectedPageFiles = booksBySlug.get(slug).pages
      .map((page, index) => page.audioSrc ? `${String(index + 1).padStart(2, "0")}.mp3` : null)
      .filter(Boolean);
    const expectedFiles = [...expectedPageFiles, ...LSRW_STEPS.map((step) => `${step}.mp3`)].sort();
    assert.deepEqual(
      files,
      expectedFiles,
      `${slug} must contain every page/task MP3 and no orphan assets`,
    );
    diskAudio.push(...files.map((file) => `/audio/${slug}/${file}`));
  }

  assert.equal(diskAudio.length, 261);
  assert.deepEqual([...referencedAudio].sort(), diskAudio.sort());

  for (const [slug] of EXPECTED_PAGE_COUNTS) {
    const child = (await readdir(new URL(`../public/audio/${slug}/`, import.meta.url))).sort();
    const standard = (await readdir(new URL(`../public/audio-standard/${slug}/`, import.meta.url))).sort();
    assert.deepEqual(standard, child, `${slug} must have matching standard and child-slow files`);
  }
});

test("keeps the eighteen-cover shelf and removes disposable starter output", async () => {
  const [packageJson, covers] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readdir(new URL("../public/books/", import.meta.url)),
  ]);

  assert.equal(covers.filter((file) => file.endsWith(".jpg")).length, 18);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview/", import.meta.url)));
  await access(new URL("../public/favicon.png", import.meta.url));
});

test("uses a child-slow fallback by default and ranks natural English voices", async () => {
  const source = await loadNarrationSource();
  const defaultRate = source.match(
    /(?:DEFAULT_NARRATION_RATE|DEFAULT_STORY_RATE|DEFAULT_PACE)\s*(?::[^=;]+)?=\s*(0?\.\d+)/,
  );

  assert.ok(
    defaultRate,
    "Expose DEFAULT_NARRATION_RATE (or DEFAULT_STORY_RATE / DEFAULT_PACE) so the child-safe default is intentional and testable",
  );
  const rate = Number(defaultRate[1]);
  assert.ok(
    rate >= 0.55 && rate <= 0.75,
    `Default narration rate must be a gentle 0.55–0.75; received ${rate}`,
  );
  assert.doesNotMatch(
    source,
    /(?:\.rate\s*=|DEFAULT_(?:NARRATION|STORY)_RATE\s*=|DEFAULT_PACE\s*=)\s*0\.82\b/,
    "The previous 0.82 rate is too fast for P1 story reading",
  );

  assert.match(
    source,
    /(?:\.lang|lang\b)[\s\S]{0,180}(?:startsWith\(\s*["']en|\^en|===\s*["']en-)/i,
    "Voice selection must first restrict candidates to English voices",
  );
  assert.match(
    source,
    /localService/,
    "Voice ranking must consider whether a voice is installed locally",
  );
  assert.match(
    source,
    /Enhanced|Premium|Neural|Natural|Siri|Google|Microsoft|Samantha|Daniel|Karen/i,
    "Voice ranking needs explicit quality/name signals instead of choosing the first English voice",
  );
  assert.match(
    source,
    /(?:voice\w*)?(?:score|rank|quality|priority)|(?:score|rank|quality|priority)(?:\w*voice)?/i,
    "Natural English voice candidates must be scored or ranked",
  );
});

test("reads story text as a paced narration and dialogue queue", async () => {
  const source = await loadNarrationSource();

  assert.match(
    source,
    /["']narration["']\s*\|\s*["']dialogue["']|["']dialogue["']\s*\|\s*["']narration["']|kind\s*:\s*["'](?:narration|dialogue)["']/i,
    "Story text must be represented as narration and dialogue segments",
  );
  assert.match(
    source,
    /(?:split|segment|parse|build)\w*(?:Story|Narration|Speech|Text)|(?:Story|Narration|Speech|Text)\w*(?:split|segment|parse|build)/i,
    "A dedicated story-text segmenter must split quoted dialogue from narration",
  );
  assert.match(
    source,
    /pause(?:After)?Ms|segmentPause|pauseDuration/i,
    "Each segment boundary needs an explicit, readable pause duration",
  );
  assert.ok(
    /(?:setTimeout|sleep|delay|wait)[\s\S]{0,220}(?:pause(?:After)?Ms|segmentPause|pauseDuration)/i.test(source) ||
      /(?:pause(?:After)?Ms|segmentPause|pauseDuration)[\s\S]{0,220}(?:setTimeout|sleep|delay|wait)/i.test(source),
    "Narration must actually wait for the configured pause before speaking the next segment",
  );
});

test("cancelling narration invalidates every queued callback", async () => {
  const source = await loadNarrationSource();
  const runRefMatch = source.match(
    /((?:narration|speech|story)?(?:Run|Token|Generation)Ref)\s*=\s*useRef(?:<[^>]+>)?\(\s*0\s*\)/i,
  );

  assert.ok(
    runRefMatch,
    "Narration needs a monotonically increasing run/token ref so cancelled queues cannot resume",
  );
  const escapedName = runRefMatch[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const increments = source.match(
    new RegExp(
      `(?:\\+\\+\\s*${escapedName}\\.current|${escapedName}\\.current\\s*\\+\\+|${escapedName}\\.current\\s*\\+=\\s*1)`,
      "g",
    ),
  ) ?? [];

  assert.ok(
    increments.length >= 2,
    `Both speak() and stop() must invalidate the previous narration run; found ${increments.length} token increments`,
  );
  assert.match(
    source,
    new RegExp(
      `(?:${escapedName}\\.current\\s*!={1,2}\\s*\\w+|\\w+\\s*!={1,2}\\s*${escapedName}\\.current)`,
    ),
    "Queued onend/timer callbacks must compare their captured run token before continuing",
  );
});

test("the active TTS run always finishes cleanly when an utterance errors", async () => {
  const source = await loadNarrationSource();
  const errorIndex = source.indexOf("utterance.onerror");
  assert.ok(errorIndex >= 0, "SpeechSynthesis utterances need an onerror handler");

  const speakIndex = source.indexOf("speechSynthesis.speak", errorIndex);
  assert.ok(speakIndex > errorIndex, "The utterance error handler must be defined before speak()");
  const errorHandler = source.slice(errorIndex, speakIndex);
  const currentRunGuard = errorHandler.search(
    /capturedRun\s*!={1,2}\s*narrationRunRef\.current|narrationRunRef\.current\s*!={1,2}\s*capturedRun/,
  );
  const finishIndex = errorHandler.indexOf("finish()", Math.max(0, currentRunGuard));

  assert.ok(
    currentRunGuard >= 0,
    "utterance.onerror must ignore callbacks belonging to an obsolete narration run",
  );
  assert.ok(
    finishIndex > currentRunGuard,
    "utterance.onerror must call finish() after confirming that it belongs to the current run",
  );
});

test("parents can choose exactly two prepared reading versions", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(
    html,
    /<fieldset\b[^>]*class="[^"]*pace-choice[^"]*"[^>]*>[\s\S]{0,160}<legend>Reading speed<\/legend>/i,
    "The parent corner needs a labelled two-version reading-speed choice",
  );
  assert.equal(
    (html.match(/<input\b[^>]*type="radio"[^>]*name="reading-speed"/gi) ?? []).length,
    2,
    "Reading speed must expose exactly two choices",
  );
  assert.match(html, /Child slow[^<]*[—-] best for young readers/i);
  assert.match(html, /Standard story pace/i);
  assert.doesNotMatch(
    html,
    /<label\b[^>]*>[\s\S]{0,240}(?:Storyteller|Narrator|Reading voice|Voice)[\s\S]{0,240}<select\b/i,
    "Children must not be offered inconsistent browser storyteller voices",
  );
  assert.match(
    html,
    /same prepared Aoede picture-book teacher/i,
    "The parent corner should explain that both versions use the same prepared storyteller",
  );
  assert.match(html, /separately prepared recording[^<]*never a mechanically slowed browser voice/i);
});

test("prepared audio switches roots without runtime time-stretching", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const narrationSource = await readFile(new URL("../app/narration.ts", import.meta.url), "utf8");
  assert.match(
    source,
    /if\s*\(\s*options\.audioSrc\s*&&\s*["']Audio["']\s+in\s+window\s*\)/,
    "Every narration request with a prepared MP3 must try that recording first",
  );
  assert.doesNotMatch(
    source,
    /options\.audioSrc[\s\S]{0,160}selectedVoice/,
    "A saved browser voice must never bypass the prepared storyteller",
  );
  assert.match(source, /audio\.onerror\s*=\s*playSpeechFallback/);
  assert.match(source, /audio\.play\(\)\.catch\(playSpeechFallback\)/);
  assert.match(source, /audio\.playbackRate\s*=\s*1\s*;/);
  assert.match(source, /audio\.preservesPitch\s*=\s*true\s*;/);
  assert.doesNotMatch(source, /playbackRate\s*=\s*pace\s*===/);
  assert.match(narrationSource, /pace\s*===\s*["']standard["']\s*\?\s*["']\/audio-standard\//);
  assert.match(narrationSource, /["']\/audio\/["']/);
  assert.match(
    narrationSource,
    /PREPARED_AUDIO_CACHE_VERSION\s*=\s*["'][^"']+["']/,
    "Prepared audio needs an explicit cache version",
  );
  assert.match(narrationSource, /\?v=\$\{PREPARED_AUDIO_CACHE_VERSION\}/);
  assert.ok(
    (source.match(/<NarrationSettings narrator=\{narrator\}\s*\/>/g) ?? []).length >= 2,
    "The version switch should be available on both the bookshelf and the story reader",
  );
});

test("recording a child stops narration before requesting microphone access", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const speakMissionIndex = source.indexOf("function SpeakMission");
  assert.ok(speakMissionIndex >= 0, "app/page.tsx must contain SpeakMission");

  const recordingIndex = source.indexOf("const startRecording", speakMissionIndex);
  assert.ok(recordingIndex >= 0, "SpeakMission must contain startRecording");

  const microphoneIndex = source.indexOf("getUserMedia", recordingIndex);
  assert.ok(microphoneIndex >= 0, "startRecording must request microphone access");

  const stopIndex = source.indexOf("narrator.stop()", recordingIndex);
  assert.ok(
    stopIndex >= recordingIndex && stopIndex < microphoneIndex,
    "startRecording must call narrator.stop() before getUserMedia so narration is never captured in the child's recording",
  );

  const stopRecordingIndex = source.indexOf("const stopRecording", microphoneIndex);
  assert.ok(stopRecordingIndex > microphoneIndex, "SpeakMission must contain stopRecording");
  const recordingSetup = source.slice(speakMissionIndex, recordingIndex);
  const recordingRequest = source.slice(recordingIndex, stopRecordingIndex);
  assert.match(
    recordingSetup,
    /mounted\s*=\s*useRef(?:<boolean>)?\(\s*false\s*\)/,
    "SpeakMission must track whether it is still mounted while microphone permission is pending",
  );
  assert.match(
    recordingSetup,
    /microphoneRequest\s*=\s*useRef(?:<number>)?\(\s*0\s*\)/,
    "SpeakMission must keep a monotonically increasing microphone request token",
  );
  assert.match(
    recordingSetup,
    /microphoneRequest\.current\s*\+=\s*1/,
    "Unmounting SpeakMission must invalidate an outstanding microphone request",
  );
  assert.match(
    recordingRequest,
    /(?:const|let)\s+request\s*=\s*\+\+microphoneRequest\.current/,
    "Every getUserMedia request must capture a unique request token",
  );
  assert.match(
    recordingRequest.slice(recordingRequest.indexOf("getUserMedia")),
    /!mounted\.current[\s\S]{0,120}request\s*!={1,2}\s*microphoneRequest\.current|request\s*!={1,2}\s*microphoneRequest\.current[\s\S]{0,120}!mounted\.current/,
    "Code resumed after getUserMedia must verify both mounted state and the request token",
  );

  const speakMissionMarkup = source.slice(stopRecordingIndex, source.indexOf("function ReadMission", stopRecordingIndex));
  assert.match(
    speakMissionMarkup,
    /<button\b[\s\S]{0,260}disabled=\{recording\s*\|\|\s*requestingRecording\}[\s\S]{0,500}narrator\.speak\(task\.modelLine/,
    "The model-line playback button must be disabled while recording or opening the microphone",
  );
});

test("narration preferences hydrate safely and migrate all three legacy pace values", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const narrationSource = await readFile(new URL("../app/narration.ts", import.meta.url), "utf8");
  assert.match(
    source,
    /normaliseNarrationPace\(\s*stored\?*\.pace\s*\)/,
    "Saved values must pass through the explicit legacy migration",
  );
  assert.match(
    source,
    /\[\s*pace\s*,\s*setPace\s*\]\s*=\s*useState<NarrationPace>\(\s*["']child["']\s*\)/,
    "Server and first client render must start from the child-slow version",
  );
  assert.match(narrationSource, /value\s*===\s*["']story["'][\s\S]{0,60}return\s+["']standard["']/);
  assert.match(narrationSource, /value\s*===\s*["']gentle["'][\s\S]{0,80}value\s*===\s*["']practice["'][\s\S]{0,60}return\s+["']child["']/);
  assert.doesNotMatch(source, /selectedVoice/, "Saved browser voices must no longer affect narration");
  assert.doesNotMatch(
    source,
    /useState(?:<[^>]+>)?\(\s*readNarrationSettings/,
    "localStorage settings must not be read during the hydration-sensitive state initializer",
  );

  const narratorIndex = source.indexOf("function useNarrator");
  const mountedSettingsIndex = source.indexOf("const settingsTimer", narratorIndex);
  const readSettingsIndex = source.indexOf("readNarrationSettings()", mountedSettingsIndex);
  const applyPaceIndex = source.indexOf("setPace(saved.pace)", readSettingsIndex);
  const readyIndex = source.indexOf("setSettingsReady(true)", applyPaceIndex);
  assert.ok(
    narratorIndex >= 0
      && mountedSettingsIndex > narratorIndex
      && readSettingsIndex > mountedSettingsIndex
      && applyPaceIndex > readSettingsIndex
      && readyIndex > applyPaceIndex,
    "After mount, useNarrator must read validated preferences, apply pace, then mark settings ready",
  );
  assert.match(
    source,
    /if\s*\(\s*!settingsReady\s*\)\s*return/,
    "Preference persistence must wait until mounted settings have been restored",
  );
});
