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
  { directory: "Mr Gumpy's Outing", slug: "mr-gumpys-outing", rePairFacingPages: true },
  { directory: "A Day in the Kitchen with Grandma", slug: "a-day-in-the-kitchen-with-grandma", include: [1, 3, 4, 5, 6, 7, 8, 9, 10] },
  { directory: "Life in a Shell", slug: "life-in-a-shell", include: [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] },
  { directory: "The Feast", slug: "the-feast", include: [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] },
  { directory: "The Growl", slug: "the-growl" },
  { directory: "Lazy Duck", slug: "lazy-duck", include: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { directory: "The King's Cake", slug: "the-kings-cake", joinFirstTwo: true },
  { directory: "Chicken Rice", slug: "chicken-rice", joinFirstTwo: true },
  { directory: "The Gruffalo", slug: "the-gruffalo", include: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] },
  { directory: "Predators and Prey", slug: "predators-and-prey", include: [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] },
  { directory: "The Stars of Chek Jawa", slug: "the-stars-of-chek-jawa" },
  { directory: "dinosaur school/pages", slug: "dinosaur-school" },
  { directory: "Danny and the Dinosaur Goes to Camp/pages", slug: "danny-dinosaur-goes-to-camp" },
  { directory: "Danny and the Dinosaur School Days/pages", slug: "danny-dinosaur-school-days" },
  { directory: "Santa's Moose/pages", slug: "santas-moose" },
  { directory: "The Horse in Harry's Room/pages", slug: "horse-in-harrys-room" },
  { directory: "Danny and the Dinosaur Too Tall/pages", slug: "danny-dinosaur-too-tall" },
  { directory: "Danny and the Dinosaur Sand Castle Contest/pages", slug: "danny-dinosaur-sand-castle-contest" },
  { directory: "Danny and the Dinosaur New Puppy/pages", slug: "danny-dinosaur-new-puppy" },
  { directory: "Danny and the Dinosaur Sammy Seal/pages", slug: "sammy-the-seal" },
  { directory: "Danny and the Dinosaur Mind Manners/pages", slug: "danny-dinosaur-mind-manners" },
  { directory: "Danny and the Dinosaur Ride a Bike/pages", slug: "danny-dinosaur-ride-a-bike" },
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
  let buffer;
  for (const width of [2200, 2100, 2000, 1900, 1800, 1700, 1600]) {
    for (let quality = 84; quality >= 48; quality -= 4) {
      buffer = await sharp(input)
        .rotate()
        .resize({ width, height: 2200, fit: "inside", withoutEnlargement: true })
        .webp({ quality, effort: 4, smartSubsample: true })
        .toBuffer();
      if (buffer.byteLength <= MAX_PAGE_BYTES) break;
    }
    if (buffer.byteLength <= MAX_PAGE_BYTES) break;
  }
  if (buffer.byteLength > MAX_PAGE_BYTES) {
    throw new Error(`Could not compress ${output} below ${MAX_PAGE_BYTES} bytes.`);
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

async function extractHalf(input, side) {
  const metadata = await sharp(input).metadata();
  if (!metadata.width || !metadata.height || metadata.width < metadata.height * 1.3) {
    throw new Error(`Expected a photographed two-page spread: ${input}`);
  }
  const midpoint = Math.floor(metadata.width / 2);
  const left = side === "left" ? 0 : midpoint;
  const width = side === "left" ? midpoint : metadata.width - midpoint;
  return sharp(input)
    .extract({ left, top: 0, width, height: metadata.height })
    .png()
    .toBuffer();
}

async function composeFacingPages(leftPage, rightPage) {
  const [leftMetadata, rightMetadata] = await Promise.all([
    sharp(leftPage).metadata(),
    sharp(rightPage).metadata(),
  ]);
  const leftWidth = leftMetadata.width ?? 0;
  const rightWidth = rightMetadata.width ?? 0;
  const leftHeight = leftMetadata.height ?? 0;
  const rightHeight = rightMetadata.height ?? 0;
  const width = leftWidth + rightWidth;
  const height = Math.max(leftHeight, rightHeight);
  if (!leftWidth || !rightWidth || !leftHeight || !rightHeight) {
    throw new Error("Could not read a page while composing a spread.");
  }
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      { input: leftPage, left: 0, top: 0 },
      { input: rightPage, left: leftWidth, top: 0 },
    ])
    .png()
    .toBuffer();
}

async function composePortraitPair(leftInput, rightInput) {
  const pageWidth = 1500;
  const pageHeight = 1800;
  const [leftPage, rightPage] = await Promise.all(
    [leftInput, rightInput].map((input) => sharp(input)
      .rotate()
      .resize(pageWidth, pageHeight, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255 },
        withoutEnlargement: false,
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer()),
  );
  return composeFacingPages(leftPage, rightPage);
}

async function rePairFacingPages(sourceDirectory, entries) {
  if (entries.length < 3) throw new Error("Mr Gumpy's Outing needs a cover and photographed spreads.");
  const physicalPages = [];
  for (const entry of entries.slice(1)) {
    const input = join(sourceDirectory, entry.filename);
    physicalPages.push(await extractHalf(input, "left"));
    physicalPages.push(await extractHalf(input, "right"));
  }

  const readingPages = [join(sourceDirectory, entries[0].filename), physicalPages[0]];
  for (let index = 1; index < physicalPages.length - 1; index += 2) {
    readingPages.push(await composeFacingPages(physicalPages[index], physicalPages[index + 1]));
  }
  readingPages.push(physicalPages.at(-1));
  return readingPages;
}

for (const {
  directory,
  slug,
  include,
  rePairFacingPages: shouldRePairFacingPages,
  joinFirstTwo,
} of selectedBooks) {
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
  let readingPages;
  if (shouldRePairFacingPages) {
    readingPages = await rePairFacingPages(sourceDirectory, entries);
  } else if (joinFirstTwo) {
    if (entries.length < 2) throw new Error(`${slug} needs at least two portrait pages.`);
    const firstSpread = await composePortraitPair(
      join(sourceDirectory, entries[0].filename),
      join(sourceDirectory, entries[1].filename),
    );
    readingPages = [
      firstSpread,
      ...entries.slice(2).map((entry) => join(sourceDirectory, entry.filename)),
    ];
  } else {
    readingPages = entries.map((entry) => join(sourceDirectory, entry.filename));
  }
  let totalBytes = 0;
  for (let index = 0; index < readingPages.length; index += 1) {
    const input = readingPages[index];
    const output = join(pageDirectory, `${String(index + 1).padStart(2, "0")}.webp`);
    totalBytes += await renderPage(input, output);
  }
  const coverPath = join(COVER_ROOT, `${slug}.jpg`);
  await renderCover(join(sourceDirectory, entries[0].filename), coverPath);
  const coverBytes = (await stat(coverPath)).size;
  process.stdout.write(
    `${slug}: ${readingPages.length} pages, ${Math.round(totalBytes / 1024)} KiB pages, ${Math.round(coverBytes / 1024)} KiB cover\n`,
  );
}
