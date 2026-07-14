import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

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

test("server-renders the Story Sprout learning experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Story Sprout — P1 English Adventure<\/title>/i);
  assert.match(html, /Ready for today/);
  assert.match(html, /Word Safari/);
  assert.match(html, /Parent Guide/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("ships ten book covers and no disposable starter preview", async () => {
  const [page, layout, packageJson, covers] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readdir(new URL("../public/books/", import.meta.url)),
  ]);

  assert.equal(covers.filter((file) => file.endsWith(".jpg")).length, 10);
  assert.match(page, /The First Day of Hari Raya/);
  assert.match(page, /When My Baby Sister Came Home/);
  assert.match(page, /story-sprout-progress/);
  assert.match(layout, /Story Sprout — P1 English Adventure/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app\/_sites-preview/", import.meta.url)));
  await access(new URL("../public/favicon.png", import.meta.url));
});
