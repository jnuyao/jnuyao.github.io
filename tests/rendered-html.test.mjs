import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
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
  ["the-kings-cake", 12],
  ["chicken-rice", 9],
  ["marvel-3-tales-of-adventure", 50],
  ["dinosaur-david-lambert", 37],
  ["mr-gumpys-outing", 17],
  ["a-day-in-the-kitchen-with-grandma", 9],
  ["life-in-a-shell", 16],
  ["the-growl", 9],
  ["magnetic-max", 9],
  ["the-feast", 17],
  ["willy-and-hugh", 13],
  ["the-gruffalo", 13],
  ["predators-and-prey", 11],
  ["the-stars-of-chek-jawa", 5],
  ["dinosaur-school", 15],
  ["danny-dinosaur-goes-to-camp", 17],
  ["danny-dinosaur-school-days", 17],
  ["santas-moose", 17],
  ["horse-in-harrys-room", 17],
  ["danny-dinosaur-too-tall", 17],
  ["danny-dinosaur-sand-castle-contest", 17],
  ["danny-dinosaur-new-puppy", 17],
  ["sammy-the-seal", 32],
  ["danny-dinosaur-mind-manners", 17],
  ["danny-dinosaur-ride-a-bike", 17],
]);

const LSRW_STEPS = ["listen", "speak", "read", "write"];
const MAX_STORY_PAGE_BYTES = 500 * 1024;
const MIN_STORY_AUDIO_BYTES = 4 * 1024;
const MAX_STORY_AUDIO_BYTES = 2 * 1024 * 1024;
const SUPPLEMENTAL_AUDIO_FOLDERS = ["dinosaur-close-reading"];

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
  const compilerOptions = {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  };
  const sidesSource = await readFile(
    new URL("../app/story-page-sides.ts", import.meta.url),
    "utf8",
  );
  const transpiledSides = ts.transpileModule(sidesSource, {
    compilerOptions,
    fileName: "story-page-sides.ts",
    reportDiagnostics: true,
  });
  const sideErrors = (transpiledSides.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(sideErrors, [], "app/story-page-sides.ts must transpile cleanly");
  const sidesModuleUrl = `data:text/javascript;base64,${Buffer.from(
    transpiledSides.outputText,
  ).toString("base64")}#story-page-sides-${Date.now()}-${Math.random()}`;

  const dataUrl = new URL("../app/book-data.ts", import.meta.url);
  const source = (await readFile(dataUrl, "utf8")).replace(
    /from\s+["']\.\/story-page-sides(?:\.ts)?["']/,
    `from "${sidesModuleUrl}"`,
  );
  const transpiled = ts.transpileModule(source, {
    compilerOptions,
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

async function loadStoryGuideData() {
  const dataUrl = new URL("../app/story-guide-data.ts", import.meta.url);
  const source = await readFile(dataUrl, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: "story-guide-data.ts",
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(errors, [], "app/story-guide-data.ts must transpile cleanly");
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(
    transpiled.outputText,
  ).toString("base64")}#${Date.now()}`;
  const dataModule = await import(moduleUrl);
  return dataModule.STORY_GUIDES;
}

async function loadDinosaurCloseReadingData() {
  const dataUrl = new URL("../app/dinosaur-close-reading-data.ts", import.meta.url);
  const source = await readFile(dataUrl, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: "dinosaur-close-reading-data.ts",
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(
    errors,
    [],
    "app/dinosaur-close-reading-data.ts must transpile cleanly",
  );
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(
    transpiled.outputText,
  ).toString("base64")}#${Date.now()}`;
  const dataModule = await import(moduleUrl);
  return dataModule.DINOSAUR_CLOSE_READING_PAGES;
}

async function loadArtStudioData() {
  const dataUrl = new URL("../app/art-studio-data.ts", import.meta.url);
  const source = await readFile(dataUrl, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: "art-studio-data.ts",
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(errors, [], "app/art-studio-data.ts must transpile cleanly");
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(
    transpiled.outputText,
  ).toString("base64")}#${Date.now()}`;
  return import(moduleUrl);
}

async function loadDinosaurArtModules() {
  const compilerOptions = {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  };
  const dataSource = await readFile(
    new URL("../app/dinosaur-art-data.ts", import.meta.url),
    "utf8",
  );
  const transpiledData = ts.transpileModule(dataSource, {
    compilerOptions,
    fileName: "dinosaur-art-data.ts",
    reportDiagnostics: true,
  });
  const dataErrors = (transpiledData.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(dataErrors, [], "app/dinosaur-art-data.ts must transpile cleanly");
  const dataModuleUrl = `data:text/javascript;base64,${Buffer.from(
    transpiledData.outputText,
  ).toString("base64")}#dinosaur-art-${Date.now()}-${Math.random()}`;

  const progressSource = (await readFile(
    new URL("../app/dinosaur-art-progress.ts", import.meta.url),
    "utf8",
  )).replace(
    /from\s+["']\.\/dinosaur-art-data["']/,
    `from "${dataModuleUrl}"`,
  );
  const transpiledProgress = ts.transpileModule(progressSource, {
    compilerOptions,
    fileName: "dinosaur-art-progress.ts",
    reportDiagnostics: true,
  });
  const progressErrors = (transpiledProgress.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(
    progressErrors,
    [],
    "app/dinosaur-art-progress.ts must transpile cleanly",
  );
  const progressModuleUrl = `data:text/javascript;base64,${Buffer.from(
    transpiledProgress.outputText,
  ).toString("base64")}#dinosaur-progress-${Date.now()}-${Math.random()}`;

  const [data, progress] = await Promise.all([
    import(dataModuleUrl),
    import(progressModuleUrl),
  ]);
  return { data, progress };
}

async function loadMidAutumnAdventureModules() {
  const compilerOptions = {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  };
  const dataSource = await readFile(
    new URL("../app/mid-autumn-adventure-data.ts", import.meta.url),
    "utf8",
  );
  const transpiledData = ts.transpileModule(dataSource, {
    compilerOptions,
    fileName: "mid-autumn-adventure-data.ts",
    reportDiagnostics: true,
  });
  const dataErrors = (transpiledData.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(
    dataErrors,
    [],
    "app/mid-autumn-adventure-data.ts must transpile cleanly",
  );
  const dataModuleUrl = `data:text/javascript;base64,${Buffer.from(
    transpiledData.outputText,
  ).toString("base64")}#mid-autumn-data-${Date.now()}-${Math.random()}`;

  const progressSource = (await readFile(
    new URL("../app/mid-autumn-adventure-progress.ts", import.meta.url),
    "utf8",
  )).replace(
    /from\s+["']\.\/mid-autumn-adventure-data["']/,
    `from "${dataModuleUrl}"`,
  );
  const transpiledProgress = ts.transpileModule(progressSource, {
    compilerOptions,
    fileName: "mid-autumn-adventure-progress.ts",
    reportDiagnostics: true,
  });
  const progressErrors = (transpiledProgress.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(
    progressErrors,
    [],
    "app/mid-autumn-adventure-progress.ts must transpile cleanly",
  );
  const progressModuleUrl = `data:text/javascript;base64,${Buffer.from(
    transpiledProgress.outputText,
  ).toString("base64")}#mid-autumn-progress-${Date.now()}-${Math.random()}`;

  const [data, progress] = await Promise.all([
    import(dataModuleUrl),
    import(progressModuleUrl),
  ]);
  return { data, progress };
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

  const mainStart = html.indexOf('<main class="shelf-page"');
  const firstSection = html.indexOf("<section", mainStart);
  const bookshelf = html.indexOf('<section class="bookshelf bookshelf--first"', mainStart);
  const chooseBook = html.indexOf("Choose a book", bookshelf);
  const moreToExplore = html.indexOf("More to explore", chooseBook);
  assert.ok(mainStart >= 0, "the rendered homepage needs its shelf main landmark");
  assert.equal(firstSection, bookshelf, "Choose a book must be the first homepage section");
  assert.ok(
    chooseBook > bookshelf && moreToExplore > chooseBook,
    "the picture-book shelf must appear before optional learning labs",
  );
  assert.doesNotMatch(
    html,
    /Read\. Say\. Spell\. Grow!|Hear\s*·\s*Say\s*·\s*Spell|Practice words|Grow my Word Garden/i,
    "the child homepage must not advertise the removed word and mission path",
  );

  // These were the previous parent-dashboard's primary modules. A small parent
  // corner may remain, but the old dashboard must not be the homepage experience.
  assert.doesNotMatch(html, /Ready for today|Word Safari/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("book data contains thirty-six complete stories with valid archived task metadata", async () => {
  const books = await loadBookData();
  assert.equal(books.length, 36);

  const actualSlugs = books.map((book) => book.slug).sort();
  assert.deepEqual(actualSlugs, [...EXPECTED_PAGE_COUNTS.keys()].sort());

  for (const book of books) {
    assert.ok(
      typeof book.title === "string" && book.title.trim(),
      `${book.slug || "A book"} needs a title`,
    );
    assert.ok([1, 2, 3].includes(book.level), `${book.slug} needs a Primary level`);
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

test("all 533 story images are referenced once and web-sized", async () => {
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
      const maxPageBytes = book.slug === "dinosaur-david-lambert"
        ? 3 * 1024 * 1024
        : MAX_STORY_PAGE_BYTES;
      assert.ok(
        asset.byteLength <= maxPageBytes,
        `${page.src} is ${asset.byteLength} bytes; story pages must be at most ${maxPageBytes} bytes`,
      );
      assert.equal(asset.subarray(0, 4).toString("ascii"), "RIFF", `${page.src} RIFF header`);
      assert.equal(asset.subarray(8, 12).toString("ascii"), "WEBP", `${page.src} WebP header`);
      pageTotal += 1;
    }
  }

  assert.equal(pageTotal, 533);
  assert.equal(wordlessTotal, 5);

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

  assert.equal(diskAssets.length, 533);
  assert.deepEqual([...referencedAssets].sort(), diskAssets.sort());
});

test("Mr Gumpy keeps page one single and pairs the printed 2-3, 4-5 sequence", async () => {
  const books = await loadBookData();
  const book = books.find((candidate) => candidate.slug === "mr-gumpys-outing");
  assert.ok(book);
  assert.equal(book.pages.length, 17);
  assert.deepEqual(
    book.pages.map((page) => page.layout),
    ["single", "single", ...Array(14).fill("spread"), "single"],
  );
  assert.equal(book.pages[1].transcript, "This is Mr Gumpy.");
  assert.equal(book.pages[2].transcript, "Mr Gumpy owned a boat and his house was by a river.");
  assert.match(book.pages[3].transcript, /^One day Mr Gumpy went out in his boat/);
  assert.equal(book.pages[13].transcript, "And into the water they fell.");
  assert.match(book.pages[14].transcript, /^Then Mr Gumpy and the goat and the calf/);
  assert.equal(book.pages[15].transcript, "");
  assert.match(book.pages[16].transcript, /^“Goodbye,” said Mr Gumpy/);

  for (const [index, page] of book.pages.entries()) {
    const metadata = await sharp(
      await readFile(new URL(`../public${page.src}`, import.meta.url)),
    ).metadata();
    const ratio = metadata.width / metadata.height;
    if (index === 0 || index === 1 || index === 16) {
      assert.ok(ratio < 1.3, `Mr Gumpy page ${index + 1} must remain a single portrait page`);
    } else {
      assert.ok(ratio > 1.6, `Mr Gumpy page ${index + 1} must be a two-page spread`);
    }
  }
});

test("The King's Cake joins source pages one and two, then keeps every later spread", async () => {
  const books = await loadBookData();
  const book = books.find((candidate) => candidate.slug === "the-kings-cake");
  assert.ok(book);
  assert.equal(book.pages.length, 12);
  assert.deepEqual(book.pages.map((page) => page.layout), Array(12).fill("spread"));
  assert.equal(book.pages[0].transcript, "The King's Cake.");
  assert.match(book.pages[1].transcript, /^The king had a cake for his birthday/);
  assert.match(book.pages[11].transcript, /^“Now you can eat your cake,”/);

  const first = await sharp(
    await readFile(new URL("../public/pages/the-kings-cake/01.webp", import.meta.url)),
  ).metadata();
  assert.ok(first.width / first.height > 1.6, "the cover and title page must form one wide spread");
});

test("Chicken Rice joins source pages one and two, then keeps each later image intact", async () => {
  const books = await loadBookData();
  const book = books.find((candidate) => candidate.slug === "chicken-rice");
  assert.ok(book);
  assert.equal(book.pages.length, 9);
  assert.deepEqual(
    book.pages.map((page) => page.layout),
    [...Array(8).fill("spread"), "single"],
  );
  assert.equal(book.pages[0].transcript, "Chicken Rice.");
  assert.match(book.pages[1].transcript, /^Mr Low made some chicken rice/);
  assert.equal(book.pages.at(-1).transcript, "Then Chicken ran away and she did not come back.");

  const firstPage = await sharp(
    await readFile(new URL("../public/pages/chicken-rice/01.webp", import.meta.url)),
  ).metadata();
  assert.ok(firstPage.width / firstPage.height > 1.6, "the cover and title page must form one spread");
});

test("Marvel 3 Tales keeps the full collection as fifty sequential two-page spreads", async () => {
  const books = await loadBookData();
  const book = books.find((candidate) => candidate.slug === "marvel-3-tales-of-adventure");
  assert.ok(book);
  assert.equal(book.title, "Marvel: 3 Tales of Adventure");
  assert.equal(book.pages.length, 50);
  assert.deepEqual(book.pages.map((page) => page.layout), Array(50).fill("spread"));
  assert.equal(book.pages[0].transcript, "Marvel: 3 Tales of Adventure.");
  assert.equal(book.pages[2].transcript, "This Is Spider-Man.");
  assert.equal(book.pages[17].transcript, "This Is Doctor Strange.");
  assert.equal(book.pages[33].transcript, "The New Team.");
  assert.match(book.pages.at(-1).transcript, /Spider-Man, Doctor Strange, and the new Avengers/);

  for (const pageNumber of [1, 3, 18, 34, 50]) {
    const number = String(pageNumber).padStart(2, "0");
    const metadata = await sharp(
      await readFile(
        new URL(`../public/pages/marvel-3-tales-of-adventure/${number}.webp`, import.meta.url),
      ),
    ).metadata();
    assert.ok(
      metadata.width / metadata.height > 1.6,
      `Marvel reader page ${pageNumber} must remain a wide two-page spread`,
    );
  }
});

test("Dinosaur pairs every PDF page from the cover onward and keeps high-resolution reference text", async () => {
  const books = await loadBookData();
  const book = books.find((candidate) => candidate.slug === "dinosaur-david-lambert");
  assert.ok(book);
  assert.equal(book.title, "Dinosaur");
  assert.equal(book.pages.length, 37);
  assert.deepEqual(
    book.pages.map((page) => page.layout),
    Array(37).fill("spread"),
  );
  assert.match(book.pages[0].transcript, /Welcome to Dinosaur/);
  assert.match(book.pages[1].transcript, /written by David Lambert/);
  assert.match(book.pages[2].transcript, /fossils, models, and scientific ideas/);
  assert.match(book.pages[3].transcript, /upright land reptiles/);
  assert.match(book.pages[28].transcript, /Birds are living dinosaurs/);
  assert.match(book.pages[33].transcript, /pronunciation guide/);
  assert.match(book.pages.at(-1).transcript, /Use the index/);

  for (const pageNumber of [1, 2, 3, 4, 16, 29, 34, 37]) {
    const number = String(pageNumber).padStart(2, "0");
    const metadata = await sharp(
      await readFile(
        new URL(`../public/pages/dinosaur-david-lambert/${number}.webp`, import.meta.url),
      ),
    ).metadata();
    const ratio = metadata.width / metadata.height;
    assert.ok(
      ratio > 1.5 && ratio < 1.6,
      `Dinosaur reader page ${pageNumber} must keep the tight letter-page spread ratio`,
    );
    assert.ok(
      metadata.width >= 3500,
      `Dinosaur reader page ${pageNumber} must preserve small reference text at high resolution`,
    );
  }
});

test("Dinosaur uses a tight, wide reader treatment for its small reference text", async () => {
  const [pageSource, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(
    pageSource,
    /book\.slug\s*===\s*["']dinosaur-david-lambert["'][\s\S]{0,120}reader--reference-book/,
  );
  assert.match(styles, /\.reader--reference-book\s+\.reader__stage\s*\{/);
  assert.match(styles, /\.reader--reference-book\s+\.story-page__paper\s*\{[\s\S]{0,120}padding:\s*3px/);
  assert.match(styles, /\.reader--reference-book\s+\.story-page__image-button img\s*\{[\s\S]{0,120}86svh/);
  assert.match(styles, /\.reader--reference-book\s+\.listen-button\s*\{[\s\S]{0,180}min-height:\s*50px/);
  assert.match(styles, /\.reader--reference-book\s+\.listen-button__icon\s*\{[\s\S]{0,160}width:\s*31px/);
  assert.match(styles, /\.reader--reference-book\s+\.narration-settings summary\s*\{[\s\S]{0,160}min-height:\s*46px/);
});

test("Dinosaur printed pages 6–27 have clickable close-reading narration in both paces", async () => {
  const [closeReadingPages, pageSource, styles] = await Promise.all([
    loadDinosaurCloseReadingData(),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  const expectedPages = [
    { pageIndex: 3, audioPage: 6, printedPages: "6–7", blocks: 26 },
    { pageIndex: 4, audioPage: 7, printedPages: "8–9", blocks: 34 },
    { pageIndex: 5, audioPage: 8, printedPages: "10–11", blocks: 29 },
    { pageIndex: 6, audioPage: 9, printedPages: "12–13", blocks: 25 },
    { pageIndex: 7, audioPage: 10, printedPages: "14–15", blocks: 25 },
    { pageIndex: 8, audioPage: 11, printedPages: "16–17", blocks: 22 },
    { pageIndex: 9, audioPage: 12, printedPages: "18–19", blocks: 20 },
    { pageIndex: 10, audioPage: 13, printedPages: "20–21", blocks: 16 },
    { pageIndex: 11, audioPage: 14, printedPages: "22–23", blocks: 16 },
    { pageIndex: 12, audioPage: 15, printedPages: "24–25", blocks: 14 },
    { pageIndex: 13, audioPage: 16, printedPages: "26–27", blocks: 15 },
  ];
  assert.equal(closeReadingPages.length, expectedPages.length);
  const referencedAudio = new Set();

  for (const [pageOffset, closeReadingPage] of closeReadingPages.entries()) {
    const expected = expectedPages[pageOffset];
    assert.equal(closeReadingPage.bookSlug, "dinosaur-david-lambert");
    assert.equal(closeReadingPage.pageIndex, expected.pageIndex);
    assert.equal(closeReadingPage.printedPages, expected.printedPages);
    assert.equal(closeReadingPage.blocks.length, expected.blocks);
    assert.equal(
      new Set(closeReadingPage.blocks.map((block) => block.id)).size,
      expected.blocks,
    );
    const pageFolder = `page-${String(expected.audioPage).padStart(2, "0")}`;

    for (const block of closeReadingPage.blocks) {
      assert.ok(block.title.trim(), `${pageFolder}/${block.id} needs a visible title`);
      assert.ok(block.text.trim(), `${pageFolder}/${block.id} needs narration text`);
      assert.equal(
        block.audioSrc,
        `/audio/dinosaur-close-reading/${pageFolder}/${block.id}.mp3`,
      );
      assert.ok(!referencedAudio.has(block.audioSrc), `${block.audioSrc} must be unique`);
      referencedAudio.add(block.audioSrc);
      const { left, top, width, height } = block.rect;
      for (const value of [left, top, width, height]) {
        assert.ok(Number.isFinite(value) && value > 0, `${block.id} needs a valid hotspot`);
      }
      assert.ok(left + width <= 100, `${block.id} hotspot exceeds the right edge`);
      assert.ok(top + height <= 100, `${block.id} hotspot exceeds the bottom edge`);

      for (const audioSrc of [
        block.audioSrc,
        block.audioSrc.replace(/^\/audio\//, "/audio-standard/"),
      ]) {
        const asset = await readFile(new URL(`../public${audioSrc}`, import.meta.url));
        assert.ok(
          asset.byteLength >= MIN_STORY_AUDIO_BYTES
            && asset.byteLength <= MAX_STORY_AUDIO_BYTES,
          `${audioSrc} must be a web-sized narration track`,
        );
        assert.ok(
          asset.subarray(0, 3).toString("ascii") === "ID3"
            || (asset[0] === 0xff && (asset[1] & 0xe0) === 0xe0),
          `${audioSrc} must begin with ID3 or an MPEG audio frame`,
        );
      }
    }
  }

  assert.equal(referencedAudio.size, 242);

  assert.match(pageSource, /className="close-reading-layer"/);
  assert.match(pageSource, /preparedOnly:\s*true/);
  assert.match(pageSource, /精读这一页/);
  assert.match(pageSource, /自动精读/);
  assert.match(pageSource, /playCloseReadingSequence/);
  assert.match(pageSource, /onComplete:\s*\(\) => \{/);
  assert.match(styles, /\.close-reading-hotspot\s*\{/);
  assert.match(styles, /\.reader--reference-book\s+\.close-reading-toggle\s*\{/);
});

test("reader page images stay passive and desktop paging controls are arrow only", async () => {
  const [pageSource, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(pageSource, /setZoomed|page-zoom|Open a larger view/);
  assert.doesNotMatch(styles, /\.story-page__zoom|\.page-zoom/);
  assert.match(
    pageSource,
    /reader__side reader__side--previous[\s\S]{0,420}aria-label="Previous page"[\s\S]{0,140}<span aria-hidden="true">←<\/span>\s*<\/button>/,
  );
  assert.match(
    pageSource,
    /reader__side reader__side--next[\s\S]{0,420}aria-label="Next page"[\s\S]{0,140}<span aria-hidden="true">→<\/span>\s*<\/button>/,
  );
});

test("all story images have audited single-page or physical left/right reading data", async () => {
  const books = await loadBookData();
  let singlePages = 0;
  let spreadPages = 0;
  let spokenSides = 0;
  let reorderedSpreads = 0;

  for (const book of books) {
    for (const [index, page] of book.pages.entries()) {
      const label = `${book.slug} page ${index + 1}`;
      assert.ok(["single", "spread"].includes(page.layout), `${label} needs an audited layout`);
      if (page.layout === "single") {
        singlePages += 1;
        assert.equal(page.sides, null, `${label} must not invent left/right controls`);
        continue;
      }

      spreadPages += 1;
      assert.ok(page.sides && typeof page.sides === "object", `${label} needs both physical sides`);
      for (const sideName of ["left", "right"]) {
        const side = page.sides[sideName];
        assert.equal(typeof side?.transcript, "string", `${label} ${sideName} transcript`);
        const number = String(index + 1).padStart(2, "0");
        if (side.transcript.trim()) {
          spokenSides += 1;
          assert.equal(
            side.audioSrc,
            `/audio/${book.slug}/${number}-${sideName}.mp3`,
            `${label} ${sideName} prepared audio`,
          );
        } else {
          assert.equal(side.audioSrc, null, `${label} ${sideName} is picture only`);
        }
      }

      const leftToRight = [page.sides.left.transcript, page.sides.right.transcript]
        .filter((text) => text.trim())
        .join(" ");
      const rightToLeft = [page.sides.right.transcript, page.sides.left.transcript]
        .filter((text) => text.trim())
        .join(" ");
      assert.ok(
        leftToRight === page.transcript || rightToLeft === page.transcript,
        `${label} side texts must exactly rebuild the canonical narration`,
      );
      if (leftToRight !== page.transcript) reorderedSpreads += 1;
    }
  }

  assert.equal(singlePages, 80);
  assert.equal(spreadPages, 453);
  assert.equal(spokenSides, 784);
  assert.equal(reorderedSpreads, 3);
});

test("all whole-page, left/right, and archived task narration has valid MP3 tracks in both paces", async () => {
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

      for (const sideName of ["left", "right"]) {
        const side = page.sides?.[sideName];
        if (side?.transcript.trim()) {
          assert.equal(
            side.audioSrc,
            `/audio/${book.slug}/${number}-${sideName}.mp3`,
            `${label} ${sideName} must use its physical-side filename`,
          );
          await checkAudio(side.audioSrc, `${label} ${sideName}`);
        }
      }
    }

    for (const step of LSRW_STEPS) {
      await checkAudio(`/audio/${book.slug}/${step}.mp3`, `${book.slug} ${step} task`);
    }
  }

  assert.equal(audioTotal, 1456);
  assert.equal(referencedAudio.size, 1456);

  const audioFolders = (await readdir(new URL("../public/audio/", import.meta.url), {
    withFileTypes: true,
  }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(
    audioFolders,
    [...EXPECTED_PAGE_COUNTS.keys(), ...SUPPLEMENTAL_AUDIO_FOLDERS].sort(),
    "public/audio must contain only available stories and audited supplemental narration",
  );

  const diskAudio = [];
  const booksBySlug = new Map(books.map((book) => [book.slug, book]));
  for (const [slug] of EXPECTED_PAGE_COUNTS) {
    const files = (await readdir(new URL(`../public/audio/${slug}/`, import.meta.url)))
      .sort();
    const expectedPageFiles = booksBySlug.get(slug).pages
      .map((page, index) => page.audioSrc ? `${String(index + 1).padStart(2, "0")}.mp3` : null)
      .filter(Boolean);
    const expectedSideFiles = booksBySlug.get(slug).pages.flatMap((page, index) => (
      ["left", "right"].flatMap((sideName) => (
        page.sides?.[sideName]?.audioSrc
          ? [`${String(index + 1).padStart(2, "0")}-${sideName}.mp3`]
          : []
      ))
    ));
    const expectedFiles = [
      ...expectedPageFiles,
      ...expectedSideFiles,
      ...LSRW_STEPS.map((step) => `${step}.mp3`),
    ].sort();
    assert.deepEqual(
      files,
      expectedFiles,
      `${slug} must contain every page/task MP3 and no orphan assets`,
    );
    diskAudio.push(...files.map((file) => `/audio/${slug}/${file}`));
  }

  assert.equal(diskAudio.length, 1456);
  assert.deepEqual([...referencedAudio].sort(), diskAudio.sort());

  for (const [slug] of EXPECTED_PAGE_COUNTS) {
    const child = (await readdir(new URL(`../public/audio/${slug}/`, import.meta.url))).sort();
    const standard = (await readdir(new URL(`../public/audio-standard/${slug}/`, import.meta.url))).sort();
    assert.deepEqual(standard, child, `${slug} must have matching standard and child-slow files`);
  }
});

test("Ride a Bike offers a complete prepared Chinese picture-book guide", async () => {
  const [guides, books] = await Promise.all([loadStoryGuideData(), loadBookData()]);
  assert.deepEqual(Object.keys(guides), ["danny-dinosaur-ride-a-bike"]);
  const guide = guides["danny-dinosaur-ride-a-bike"];
  const book = books.find((candidate) => candidate.slug === "danny-dinosaur-ride-a-bike");
  assert.ok(book);
  assert.equal(guide.pages.length, 17);

  const expectedFiles = [];
  for (const [index, page] of guide.pages.entries()) {
    const number = String(index + 1).padStart(2, "0");
    const expectedSrc = `/story-guide-audio/danny-dinosaur-ride-a-bike/${number}.mp3`;
    assert.equal(page.audioSrc, expectedSrc, `guide page ${index + 1} audio path`);
    assert.equal(
      page.englishPassage,
      book.pages[index].transcript,
      `guide page ${index + 1} must include the complete, exact English page text`,
    );
    assert.match(page.narration, /[\u3400-\u9fff]/u, `guide page ${index + 1} needs Chinese narration`);
    assert.match(page.narration, /[A-Za-z]/, `guide page ${index + 1} needs embedded English`);
    assert.ok(page.narration.length >= 35, `guide page ${index + 1} needs a useful explanation`);
    const passageIndex = page.narration.indexOf(page.englishPassage);
    assert.ok(passageIndex >= 0, `guide page ${index + 1} narration must contain the full English passage`);
    assert.ok(
      page.narration.lastIndexOf(page.repeatAfterMe) > passageIndex,
      `guide page ${index + 1} must repeat its English learning line after the passage`,
    );
    assert.match(page.introZh, /[\u3400-\u9fff]/u, `guide page ${index + 1} needs a Chinese picture cue`);
    assert.match(page.explanationZh, /[\u3400-\u9fff]/u, `guide page ${index + 1} needs a Chinese explanation`);
    assert.match(page.keyEnglish, /[A-Za-z]/, `guide page ${index + 1} needs an English clue`);
    assert.ok(page.prompt?.trim(), `guide page ${index + 1} needs a child-facing prompt`);

    const asset = await readFile(new URL(`../public${expectedSrc}`, import.meta.url));
    assert.ok(
      asset.byteLength >= MIN_STORY_AUDIO_BYTES && asset.byteLength <= MAX_STORY_AUDIO_BYTES,
      `${expectedSrc} must be a web-sized prepared narration track`,
    );
    assert.ok(
      asset.subarray(0, 3).toString("ascii") === "ID3"
        || (asset[0] === 0xff && (asset[1] & 0xe0) === 0xe0),
      `${expectedSrc} must begin with ID3 or an MPEG audio frame`,
    );
    expectedFiles.push(`${number}.mp3`);
  }

  const guideFolders = (await readdir(new URL("../public/story-guide-audio/", import.meta.url), {
    withFileTypes: true,
  })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  assert.deepEqual(guideFolders, ["danny-dinosaur-ride-a-bike"]);
  const files = (await readdir(
    new URL("../public/story-guide-audio/danny-dinosaur-ride-a-bike/", import.meta.url),
  )).sort();
  assert.deepEqual(files, expectedFiles, "the guide must contain all 17 clips and no orphan audio");

  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(pageSource, />中文讲绘本</u);
  assert.match(pageSource, /preparedOnly:\s*true/);
  assert.match(
    pageSource,
    /const preparedAudioError\s*=\s*options\.preparedOnly[\s\S]{0,100}finish\(false,\s*true\)[\s\S]{0,100}playSpeechFallback/,
    "Prepared-only Chinese narration must stop cleanly instead of falling back to a browser voice",
  );
  const narrationSource = await readFile(new URL("../app/narration.ts", import.meta.url), "utf8");
  assert.match(narrationSource, /story-guide-audio/);
  assert.match(narrationSource, /STORY_GUIDE_AUDIO_CACHE_VERSION/);
});

test("Ride a Bike is the only book with an optional four-step Art Studio", async () => {
  const [art, books] = await Promise.all([loadArtStudioData(), loadBookData()]);
  const slug = "danny-dinosaur-ride-a-bike";
  const studio = art.artStudioForBook(slug);
  const book = books.find((candidate) => candidate.slug === slug);

  assert.ok(book);
  assert.ok(studio);
  assert.equal(art.artStudioForBook("the-gruffalo"), null);
  assert.deepEqual(art.ART_STEPS, ["observe", "sketch", "create", "tell"]);
  assert.deepEqual(
    studio.missions.map((mission) => mission.id),
    ["story-artist", "bike-designer"],
  );
  assert.deepEqual(
    studio.observations.map((observation) => observation.pageIndex),
    [7, 14, 15],
  );
  for (const observation of studio.observations) {
    assert.ok(book.pages[observation.pageIndex], `${observation.label} must reference a real story page`);
    assert.match(observation.question, /[\u3400-\u9fff]/u);
    assert.ok(observation.lookFor.length >= 3);
  }

  const [storyMission, bikeMission] = studio.missions;
  assert.deepEqual(storyMission.englishFrames, ["I try.", "I try again.", "I can do it!"]);
  for (const word of ["wheel", "pedal", "seat", "handlebar", "brake", "helmet", "tail support"]) {
    assert.ok(bikeMission.wordBank.includes(word), `bike design needs ${word}`);
  }
  const guidedActivities = [...studio.sketchPoses, ...studio.missions];
  assert.equal(guidedActivities.length, 5);
  assert.equal(new Set(guidedActivities.map((activity) => activity.guideSrc)).size, 5);
  for (const activity of guidedActivities) {
    assert.match(activity.guideSrc, /^\/art-guides\/danny-dinosaur-ride-a-bike\/[a-z-]+\.png$/);
    assert.equal(activity.guideSteps.length, 4, `${activity.label ?? activity.title} needs exactly four small steps`);
    assert.ok(activity.guideSteps.every((guideStep) => /[\u3400-\u9fff]/u.test(guideStep.instruction)));
    assert.match(activity.celebration, /[\u3400-\u9fff]/u);
    const asset = await readFile(new URL(`../public${activity.guideSrc}`, import.meta.url));
    assert.deepEqual([...asset.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.ok(asset.byteLength > 100 * 1024, `${activity.guideSrc} should contain a real instructional image`);
    assert.ok(asset.byteLength < 2.5 * 1024 * 1024, `${activity.guideSrc} should remain web-sized`);
  }
  for (const mission of studio.missions) {
    assert.ok(mission.requirements.length >= 5);
    assert.ok(mission.materials.length >= 2);
    assert.ok(mission.englishFrames.length >= 3);
  }

  const [pageSource, progressSource] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/progress.ts", import.meta.url), "utf8"),
  ]);
  assert.match(pageSource, /kind:\s*"art-studio"/);
  assert.match(pageSource, /stage\s*===\s*"art"\s*&&\s*artStudioForBook\(bookSlug\)/);
  assert.match(pageSource, /params\.set\("stage",\s*"art"\)/);
  assert.match(progressSource, /artStudio\?:\s*ArtStudioProgress/);
  assert.match(progressSource, /selectedMission/);
  assert.match(progressSource, /checkedItems/);
});

test("Art Studio keeps artwork photos on-device and never scores the child", async () => {
  const [componentSource, photoStoreSource, drawingGuideSource, dinosaurLabSource] = await Promise.all([
    readFile(new URL("../app/art-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/art-photo-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/art-drawing-guide.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dinosaur-art-lab.tsx", import.meta.url), "utf8"),
  ]);
  const source = `${componentSource}\n${photoStoreSource}`;

  assert.match(componentSource, /type="file"/);
  assert.match(componentSource, /accept="image\/\*"/);
  assert.match(componentSource, /file\.type\.startsWith\("image\/"\)/);
  assert.match(componentSource, /file\.size\s*>\s*MAX_PHOTO_BYTES/);
  assert.match(componentSource, /URL\.createObjectURL/);
  assert.match(componentSource, /URL\.revokeObjectURL/);
  assert.match(componentSource, /不会上传/);
  assert.match(componentSource, /不会分析/);
  assert.match(componentSource, /不会给作品打分/);
  assert.match(photoStoreSource, /indexedDB\.open/);
  assert.match(photoStoreSource, /objectStore\(STORE_NAME\)\.put/);
  assert.doesNotMatch(source, /fetch\s*\(|FormData|XMLHttpRequest|sendBeacon|WebSocket/);
  assert.doesNotMatch(source, /OpenAI|Gemini|Vision API|scoreArtwork|gradeArtwork|confidenceScore/i);
  assert.match(componentSource, /aria-labelledby="art-studio-title"/);
  assert.match(componentSource, /aria-describedby="art-photo-privacy art-photo-status"/);
  assert.match(componentSource, /role="status"/);
  assert.match(componentSource, /import\s+\{\s*ArtDrawingGuide\s*\}\s+from\s+"\.\/art-drawing-guide"/);
  assert.match(dinosaurLabSource, /import\s+\{\s*ArtDrawingGuide\s*\}\s+from\s+"\.\/art-drawing-guide"/);
  assert.ok(
    (componentSource.match(/<ArtDrawingGuide\b/g) ?? []).length >= 2,
    "The original Art Studio must use the shared guide for both sketching and creating",
  );
  assert.match(dinosaurLabSource, /<ArtDrawingGuide\b/);
  assert.match(drawingGuideSource, /Draw with me · 跟我画/);
  assert.match(drawingGuideSource, /现在只画第 \{activeStep \+ 1\} 步/);
  assert.match(drawingGuideSource, /我画好了 · 下一小步/);
  assert.match(componentSource, /Optional 45-second challenge/);
  assert.match(componentSource, /Finishing tools · 画完后再打开/);
  assert.match(drawingGuideSource, /aria-current=\{index === activeStep \? "step"/);
});

test("Dinosaur Art Lab contains six complete lessons with real web-sized teaching plates", async () => {
  const { data } = await loadDinosaurArtModules();
  const expectedLessonIds = [
    "spinosaurus",
    "tyrannosaurus",
    "triceratops",
    "brachiosaurus",
    "ankylosaurus",
    "velociraptor",
  ];

  assert.deepEqual(data.DINOSAUR_ART_LESSON_IDS, expectedLessonIds);
  assert.equal(data.DINOSAUR_ART_LESSONS.length, 6);
  assert.deepEqual(
    data.DINOSAUR_ART_LESSONS.map((lesson) => lesson.id),
    expectedLessonIds,
  );
  assert.equal(
    new Set(data.DINOSAUR_ART_LESSONS.map((lesson) => lesson.id)).size,
    6,
  );

  const expectedPlateFiles = expectedLessonIds.map((id) => `${id}.png`).sort();
  const actualPlateFiles = (await readdir(
    new URL("../public/art-guides/dinosaur-art-lab/", import.meta.url),
  )).filter((file) => file.endsWith(".png")).sort();
  assert.deepEqual(
    actualPlateFiles,
    expectedPlateFiles,
    "The dinosaur lab must contain exactly one teaching plate per lesson",
  );

  for (const lesson of data.DINOSAUR_ART_LESSONS) {
    assert.ok(lesson.name.trim() && lesson.nameZh.trim(), `${lesson.id} needs both names`);
    assert.match(lesson.nameZh, /[\u3400-\u9fff]/u, `${lesson.id} Chinese name`);
    assert.match(lesson.skill, /[\u3400-\u9fff]/u, `${lesson.id} art skill`);
    assert.match(lesson.fact, /[\u3400-\u9fff]/u, `${lesson.id} science fact`);
    assert.equal(lesson.guideSteps.length, 4, `${lesson.id} must have four drawing steps`);
    for (const [index, step] of lesson.guideSteps.entries()) {
      assert.ok(step.title.trim(), `${lesson.id} step ${index + 1} title`);
      assert.match(
        step.instruction,
        /[\u3400-\u9fff]/u,
        `${lesson.id} step ${index + 1} needs a child-facing Chinese instruction`,
      );
    }
    assert.equal(lesson.vocabulary.length, 4, `${lesson.id} vocabulary count`);
    for (const word of lesson.vocabulary) {
      assert.match(word.word, /^[A-Za-z][A-Za-z -]*$/, `${lesson.id} English vocabulary`);
      assert.match(word.zh, /[\u3400-\u9fff]/u, `${lesson.id} Chinese vocabulary clue`);
    }
    assert.match(lesson.sentence, /[A-Za-z]/, `${lesson.id} speaking sentence`);
    assert.match(lesson.challenge, /[\u3400-\u9fff]/u, `${lesson.id} creative challenge`);
    assert.ok(lesson.materials.length >= 4, `${lesson.id} materials`);
    assert.equal(lesson.guideSrc, `/art-guides/dinosaur-art-lab/${lesson.id}.png`);
    assert.ok(lesson.guideAlt.trim(), `${lesson.id} guide alt text`);

    const plate = await readFile(new URL(`../public${lesson.guideSrc}`, import.meta.url));
    assert.deepEqual(
      [...plate.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
      `${lesson.guideSrc} PNG signature`,
    );
    assert.ok(
      plate.byteLength > 100 * 1024,
      `${lesson.guideSrc} must contain a substantive teaching plate`,
    );
    assert.ok(
      plate.byteLength < 2.5 * 1024 * 1024,
      `${lesson.guideSrc} must remain below 2.5 MiB`,
    );
  }
});

test("all eight dinosaur books open the same six-lesson Art Lab", async () => {
  const [{ data }, books] = await Promise.all([
    loadDinosaurArtModules(),
    loadBookData(),
  ]);
  const expectedBookSlugs = [
    "dinosaur-school",
    "danny-dinosaur-goes-to-camp",
    "danny-dinosaur-school-days",
    "danny-dinosaur-too-tall",
    "danny-dinosaur-sand-castle-contest",
    "danny-dinosaur-new-puppy",
    "danny-dinosaur-mind-manners",
    "danny-dinosaur-ride-a-bike",
  ];
  const availableBooks = new Set(books.map((book) => book.slug));

  assert.deepEqual(data.DINOSAUR_ART_BOOK_SLUGS, expectedBookSlugs);
  assert.equal(new Set(data.DINOSAUR_ART_BOOK_SLUGS).size, 8);
  for (const slug of expectedBookSlugs) {
    assert.ok(availableBooks.has(slug), `${slug} must remain on the bookshelf`);
    assert.equal(data.isDinosaurArtBook(slug), true, `${slug} Art Lab eligibility`);
    assert.deepEqual(
      data.dinosaurArtLessonsForBook(slug).map((lesson) => lesson.id),
      data.DINOSAUR_ART_LESSON_IDS,
      `${slug} must expose all six lessons`,
    );
  }
  assert.equal(data.isDinosaurArtBook("the-gruffalo"), false);
  assert.deepEqual(data.dinosaurArtLessonsForBook("the-gruffalo"), []);
  for (const lesson of data.DINOSAUR_ART_LESSONS) {
    assert.deepEqual(
      lesson.relatedBookSlugs,
      expectedBookSlugs,
      `${lesson.id} must link back to the same eight dinosaur books`,
    );
  }
});

test("Dinosaur Art Lab progress is independently allow-listed and bounded", async () => {
  const { progress } = await loadDinosaurArtModules();
  const empty = { version: 1, lessons: {} };

  assert.equal(
    progress.DINOSAUR_ART_PROGRESS_KEY,
    "story-garden-dinosaur-art-v1",
  );
  assert.deepEqual(progress.emptyDinosaurArtProgress(), empty);
  assert.deepEqual(progress.normaliseDinosaurArtProgress(null), empty);
  assert.deepEqual(
    progress.normaliseDinosaurArtProgress({ version: 3, lessons: {} }),
    empty,
  );

  const cleaned = progress.normaliseDinosaurArtProgress({
    version: 1,
    lastLessonId: "spinosaurus",
    lessons: {
      spinosaurus: {
        lastStep: 99,
        completedAt: "x".repeat(100),
        updatedAt: 123,
        rawDrawing: "must disappear",
      },
      tyrannosaurus: {
        lastStep: -8,
        completedAt: 123,
        updatedAt: Number.POSITIVE_INFINITY,
      },
      triceratops: { lastStep: 2.9 },
      velociraptor: { lastStep: "3" },
      "not-a-dinosaur": {
        lastStep: 3,
        completedAt: "must disappear",
      },
    },
    englishBookProgress: "must disappear",
  });

  assert.equal(cleaned.version, 1);
  assert.equal(cleaned.lastLessonId, "spinosaurus");
  assert.deepEqual(Object.keys(cleaned.lessons).sort(), [
    "spinosaurus",
    "triceratops",
    "tyrannosaurus",
    "velociraptor",
  ]);
  assert.deepEqual(cleaned.lessons.spinosaurus, {
    lastStep: 3,
    completedAt: "x".repeat(40),
    updatedAt: 123,
  });
  assert.deepEqual(cleaned.lessons.tyrannosaurus, {
    lastStep: 0,
    completedAt: undefined,
    updatedAt: undefined,
  });
  assert.equal(cleaned.lessons.triceratops.lastStep, 2);
  assert.equal(cleaned.lessons.velociraptor.lastStep, 0);

  const progressSource = await readFile(
    new URL("../app/dinosaur-art-progress.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(progressSource, /book-data|word-data|\bPROGRESS_KEY\b|normaliseProgress/);
});

test("Dinosaur Art Lab routing stays standalone from the picture-book reader", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  const parseStart = source.indexOf("function parseViewFromUrl");
  const directLabRoute = source.indexOf('params.get("lab") === "dinosaur-art"', parseStart);
  const bookLookup = source.indexOf('const bookSlug = params.get("book")', parseStart);
  assert.ok(
    parseStart >= 0 && directLabRoute > parseStart && directLabRoute < bookLookup,
    "The standalone lab route must be parsed before any BOOKS-backed story route",
  );
  const directRouteBlock = source.slice(directLabRoute, bookLookup);
  assert.doesNotMatch(
    directRouteBlock,
    /BOOKS/,
    "Opening ?lab=dinosaur-art must not require a story lookup",
  );

  const labRender = source.indexOf('if (view.kind === "dinosaur-art-lab")');
  const missingBookGuard = source.indexOf('if (view.kind !== "shelf" && !book)');
  assert.ok(
    labRender >= 0 && labRender < missingBookGuard,
    "The lab must render before the missing-story fallback",
  );

  assert.match(
    source,
    /useState<DinosaurArtProgress>\(\(\)\s*=>\s*emptyDinosaurArtProgress\(\)\)/,
  );
  assert.match(
    source,
    /localStorage\.getItem\(DINOSAUR_ART_PROGRESS_KEY\)/,
  );
  assert.match(
    source,
    /localStorage\.setItem\(DINOSAUR_ART_PROGRESS_KEY,\s*JSON\.stringify\(dinosaurArtProgress\)\)/,
  );
  assert.match(
    source,
    /onDinosaurArt=\{isDinosaurArtBook\(book\.slug\)/,
    "Eligible books must link to the lab by subject, not by English progress",
  );
  assert.match(source, /className="dino-shelf-invite"/);
});

test("Moonlight Market Adventure belongs only to Mid-Autumn Festival and has three four-step missions", async () => {
  const [{ data }, books] = await Promise.all([
    loadMidAutumnAdventureModules(),
    loadBookData(),
  ]);
  const expectedMissionIds = [
    "find-lee-ling",
    "market-roleplay",
    "dinosaur-lantern",
  ];
  const festivalBook = books.find(
    (book) => book.slug === data.MID_AUTUMN_ADVENTURE_BOOK_SLUG,
  );

  assert.equal(data.MID_AUTUMN_ADVENTURE_BOOK_SLUG, "mid-autumn-festival");
  assert.equal(
    data.MID_AUTUMN_BOOK_SLUG,
    data.MID_AUTUMN_ADVENTURE_BOOK_SLUG,
  );
  assert.ok(festivalBook, "Mid-Autumn Festival must remain on the bookshelf");
  assert.equal(festivalBook.pages.length, 8);
  assert.deepEqual(data.MID_AUTUMN_MISSION_IDS, expectedMissionIds);
  assert.deepEqual(
    data.MID_AUTUMN_MISSIONS.map((mission) => mission.id),
    expectedMissionIds,
  );
  assert.equal(new Set(data.MID_AUTUMN_MISSION_IDS).size, 3);

  for (const book of books) {
    assert.equal(
      data.isMidAutumnAdventureBook(book.slug),
      book.slug === "mid-autumn-festival",
      `${book.slug} Moonlight Market eligibility`,
    );
  }
  for (const mission of data.MID_AUTUMN_MISSIONS) {
    assert.ok(mission.title.trim(), `${mission.id} English title`);
    assert.match(mission.titleZh, /[\u3400-\u9fff]/u, `${mission.id} Chinese title`);
    assert.ok(mission.invitation.trim(), `${mission.id} invitation`);
    assert.equal(mission.stepLabels.length, 4, `${mission.id} must have four small steps`);
    assert.equal(data.midAutumnMissionById(mission.id).id, mission.id);
  }
});

test("Find Lee Ling follows three story-grounded, bounded picture hotspots", async () => {
  const [{ data }, books] = await Promise.all([
    loadMidAutumnAdventureModules(),
    loadBookData(),
  ]);
  const festivalBook = books.find((book) => book.slug === "mid-autumn-festival");
  const expectedSceneIds = ["rabbit-lantern", "dim-sum-stall", "lee-ling"];

  assert.ok(festivalBook);
  assert.equal(data.FIND_LEE_LING_SCENES.length, 3);
  assert.deepEqual(
    data.FIND_LEE_LING_SCENES.map((scene) => scene.id),
    expectedSceneIds,
  );
  assert.deepEqual(
    data.FIND_LEE_LING_SCENES.map((scene) => scene.step),
    [0, 1, 2],
  );
  assert.deepEqual(
    data.FIND_LEE_LING_SCENES.map((scene) => scene.pageIndex),
    [2, 5, 7],
  );

  for (const scene of data.FIND_LEE_LING_SCENES) {
    assert.ok(festivalBook.pages[scene.pageIndex], `${scene.id} must reference a real story page`);
    assert.equal(
      scene.imageSrc,
      festivalBook.pages[scene.pageIndex].src,
      `${scene.id} must show its linked story spread`,
    );
    assert.match(scene.prompt, /[A-Za-z]/, `${scene.id} English prompt`);
    assert.match(scene.promptZh, /[\u3400-\u9fff]/u, `${scene.id} Chinese prompt`);
    assert.match(scene.clue, /[A-Za-z]/, `${scene.id} English clue`);
    assert.match(scene.clueZh, /[\u3400-\u9fff]/u, `${scene.id} Chinese clue`);
    assert.match(scene.successLine, /[A-Za-z]/, `${scene.id} English success line`);

    const { x, y, width, height } = scene.hotspot;
    for (const [name, value] of Object.entries({ x, y, width, height })) {
      assert.ok(Number.isFinite(value), `${scene.id} ${name} must be finite`);
    }
    assert.ok(x >= 0 && y >= 0, `${scene.id} hotspot origin must stay in the picture`);
    assert.ok(width > 0 && height > 0, `${scene.id} hotspot must have a usable area`);
    assert.ok(x + width <= 100, `${scene.id} hotspot must fit horizontally`);
    assert.ok(y + height <= 100, `${scene.id} hotspot must fit vertically`);
  }

  assert.match(data.FIND_LEE_LING_SCENES[0].successLine, /rabbit lantern/i);
  assert.match(data.FIND_LEE_LING_SCENES[1].prompt, /DIM SUM/i);
  assert.match(data.FIND_LEE_LING_SCENES[2].successLine, /Lee Ling.*behind the stall/i);
  assert.equal(data.FIND_LEE_LING_CELEBRATION.step, 3);
  assert.match(data.FIND_LEE_LING_CELEBRATION.storyTwist, /Daddy got lost/i);
});

test("Moonlight Market preserves story English and reuses real four-step dinosaur-lantern guides", async () => {
  const { data } = await loadMidAutumnAdventureModules();
  const componentSource = await readFile(
    new URL("../app/moonlight-market-adventure.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(data.MARKET_ROLEPLAY_STEPS.length, 4);
  assert.deepEqual(
    data.MARKET_ROLEPLAY_STEPS.map((activity) => activity.step),
    [0, 1, 2, 3],
  );
  for (const activity of data.MARKET_ROLEPLAY_STEPS) {
    assert.match(activity.instruction, /[A-Za-z]/, `roleplay step ${activity.step} English instruction`);
    assert.match(activity.instructionZh, /[\u3400-\u9fff]/u, `roleplay step ${activity.step} Chinese instruction`);
    assert.match(activity.modelLine, /[A-Za-z]/, `roleplay step ${activity.step} model line`);
    assert.ok(activity.storyAnchor.trim(), `roleplay step ${activity.step} story anchor`);
  }
  assert.equal(
    data.MARKET_ROLEPLAY_STEPS[0].modelLine,
    "Please, may I have that tiger lantern?",
  );
  assert.equal(
    data.MARKET_ROLEPLAY_STEPS[2].modelLine,
    "Have you seen a little girl with a rabbit lantern?",
  );
  assert.equal(
    data.marketRequestForItem("dinosaur-lantern"),
    "Please, may I have that dinosaur lantern?",
  );

  assert.deepEqual(data.MID_AUTUMN_LANTERN_IDS, [
    "spinosaurus",
    "tyrannosaurus",
    "triceratops",
  ]);
  assert.equal(data.MID_AUTUMN_LANTERN_DESIGNS.length, 3);
  const expectedGuideFiles = data.MID_AUTUMN_LANTERN_DESIGNS
    .map((design) => `${design.id}-lantern.png`)
    .sort();
  const actualGuideFiles = (await readdir(
    new URL("../public/art-guides/mid-autumn-festival/", import.meta.url),
  )).filter((file) => file.endsWith(".png")).sort();
  assert.deepEqual(
    actualGuideFiles,
    expectedGuideFiles,
    "The lantern studio must have exactly one teaching plate per dinosaur",
  );

  for (const design of data.MID_AUTUMN_LANTERN_DESIGNS) {
    assert.equal(design.guideSteps.length, 4, `${design.id} guide step count`);
    assert.ok(
      design.guideSteps.every((step) => /[\u3400-\u9fff]/u.test(step.instruction)),
      `${design.id} needs four child-facing Chinese drawing instructions`,
    );
    assert.equal(
      design.guideSrc,
      `/art-guides/mid-autumn-festival/${design.id}-lantern.png`,
    );
    assert.ok(design.guideAlt.trim(), `${design.id} guide alt text`);
    assert.ok(design.featureWords.length >= 3, `${design.id} feature vocabulary`);
    assert.match(design.outputFrame, /My .+ lantern glows/i, `${design.id} output frame`);
    assert.match(design.exampleOutput, /My .+ lantern glows/i, `${design.id} example output`);

    const asset = await readFile(new URL(`../public${design.guideSrc}`, import.meta.url));
    assert.deepEqual(
      [...asset.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
      `${design.guideSrc} PNG signature`,
    );
    assert.ok(asset.byteLength > 100 * 1024, `${design.guideSrc} must be substantive`);
    assert.ok(asset.byteLength < 2.5 * 1024 * 1024, `${design.guideSrc} must remain web-sized`);
  }

  assert.deepEqual(
    data.MID_AUTUMN_DISCOVERIES.map((discovery) => discovery.id),
    ["singapore-traditions", "moonlight", "story-viewpoint"],
  );
  for (const discovery of data.MID_AUTUMN_DISCOVERIES) {
    assert.match(discovery.text, /[A-Za-z]/, `${discovery.id} English discovery`);
    assert.match(discovery.textZh, /[\u3400-\u9fff]/u, `${discovery.id} Chinese discovery`);
  }

  assert.match(
    componentSource,
    /import\s+\{\s*ArtDrawingGuide\s*\}\s+from\s+"\.\/art-drawing-guide"/,
  );
  assert.match(componentSource, /<ArtDrawingGuide\b/);
  assert.match(componentSource, /getBoundingClientRect\(\)/);
  assert.match(componentSource, /x\s*>=\s*target\.x[\s\S]{0,220}y\s*<=\s*target\.y\s*\+\s*target\.height/);
  assert.match(componentSource, /aria-label=\{`Choose this picture clue:/);
  assert.match(componentSource, /aria-live="polite"/);
  assert.match(componentSource, /这里不录音，也不打分/);
});

test("Moonlight Market progress is independently allow-listed and bounded", async () => {
  const { progress } = await loadMidAutumnAdventureModules();
  const empty = { version: 1, missions: {} };

  assert.equal(
    progress.MID_AUTUMN_ADVENTURE_PROGRESS_KEY,
    "story-garden-mid-autumn-adventure-v1",
  );
  assert.deepEqual(progress.emptyMidAutumnAdventureProgress(), empty);
  assert.deepEqual(progress.normaliseMidAutumnAdventureProgress(null), empty);
  assert.deepEqual(
    progress.normaliseMidAutumnAdventureProgress({ version: 2, missions: {} }),
    empty,
  );
  assert.deepEqual(
    progress.normaliseMidAutumnAdventureProgress({ version: 1, missions: [] }),
    empty,
  );

  const cleaned = progress.normaliseMidAutumnAdventureProgress({
    version: 1,
    lastMissionId: "market-roleplay",
    selectedLanternId: "triceratops",
    missions: {
      "find-lee-ling": {
        lastStep: 99,
        completedAt: "x".repeat(100),
        updatedAt: 123.9,
        foundPictures: ["must disappear"],
      },
      "market-roleplay": {
        lastStep: -4,
        completedAt: 123,
        updatedAt: -5,
      },
      "dinosaur-lantern": {
        lastStep: 2.9,
        updatedAt: Number.POSITIVE_INFINITY,
      },
      "not-a-mission": {
        lastStep: 3,
        completedAt: "must disappear",
      },
    },
    englishBookProgress: "must disappear",
  });

  assert.equal(cleaned.version, 1);
  assert.equal(cleaned.lastMissionId, "market-roleplay");
  assert.equal(cleaned.selectedLanternId, "triceratops");
  assert.deepEqual(Object.keys(cleaned.missions).sort(), [
    "dinosaur-lantern",
    "find-lee-ling",
    "market-roleplay",
  ]);
  assert.deepEqual(cleaned.missions["find-lee-ling"], {
    lastStep: 3,
    completedAt: "x".repeat(40),
    updatedAt: 123,
  });
  assert.deepEqual(cleaned.missions["market-roleplay"], {
    lastStep: 0,
    completedAt: undefined,
    updatedAt: 0,
  });
  assert.deepEqual(cleaned.missions["dinosaur-lantern"], {
    lastStep: 2,
    completedAt: undefined,
    updatedAt: undefined,
  });

  const invalidSelections = progress.normaliseMidAutumnAdventureProgress({
    version: 1,
    lastMissionId: "unknown",
    selectedLanternId: "pterosaur",
    missions: {},
  });
  assert.equal(invalidSelections.lastMissionId, undefined);
  assert.equal(invalidSelections.selectedLanternId, undefined);

  const progressSource = await readFile(
    new URL("../app/mid-autumn-adventure-progress.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    progressSource,
    /book-data|word-data|\bPROGRESS_KEY\b|normaliseProgress|from\s+["']\.\/progress["']/,
  );
});

test("Moonlight Market routing stays book-specific and keeps independent progress", async () => {
  const [source, progressSource] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/progress.ts", import.meta.url), "utf8"),
  ]);

  const parseStart = source.indexOf("function parseViewFromUrl");
  const bookLookup = source.indexOf('const bookSlug = params.get("book")', parseStart);
  const marketRoute = source.indexOf('stage === "moonlight-market"', bookLookup);
  const artRoute = source.indexOf('stage === "art"', marketRoute);
  assert.ok(
    parseStart >= 0
      && bookLookup > parseStart
      && marketRoute > bookLookup
      && artRoute > marketRoute,
    "The Moonlight Market route must validate a real book before other book stages",
  );
  const marketRouteBlock = source.slice(marketRoute, artRoute);
  assert.match(marketRouteBlock, /isMidAutumnAdventureBook\(bookSlug\)/);
  assert.match(marketRouteBlock, /MID_AUTUMN_MISSION_IDS\.includes/);
  assert.match(marketRouteBlock, /kind:\s*"mid-autumn-adventure"/);
  assert.match(marketRouteBlock, /Math\.max\(0,\s*Math\.min\(3/);

  const urlStart = source.indexOf("function urlForView");
  const marketUrlBranch = source.indexOf('view.kind === "mid-autumn-adventure"', urlStart);
  const nextUrlBranch = source.indexOf('view.kind === "art-studio"', marketUrlBranch);
  assert.ok(urlStart >= 0 && marketUrlBranch > urlStart && nextUrlBranch > marketUrlBranch);
  const marketUrlBlock = source.slice(marketUrlBranch, nextUrlBranch);
  assert.match(marketUrlBlock, /params\.set\("stage",\s*"moonlight-market"\)/);
  assert.match(marketUrlBlock, /params\.set\("mission",\s*view\.missionId\)/);
  assert.match(marketUrlBlock, /String\(view\.step\s*\+\s*1\)/);

  assert.doesNotMatch(
    progressSource,
    /mid-autumn|moonlight|adventure/i,
    "Moonlight Market progress must not enter the English ProgressStore",
  );

  assert.match(
    source,
    /useState<MidAutumnAdventureProgress>\(\(\)\s*=>\s*emptyMidAutumnAdventureProgress\(\)\)/,
  );
  assert.match(
    source,
    /localStorage\.getItem\(MID_AUTUMN_ADVENTURE_PROGRESS_KEY\)/,
  );
  assert.match(
    source,
    /localStorage\.setItem\([\s\S]{0,120}MID_AUTUMN_ADVENTURE_PROGRESS_KEY,[\s\S]{0,120}JSON\.stringify\(midAutumnAdventureProgress\)/,
  );
  assert.match(
    source,
    /localStorage\.removeItem\(MID_AUTUMN_ADVENTURE_PROGRESS_KEY\)/,
  );
  assert.match(
    source,
    /onMoonlightMarket=\{isMidAutumnAdventureBook\(book\.slug\)/,
    "Only the Mid-Autumn book may expose the optional adventure entry",
  );
});

test("keeps the thirty-six-cover shelf and removes disposable starter output", async () => {
  const [packageJson, covers] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readdir(new URL("../public/books/", import.meta.url)),
  ]);

  assert.equal(covers.filter((file) => file.endsWith(".jpg")).length, 36);
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
  const finishIndex = errorHandler.indexOf("finish(", Math.max(0, currentRunGuard));

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
  assert.match(source, /const preparedAudioError\s*=\s*options\.preparedOnly[\s\S]{0,140}playSpeechFallback/);
  assert.match(source, /configurePreparedAudio\(audio,\s*options\.audioSrc,\s*pace,\s*finish,\s*preparedAudioError\)/);
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
    (source.match(/<NarrationSettings narrator=\{narrator\}[\s\S]{0,90}?\/>/g) ?? []).length >= 2,
    "The version switch should be available on both the bookshelf and the story reader",
  );
});

test("bedtime reading is an explicit opt-in and exposes one clear play or stop control", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const readerStart = source.indexOf("function StoryReader");
  const reader = source.slice(readerStart);

  const bedtimeState = reader.match(
    /const\s*\[\s*(\w*(?:bedtime|continuous|auto)\w*)\s*,\s*(\w+)\s*\]\s*=\s*useState(?:<boolean>)?\(\s*false\s*\)/i,
  );
  assert.ok(
    bedtimeState,
    "Bedtime/continuous reading must start off on every fresh reader visit",
  );
  assert.match(
    reader,
    /Bedtime|睡前|连续朗读/i,
    "The reader needs a child/parent-facing label for continuous bedtime playback",
  );
  assert.match(
    reader,
    /aria-pressed=\{[^}]+\}/,
    "The bedtime playback control must expose its on/off state to assistive technology",
  );
  assert.match(
    reader,
    /(?:Play|Start|Listen)[^\n<]{0,50}(?:story|book)|(?:Stop|Pause)[^\n<]{0,50}(?:story|book)|开始连续朗读|停止连续朗读/i,
    "The bedtime control must clearly say whether it starts or stops the story",
  );
});

test("a naturally finished bedtime page advances and continues until the book ends", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const readerStart = source.indexOf("function StoryReader");
  const reader = source.slice(readerStart);

  assert.match(
    source,
    /onComplete\?\s*:\s*\(\s*\)\s*=>\s*void/,
    "Narration requests need a natural-completion callback for the bedtime sequence",
  );
  assert.match(
    reader,
    /onComplete\s*:/,
    "Whole-page bedtime narration must register a completion callback",
  );
  assert.ok(
    /onPageChange\(\s*(?:nextPage|targetPage\s*\+\s*1|next)\s*\)/.test(reader)
      && /playPage\(\s*(?:nextPage|targetPage\s*\+\s*1|next)[^)]*\)/.test(reader),
    "Natural completion must show the next page and start reading that same page",
  );
  assert.match(
    reader,
    /(?:targetPage|page)\s*(?:>=|===)\s*book\.pages\.length\s*-\s*1[\s\S]{0,500}(?:set\w*(?:Bedtime|Continuous|Auto)\w*\(\s*false\s*\)|stop\w*(?:Bedtime|Continuous|Auto)\w*\()/i,
    "Completing the final page must leave bedtime playback instead of wrapping around",
  );

  const narratorStart = source.indexOf("type SpeakOptions");
  const narratorEnd = source.indexOf("export default function StoryGarden", narratorStart);
  const narrator = source.slice(narratorStart, narratorEnd);
  assert.ok(
    /audio\.onended\s*=\s*(?:\(\)\s*=>\s*(?:finish\(\s*true\s*\)|complete\w*\(\s*\))|complete\w*)/i.test(narrator),
    "Only a naturally ended prepared recording may complete a bedtime page",
  );
  assert.doesNotMatch(
    narrator,
    /audio\.onerror\s*=\s*(?:\(\)\s*=>\s*)?(?:finish\(\s*true\s*\)|complete\w*)/i,
    "A failed recording must not race through the remaining pages as if it finished",
  );
});

test("manual navigation, stopping, and leaving the reader cancel bedtime continuation", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const readerStart = source.indexOf("function StoryReader");
  const reader = source.slice(readerStart);
  const bedtimeState = reader.match(
    /const\s*\[\s*(\w*(?:bedtime|continuous|auto)\w*)\s*,\s*(\w+)\s*\]\s*=\s*useState(?:<boolean>)?\(\s*false\s*\)/i,
  );
  assert.ok(bedtimeState, "The reader must expose opt-in bedtime state");

  const moveStart = reader.indexOf("const movePage");
  const moveEnd = reader.indexOf("const onPointerDown", moveStart);
  const movePage = reader.slice(moveStart, moveEnd);
  assert.ok(moveStart >= 0 && moveEnd > moveStart, "The manual movePage boundary must remain testable");
  assert.match(
    movePage,
    /const movePage\s*=\s*(?:useCallback\(\s*)?\(\s*next:\s*number\s*\)/,
    "Manual page movement must remain separate from bedtime continuation",
  );
  assert.match(
    movePage,
    /stopNarration\(\);[\s\S]{0,160}onPageChange\(targetPage\);/,
    "Changing pages should stop the current narration before moving",
  );
  assert.doesNotMatch(
    movePage,
    /playPage\(|narrator\.speak\(/,
    "A manual page change must never start narration on the destination page",
  );
  assert.ok(
    new RegExp(`${bedtimeState[2]}\\(\\s*false\\s*\\)`).test(movePage)
      || /stop\w*(?:Bedtime|Continuous|Auto)\w*\(\s*\)/i.test(movePage),
    "A button, swipe, or keyboard page change must cancel the bedtime sequence",
  );

  const keyboardStart = reader.indexOf("const onKeyDown");
  const keyboardEnd = reader.indexOf('window.addEventListener("keydown"', keyboardStart);
  const keyboard = reader.slice(keyboardStart, keyboardEnd);
  assert.ok(keyboardStart >= 0 && keyboardEnd > keyboardStart, "Keyboard navigation must remain testable");
  assert.doesNotMatch(
    keyboard,
    /onPageChange\(/,
    "Keyboard page changes must pass through the same bedtime-cancelling manual path",
  );
  assert.match(keyboard, /movePage\(/);

  assert.doesNotMatch(
    reader,
    /onClick=\{onBack\}/,
    "Back and choose-another-book actions must pass through a bedtime-cancelling exit handler",
  );
  assert.ok((reader.match(/movePage\(page\s*\+\s*1\)/g) ?? []).length >= 3);
});

test("story spreads offer independent left and right read-along controls", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  const readerStart = source.indexOf("function StoryReader");
  const reader = source.slice(readerStart);

  assert.match(reader, /current\.layout\s*===\s*["']spread["']/);
  assert.match(reader, /`english-\$\{book\.slug\}-\$\{page\}-\$\{side\}`/);
  assert.match(reader, /Hear \$\{sideLabel\} page/);
  assert.match(reader, /Picture only/);
  assert.match(reader, /Hear both pages/);
  assert.match(reader, /playPageSide\(side\)/);
  assert.match(reader, /aria-label=\{playable/);
  assert.match(css, /\.story-page__side-listeners/);
  assert.doesNotMatch(reader, /story-page__side-highlight/);
  assert.doesNotMatch(css, /\.story-page__side-highlight/);
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
