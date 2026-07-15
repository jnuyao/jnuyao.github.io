#!/usr/bin/env node

import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const SCRIPT_ROOT = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_ROOT, "..");
const SOURCE_ROOT = resolve(PROJECT_ROOT, "..");
const PAGE_ROOT = join(PROJECT_ROOT, "public", "pages");
const COVER_ROOT = join(PROJECT_ROOT, "public", "books");
const MAX_PAGE_BYTES = 500 * 1024;

const BOOKS = [
  { directory: "Magnetic Max", slug: "magnetic-max" },
  { directory: "Willy and Hugh", slug: "willy-and-hugh", include: [1, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] },
  { directory: "Mr Gumpy's Outing", slug: "mr-gumpys-outing" },
  { directory: "A Day in the Kitchen with Grandma", slug: "a-day-in-the-kitchen-with-grandma", include: [1, 3, 4, 5, 6, 7, 8, 9, 10] },
  { directory: "Life in a Shell", slug: "life-in-a-shell", include: [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] },
  { directory: "The Feast", slug: "the-feast", include: [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] },
  { directory: "The Growl", slug: "the-growl" },
  { directory: "Lazy Duck", slug: "lazy-duck", include: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
];

const selectedSlug = process.argv[2] || null;
const selectedBooks = selectedSlug
  ? BOOKS.filter((book) => book.slug === selectedSlug)
  : BOOKS;
if (selectedSlug && selectedBooks.length !== 1) {
  throw new Error(`Unknown book slug: ${selectedSlug}`);
}

function numericPageNumber(filename) {
  const match = filename.match(/^(\d+)\.png$/i);
  return match ? Number(match[1]) : null;
}

async function renderPage(input, output) {
  let quality = 84;
  let buffer;
  do {
    buffer = await sharp(input)
      .rotate()
      .resize({ width: 2200, height: 2200, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 4, smartSubsample: true })
      .toBuffer();
    quality -= 4;
  } while (buffer.byteLength > MAX_PAGE_BYTES && quality >= 48);
  if (buffer.byteLength > MAX_PAGE_BYTES) {
    throw new Error(`Could not compress ${input} below ${MAX_PAGE_BYTES} bytes.`);
  }
  await writeFile(output, buffer);
  return buffer.byteLength;
}

async function renderCover(input, output) {
  await sharp(input)
    .rotate()
    .resize(480, 600, {
      fit: "contain",
      background: { r: 247, g: 242, b: 225 },
    })
    .flatten({ background: { r: 247, g: 242, b: 225 } })
    .jpeg({ quality: 88, chromaSubsampling: "4:4:4" })
    .toFile(output);
}

for (const { directory, slug, include } of selectedBooks) {
  const sourceDirectory = join(SOURCE_ROOT, directory);
  const entries = (await readdir(sourceDirectory))
    .map((filename) => ({ filename, page: numericPageNumber(filename) }))
    .filter((entry) => entry.page !== null)
    .filter((entry) => !include || include.includes(entry.page))
    .sort((left, right) => left.page - right.page);
  if (!entries.length) throw new Error(`No numbered PNG pages found in ${sourceDirectory}.`);

  const pageDirectory = join(PAGE_ROOT, slug);
  await rm(pageDirectory, { recursive: true, force: true });
  await mkdir(pageDirectory, { recursive: true });
  let totalBytes = 0;
  for (let index = 0; index < entries.length; index += 1) {
    const input = join(sourceDirectory, entries[index].filename);
    const output = join(pageDirectory, `${String(index + 1).padStart(2, "0")}.webp`);
    totalBytes += await renderPage(input, output);
  }
  const coverPath = join(COVER_ROOT, `${slug}.jpg`);
  await renderCover(join(sourceDirectory, entries[0].filename), coverPath);
  const coverBytes = (await stat(coverPath)).size;
  process.stdout.write(
    `${slug}: ${entries.length} pages, ${Math.round(totalBytes / 1024)} KiB pages, ${Math.round(coverBytes / 1024)} KiB cover\n`,
  );
}
