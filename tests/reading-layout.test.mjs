import assert from "node:assert/strict";
import test from "node:test";
import { readingLayout } from "../app/reading-layout.ts";

test("facing pages keep the cover alone and visit every original page once", () => {
  const visited = [];
  let page = 0;
  while (page !== null) {
    const layout = readingLayout(457, page, true);
    visited.push(...layout.pages);
    if (page === 0) assert.deepEqual(layout.pages, [0]);
    else assert.equal(layout.pages.length, 2);
    page = layout.next;
  }
  assert.deepEqual(visited, Array.from({ length: 457 }, (_, index) => index));
});

test("a jump to either facing page shows the same pair with reversible navigation", () => {
  assert.deepEqual(readingLayout(457, 10, true), {
    pages: [9, 10], previous: 7, next: 11, label: "10–11",
  });
  assert.deepEqual(readingLayout(457, 9, true), readingLayout(457, 10, true));
  assert.deepEqual(readingLayout(457, 456, true), {
    pages: [455, 456], previous: 453, next: null, label: "456–457",
  });
  assert.deepEqual(readingLayout(4, 3, true), {
    pages: [3], previous: 1, next: null, label: "4",
  });
  assert.equal(readingLayout(457, 1, true).previous, 0);
});

test("single-page books retain one-page navigation", () => {
  assert.deepEqual(readingLayout(9, 2), {
    pages: [2], previous: 1, next: 3, label: "3",
  });
  assert.deepEqual(readingLayout(1, 0, true), {
    pages: [0], previous: null, next: null, label: "1",
  });
});
