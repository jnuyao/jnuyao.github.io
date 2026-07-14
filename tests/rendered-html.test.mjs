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
]);

const LSRW_STEPS = ["listen", "speak", "read", "write"];
const MAX_STORY_PAGE_BYTES = 500 * 1024;

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

test("book data contains ten complete Listen-Speak-Read-Write journeys", async () => {
  const books = await loadBookData();
  assert.equal(books.length, 10);

  const actualSlugs = books.map((book) => book.slug).sort();
  assert.deepEqual(actualSlugs, [...EXPECTED_PAGE_COUNTS.keys()].sort());

  for (const book of books) {
    assert.ok(
      typeof book.title === "string" && book.title.trim(),
      `${book.slug || "A book"} needs a title`,
    );
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

test("all 94 readable story pages are transcribed, referenced once, and web-sized", async () => {
  const books = await loadBookData();
  const referencedAssets = new Set();
  let pageTotal = 0;

  for (const book of books) {
    const expectedCount = EXPECTED_PAGE_COUNTS.get(book.slug);
    assert.ok(expectedCount, `Unexpected story slug: ${book.slug}`);
    assert.ok(Array.isArray(book.pages), `${book.slug} needs a pages array`);
    assert.equal(book.pages.length, expectedCount, `${book.slug} page count`);

    for (const [index, page] of book.pages.entries()) {
      const label = `${book.slug} page ${index + 1}`;
      assert.equal(typeof page, "object", `${label} must pair an image with its transcript`);
      assert.ok(
        typeof page.transcript === "string" && page.transcript.trim(),
        `${label} needs a non-empty transcript`,
      );
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

  assert.equal(pageTotal, 94);

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

  assert.equal(diskAssets.length, 94);
  assert.deepEqual([...referencedAssets].sort(), diskAssets.sort());
});

test("keeps the ten cover shelf and removes disposable starter output", async () => {
  const [packageJson, covers] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readdir(new URL("../public/books/", import.meta.url)),
  ]);

  assert.equal(covers.filter((file) => file.endsWith(".jpg")).length, 10);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview/", import.meta.url)));
  await access(new URL("../public/favicon.png", import.meta.url));
});
