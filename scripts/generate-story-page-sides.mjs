#!/usr/bin/env node

import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { BOOKS } from "../app/book-data.ts";

const execFile = promisify(execFileCallback);
const SCRIPT_ROOT = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_ROOT, "..");
const OUTPUT_ROOT = join(PROJECT_ROOT, "work", "story-page-sides");
const OCR_CACHE_ROOT = join(OUTPUT_ROOT, "ocr-cache");
const OCR_BINARY = join(OUTPUT_ROOT, ".ocr-picture-book");
const OCR_SOURCE = join(SCRIPT_ROOT, "ocr-picture-book.swift");
const METADATA_PATH = join(OUTPUT_ROOT, "metadata.json");
const LOW_CONFIDENCE_PATH = join(OUTPUT_ROOT, "low-confidence.json");
const REVIEWED_PAGES_PATH = join(OUTPUT_ROOT, "reviewed-pages.json");
const REORDERED_PAGES_PATH = join(OUTPUT_ROOT, "reordered-pages.json");
const SUMMARY_PATH = join(OUTPUT_ROOT, "summary.json");
const CONCURRENCY = Math.max(1, Math.min(12, Number(process.env.STORY_SIDE_OCR_CONCURRENCY) || 8));

const range = (start, end) => Array.from({ length: end - start + 1 }, (_, index) => start + index);

// These indices are zero-based and describe the images used by the reader, not
// the printed page numbers. They come from the original import notes and source
// page pairings. Keeping this explicit is important: several genuine single
// pages are landscape, so aspect ratio alone is not a safe layout signal.
const SPREAD_PAGE_INDICES = {
  "dan-the-flying-man": range(0, 8),
  "mrs-wishy-washy": range(0, 7),
  "walking-through-jungle": range(0, 13),
  "to-town": range(0, 8),
  "the-hungry-giant": range(0, 8),
  "ants-in-a-hurry": range(0, 9),
  "dans-lost-hat": range(0, 8),
  "baby-sister-came-home": range(0, 8),
  "mid-autumn-festival": range(0, 7),
  "first-day-hari-raya": range(1, 8),
  "lazy-duck": range(1, 11),
  "mr-gumpys-outing": range(1, 15),
  "a-day-in-the-kitchen-with-grandma": range(1, 8),
  "life-in-a-shell": [],
  "the-growl": range(1, 7),
  "magnetic-max": range(1, 7),
  "the-feast": [],
  "willy-and-hugh": range(1, 12),
  "the-gruffalo": range(1, 11),
  "predators-and-prey": range(1, 10),
  "the-stars-of-chek-jawa": range(1, 4),
  "dinosaur-school": range(2, 13),
  "danny-dinosaur-goes-to-camp": range(2, 15),
  "danny-dinosaur-school-days": range(2, 15),
  "santas-moose": range(3, 15),
  "horse-in-harrys-room": range(3, 15),
  "danny-dinosaur-too-tall": range(1, 15),
  "danny-dinosaur-sand-castle-contest": range(1, 15),
  "danny-dinosaur-new-puppy": range(1, 15),
  "sammy-the-seal": range(1, 30),
  "danny-dinosaur-mind-manners": range(2, 15),
  "danny-dinosaur-ride-a-bike": range(2, 15),
};

// The copyright page on the left repeats the title, so OCR alone cannot tell
// which occurrence is the child-facing title. The canonical narration belongs
// to the right title page; the copyright block must stay silent.
const SIDE_OVERRIDES = {
  "dan-the-flying-man/0": {
    leftTranscript: "",
    rightTranscript: "Dan, the Flying Man.",
    confidence: 1,
    reason: "Manual exception: the left half is copyright text and the right half is the title page.",
  },
  "walking-through-jungle/11": {
    leftTranscript: "I think I see a polar bear. Growl! Growl! Growl!",
    rightTranscript: "Chasing after me, chasing after me.",
    confidence: 1,
    reason: "Manual visual review: all three Growl exclamations are on the left; the repeated chasing line is on the right.",
  },
  "to-town/0": {
    leftTranscript: "To Town.",
    rightTranscript: "",
    confidence: 1,
    reason: "Manual visual review: the child-facing title is on the left; text on the illustrated sign is incidental and remains silent.",
  },
  "ants-in-a-hurry/9": {
    leftTranscript: "The end. The baby ants celebrate with lots of jelly.",
    rightTranscript: "",
    confidence: 1,
    reason: "Manual visual review: the canonical celebratory ending belongs with the left illustration; the right-side teacher material is excluded.",
  },
  "baby-sister-came-home/6": {
    leftTranscript: "“I didn't cry, did I, Grandma? I didn't cry like her, did I?”",
    rightTranscript: "“Oh no, my grandson. You didn't cry at all. You were a good little baby boy.”",
    confidence: 1,
    reason: "Manual visual review: the canonical sections were stored in reverse order; they are reassigned to the physical left and right pages.",
  },
  "baby-sister-came-home/7": {
    leftTranscript: "“Wa-ah!” my baby sister cried when Aunty Norleen carried her.",
    rightTranscript: "“Oh, what a lovely baby sister you have, Hashim. She looks just like you.”",
    confidence: 1,
    reason: "Manual visual review: the canonical sections were stored in reverse order; they are reassigned to the physical left and right pages.",
  },
  "first-day-hari-raya/5": {
    leftTranscript: "My sister kneels down and says, “I'm sorry for the times I've been naughty.” She kisses Daddy's and Mummy's hands.",
    rightTranscript: "I kneel down and say, “I'm sorry too, for the times I've been naughty.” I kiss Mummy's and Daddy's hands.",
    confidence: 1,
    reason: "Manual visual review: the sister's apology is on the left and the narrator's apology is on the right, opposite the stored canonical order.",
  },
  "the-stars-of-chek-jawa/4": {
    leftTranscript: "Variety of Sea Stars. Sea stars come in different colours, shapes and sizes. The Biscuit Sea Star is usually found on the northern shores of Singapore. Each Biscuit Sea Star has a different pattern on its body. It has tiny suckers on its tube feet. The Sand Sea Star can move fast, often racing across the sandy bottom of a pool. The spines of its body look like the teeth of a comb, so it is also called the Comb Sea Star. The Spiny Sea Star has many spiny bumps along its arms. It is usually grey, brown or orange. It can be found hidden among sea grass or coral.",
    rightTranscript: "The Cushion Sea Star has very short arms and a plump body. Its thick, rock-like body and rounded shape make it difficult for fish and other predators to bite it. It is rarely seen because it is well hidden under stones. The Knobbly Sea Star is one of the largest sea stars in Singapore. It is also known as the Chocolate Chip Sea Star because of the brown knobs that look like chocolate chips on its body and arms.",
    confidence: 1,
    reason: "Manual visual review: the Spiny Sea Star paragraph, including its sea-grass or coral sentence, is on the left; the Cushion Sea Star starts the right page.",
  },
};

// These assignments originally fell below the automated review threshold. A
// human then checked the physical left/right placement against the page image
// and Vision OCR coordinates. They keep the algorithm's transcript split, but
// are promoted to confirmed so the unresolved list remains actionable.
const REVIEWED_ASSIGNMENTS = {
  "lazy-duck/11": "The narration is printed on the left; the right illustration has no canonical narration.",
  "mr-gumpys-outing/3": "The rabbit dialogue is printed on the right; the left illustration is silent.",
  "mr-gumpys-outing/4": "The cat dialogue is printed on the right; the left illustration is silent.",
  "mr-gumpys-outing/6": "The pig dialogue is printed on the right; the left illustration is silent.",
  "mr-gumpys-outing/10": "The goat dialogue is printed on the right; the left illustration is silent.",
  "mr-gumpys-outing/11": "The cumulative boat sequence is printed on the right; the left illustration is silent.",
  "predators-and-prey/3": "The cheetah and gazelle speed text is on the left; Arctic Wolf versus Caribou begins on the right.",
  "predators-and-prey/5": "The child-facing Barn Owl versus Field Mouse narration is on the right; left-side labels and map furniture are excluded.",
  "predators-and-prey/7": "The child-facing Mongoose versus King Cobra narration is on the right; left-side labels and map furniture are excluded.",
  "predators-and-prey/8": "The child-facing Jaguar versus Spider Monkey narration is on the right; left-side labels and map furniture are excluded.",
  "predators-and-prey/9": "The child-facing Vesper Bat versus Underwing Moth narration is on the right; left-side labels and map furniture are excluded.",
  "the-stars-of-chek-jawa/1": "The title and introductory narration are on the right; the left photo label is incidental and excluded.",
  "dinosaur-school/10": "The Basil exposition is on the left and the Araminta/Basil scene begins on the right.",
  "danny-dinosaur-too-tall/1": "The child-facing title is on the right; publisher and series furniture are excluded.",
  "danny-dinosaur-sand-castle-contest/1": "The child-facing title is on the right; publisher and series furniture are excluded.",
  "danny-dinosaur-sand-castle-contest/5": "All canonical dialogue is on the left; the illustrated SAND CASTLE CONTEST sign on the right is excluded.",
  "danny-dinosaur-new-puppy/1": "The child-facing title is on the right; publisher and series furniture are excluded.",
};

const NORMALISATION_VERSION = "story-page-sides-canonical-ocr-v1";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function lexicalTokensWithSpans(text) {
  const tokens = [];
  const expression = /[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu;
  for (const match of text.matchAll(expression)) {
    const normalised = match[0]
      .normalize("NFKD")
      .replace(/[’']/g, "")
      .replace(/\p{M}/gu, "")
      .toLowerCase();
    if (!normalised) continue;
    tokens.push({ value: normalised, start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

function lexicalTokens(text) {
  return lexicalTokensWithSpans(text).map((token) => token.value);
}

function lcsPrefixLengths(source, observed) {
  let previous = Array(observed.length + 1).fill(0);
  const lengths = [0];
  for (const token of source) {
    const current = Array(observed.length + 1).fill(0);
    for (let column = 1; column <= observed.length; column += 1) {
      current[column] = token === observed[column - 1]
        ? previous[column - 1] + 1
        : Math.max(previous[column], current[column - 1]);
    }
    previous = current;
    lengths.push(current[observed.length]);
  }
  return lengths;
}

function sideText(lines, side) {
  return lines
    .filter((line) => {
      const centre = Number(line.x) + Number(line.width) / 2;
      return side === "left" ? centre < 0.5 : centre >= 0.5;
    })
    .map((line) => line.text)
    .join("\n");
}

function boundaryBonus(canonical, tokens, splitIndex) {
  if (splitIndex === 0 || splitIndex === tokens.length) return 0.006;
  const between = canonical.slice(tokens[splitIndex - 1].end, tokens[splitIndex].start);
  if (/[.!?…][\s”"')\]]*$/.test(between)) return 0.009;
  if (/[,;:—–-][\s”"')\]]*$/.test(between)) return 0.004;
  return 0;
}

function splitCharacterIndex(canonical, tokenSpans, splitIndex) {
  if (splitIndex === 0) return 0;
  if (splitIndex === tokenSpans.length) return canonical.length;
  const gapStart = tokenSpans[splitIndex - 1].end;
  const tokenStart = tokenSpans[splitIndex].start;
  const gap = canonical.slice(gapStart, tokenStart);
  const curlyOpening = Math.max(gap.lastIndexOf("“"), gap.lastIndexOf("‘"));
  const bracketOpening = Math.max(gap.lastIndexOf("("), gap.lastIndexOf("["));
  let opening = Math.max(curlyOpening, bracketOpening);
  const straightQuote = gap.lastIndexOf('"');
  if (straightQuote >= 0) {
    const immediatePrevious = gap.at(straightQuote - 1) ?? "";
    const before = gap.slice(0, straightQuote).trimEnd();
    const previousNonSpace = before.at(-1) ?? "";
    // A quote immediately touching sentence punctuation is normally closing.
    // If whitespace separates it from that punctuation (for example
    // `house. "You see?"`), it opens the next physical page and must travel
    // with the following token.
    if (/\s/.test(immediatePrevious) || !/[.!?…,:;]/.test(previousNonSpace)) {
      opening = Math.max(opening, straightQuote);
    }
  }
  if (opening >= 0 && /^[“‘"([]\s*$/.test(gap.slice(opening))) {
    return gapStart + opening;
  }
  return tokenStart;
}

function boundaryCandidates(canonical, tokenSpans, prefixObserved, suffixObserved, orientation) {
  const canonicalTokens = tokenSpans.map((token) => token.value);
  const prefixMatches = lcsPrefixLengths(canonicalTokens, prefixObserved);
  const prefixCrossMatches = lcsPrefixLengths(canonicalTokens, suffixObserved);
  const reversedCanonical = [...canonicalTokens].reverse();
  const suffixMatchesReversed = lcsPrefixLengths(reversedCanonical, [...suffixObserved].reverse());
  const suffixCrossReversed = lcsPrefixLengths(reversedCanonical, [...prefixObserved].reverse());
  const candidates = [];
  for (let splitIndex = 0; splitIndex <= canonicalTokens.length; splitIndex += 1) {
    const suffixLength = canonicalTokens.length - splitIndex;
    const prefixCorrect = prefixMatches[splitIndex];
    const suffixCorrect = suffixMatchesReversed[suffixLength];
    const prefixCross = prefixCrossMatches[splitIndex];
    const suffixCross = suffixCrossReversed[suffixLength];
    const correctCoverage = (prefixCorrect + suffixCorrect) / canonicalTokens.length;
    const crossCoverage = (prefixCross + suffixCross) / canonicalTokens.length;
    const prefixRecall = splitIndex ? prefixCorrect / splitIndex : 1;
    const suffixRecall = suffixLength ? suffixCorrect / suffixLength : 1;
    const prefixObservedRecall = prefixObserved.length ? prefixCorrect / prefixObserved.length : splitIndex ? 0 : 1;
    const suffixObservedRecall = suffixObserved.length ? suffixCorrect / suffixObserved.length : suffixLength ? 0 : 1;
    const score = correctCoverage
      - 0.28 * crossCoverage
      + 0.025 * Math.min(prefixRecall, suffixRecall)
      + 0.015 * Math.min(prefixObservedRecall, suffixObservedRecall)
      + boundaryBonus(canonical, tokenSpans, splitIndex);
    candidates.push({
      orientation,
      splitIndex,
      score,
      correctCoverage,
      crossCoverage,
      prefixRecall,
      suffixRecall,
      prefixCorrect,
      suffixCorrect,
    });
  }
  return candidates;
}

function splitCanonicalTranscript(canonical, observation) {
  const tokenSpans = lexicalTokensWithSpans(canonical);
  const canonicalTokens = tokenSpans.map((token) => token.value);
  if (!canonicalTokens.length) {
    return {
      leftTranscript: "",
      rightTranscript: "",
      confidence: 1,
      reason: "The canonical transcript is empty, so both halves remain silent; OCR labels and page furniture are excluded.",
      metrics: { canonicalTokens: 0, leftOcrTokens: 0, rightOcrTokens: 0, coverage: 1, runnerGap: 1 },
    };
  }

  const leftObserved = lexicalTokens(sideText(observation.lines, "left"));
  const rightObserved = lexicalTokens(sideText(observation.lines, "right"));
  const candidates = [
    ...boundaryCandidates(canonical, tokenSpans, leftObserved, rightObserved, "left-then-right"),
    ...boundaryCandidates(canonical, tokenSpans, rightObserved, leftObserved, "right-then-left"),
  ];

  const signatureFor = (candidate) => candidate.orientation === "left-then-right"
    ? `0-${candidate.splitIndex}|${candidate.splitIndex}-${canonicalTokens.length}`
    : `${candidate.splitIndex}-${canonicalTokens.length}|0-${candidate.splitIndex}`;
  candidates.sort((left, right) =>
    right.score - left.score
      || Number(left.orientation !== "left-then-right") - Number(right.orientation !== "left-then-right")
      || left.splitIndex - right.splitIndex,
  );
  const best = candidates[0];
  const bestSignature = signatureFor(best);
  const materiallyDifferent = candidates.find(
    (candidate) => signatureFor(candidate) !== bestSignature
      && (candidate.orientation !== best.orientation
        || Math.abs(candidate.splitIndex - best.splitIndex) >= 2),
  ) ?? candidates[1] ?? best;
  const runnerGap = Math.max(0, best.score - materiallyDifferent.score);
  const splitAt = splitCharacterIndex(canonical, tokenSpans, best.splitIndex);
  const prefixTranscript = canonical.slice(0, splitAt).trim();
  const suffixTranscript = canonical.slice(splitAt).trim();
  const leftTranscript = best.orientation === "left-then-right" ? prefixTranscript : suffixTranscript;
  const rightTranscript = best.orientation === "left-then-right" ? suffixTranscript : prefixTranscript;
  const leftRecall = best.orientation === "left-then-right" ? best.prefixRecall : best.suffixRecall;
  const rightRecall = best.orientation === "left-then-right" ? best.suffixRecall : best.prefixRecall;
  const leftCorrect = best.orientation === "left-then-right" ? best.prefixCorrect : best.suffixCorrect;
  const rightCorrect = best.orientation === "left-then-right" ? best.suffixCorrect : best.prefixCorrect;
  const nonEmptyRecalls = [
    ...(leftTranscript ? [leftRecall] : []),
    ...(rightTranscript ? [rightRecall] : []),
  ];
  const weakestRecall = nonEmptyRecalls.length ? Math.min(...nonEmptyRecalls) : 1;
  const shortestSide = Math.min(
    ...(leftTranscript ? [lexicalTokens(leftTranscript).length] : []),
    ...(rightTranscript ? [lexicalTokens(rightTranscript).length] : []),
  );
  const shortSidePenalty = Number.isFinite(shortestSide) && shortestSide < 3 ? 0.08 : 0;
  const lowEvidencePenalty = (leftTranscript && leftObserved.length < 2)
    || (rightTranscript && rightObserved.length < 2)
    ? 0.08
    : 0;
  const confidence = Math.max(0.05, Math.min(
    0.99,
    0.27
      + 0.43 * best.correctCoverage
      + 0.2 * weakestRecall
      + 0.1 * Math.min(1, runnerGap * 15)
      - shortSidePenalty
      - lowEvidencePenalty,
  ));
  const orderExplanation = leftTranscript && rightTranscript
    ? best.orientation === "left-then-right"
      ? "canonical left-to-right order"
      : "the two canonical sections must be reordered into physical left/right order"
    : "the canonical narration belongs to only one physical side";
  const reason = [
    `Canonical transcript split at token ${best.splitIndex} of ${canonicalTokens.length}; OCR indicates ${orderExplanation}.`,
    `Vision OCR matched ${leftCorrect} token${leftCorrect === 1 ? "" : "s"} on the left and ${rightCorrect} on the right.`,
    `Coverage ${(best.correctCoverage * 100).toFixed(1)}%; alternative-boundary gap ${runnerGap.toFixed(3)}.`,
    "Only canonical narration is retained, so copyright, printed page numbers, signs and incidental illustration text are excluded.",
  ].join(" ");

  return {
    leftTranscript,
    rightTranscript,
    confidence: Number(confidence.toFixed(3)),
    reason,
    metrics: {
      canonicalTokens: canonicalTokens.length,
      leftOcrTokens: leftObserved.length,
      rightOcrTokens: rightObserved.length,
      coverage: Number(best.correctCoverage.toFixed(3)),
      runnerGap: Number(runnerGap.toFixed(4)),
      splitIndex: best.splitIndex,
      orientation: best.orientation,
      leftMatchedTokens: leftCorrect,
      rightMatchedTokens: rightCorrect,
      leftRecall: Number(leftRecall.toFixed(3)),
      rightRecall: Number(rightRecall.toFixed(3)),
    },
  };
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureOcrBinary() {
  if (await exists(OCR_BINARY)) return;
  await execFile("swiftc", [OCR_SOURCE, "-o", OCR_BINARY], { cwd: PROJECT_ROOT });
}

async function readOrCreateObservation(bookSlug, pageIndex, imagePath) {
  const cacheDirectory = join(OCR_CACHE_ROOT, bookSlug);
  const cachePath = join(cacheDirectory, `${String(pageIndex + 1).padStart(2, "0")}.json`);
  if (await exists(cachePath)) return JSON.parse(await readFile(cachePath, "utf8"));
  const { stdout } = await execFile(OCR_BINARY, ["--columns", imagePath], {
    cwd: PROJECT_ROOT,
    maxBuffer: 4 * 1024 * 1024,
  });
  const observation = JSON.parse(stdout);
  await mkdir(cacheDirectory, { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(observation, null, 2)}\n`);
  return observation;
}

function singlePageRecord(book, pageIndex) {
  const knownException = book.slug === "life-in-a-shell"
    ? "Explicit source note: every Life in a Shell reader image is a single page, even though the images are landscape."
    : book.slug === "the-feast"
      ? "Explicit source note: every The Feast reader image is a single page, even though the images are landscape."
      : book.slug === "the-gruffalo" && pageIndex === book.pages.length - 1
        ? "Explicit source note: the final Gruffalo reader image is an ending single page."
        : "Explicit source pairing marks this reader image as a single page.";
  return {
    slug: book.slug,
    pageIndex,
    layout: "single",
    leftTranscript: null,
    rightTranscript: null,
    confidence: 1,
    reason: `${knownException} Side controls must not be shown; the existing whole-page transcript remains authoritative.`,
  };
}

async function main() {
  const knownSlugs = new Set(BOOKS.map((book) => book.slug));
  const ruleSlugs = new Set(Object.keys(SPREAD_PAGE_INDICES));
  const missingRules = [...knownSlugs].filter((slug) => !ruleSlugs.has(slug));
  const staleRules = [...ruleSlugs].filter((slug) => !knownSlugs.has(slug));
  if (missingRules.length || staleRules.length) {
    throw new Error(`Layout rules are out of date. Missing: ${missingRules.join(", ") || "none"}; stale: ${staleRules.join(", ") || "none"}.`);
  }

  await mkdir(OUTPUT_ROOT, { recursive: true });
  await ensureOcrBinary();
  const spreadJobs = [];
  const records = [];
  for (const book of BOOKS) {
    const spreadIndices = new Set(SPREAD_PAGE_INDICES[book.slug]);
    for (let pageIndex = 0; pageIndex < book.pages.length; pageIndex += 1) {
      if (!spreadIndices.has(pageIndex)) {
        records.push(singlePageRecord(book, pageIndex));
        continue;
      }
      spreadJobs.push({ book, pageIndex, page: book.pages[pageIndex] });
    }
  }

  let cursor = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < spreadJobs.length) {
      const jobIndex = cursor;
      cursor += 1;
      const { book, pageIndex, page } = spreadJobs[jobIndex];
      const override = SIDE_OVERRIDES[`${book.slug}/${pageIndex}`];
      if (override) {
        records.push({ slug: book.slug, pageIndex, layout: "spread", ...override });
        continue;
      }
      const imagePath = join(PROJECT_ROOT, "public", page.src.replace(/^\//, ""));
      const observation = await readOrCreateObservation(book.slug, pageIndex, imagePath);
      const split = splitCanonicalTranscript(page.transcript, observation);
      const reviewNote = REVIEWED_ASSIGNMENTS[`${book.slug}/${pageIndex}`];
      records.push({
        slug: book.slug,
        pageIndex,
        layout: "spread",
        leftTranscript: split.leftTranscript,
        rightTranscript: split.rightTranscript,
        confidence: reviewNote ? 1 : split.confidence,
        reason: reviewNote
          ? `${split.reason} Manual left/right review confirmed this assignment: ${reviewNote}`
          : split.reason,
        _metrics: split.metrics,
      });
    }
  });
  await Promise.all(workers);

  const bookOrder = new Map(BOOKS.map((book, index) => [book.slug, index]));
  records.sort((left, right) =>
    bookOrder.get(left.slug) - bookOrder.get(right.slug) || left.pageIndex - right.pageIndex,
  );
  if (records.length !== BOOKS.reduce((total, book) => total + book.pages.length, 0)) {
    throw new Error(`Expected 424 page records, produced ${records.length}.`);
  }

  const candidatePages = records.map((record) => {
    const candidate = { ...record };
    Reflect.deleteProperty(candidate, "_metrics");
    return candidate;
  });
  const reviewedPages = candidatePages
    .filter((record) => SIDE_OVERRIDES[`${record.slug}/${record.pageIndex}`]
      || REVIEWED_ASSIGNMENTS[`${record.slug}/${record.pageIndex}`])
    .map((record) => ({
      ...record,
      reviewType: SIDE_OVERRIDES[`${record.slug}/${record.pageIndex}`]
        ? "manual-override"
        : "confirmed-automatic-split",
    }));
  const reorderedPages = candidatePages
    .filter((record) =>
      /reordered into physical|reverse order|opposite the stored|stored canonical order/.test(record.reason),
    )
    .map((record) => ({ ...record, reviewType: "manual-override" }));
  const lowConfidence = records
    .filter((record) => {
      if (record.layout !== "spread") return false;
      if (REVIEWED_ASSIGNMENTS[`${record.slug}/${record.pageIndex}`]) return false;
      if (record.confidence < 0.78) return true;
      if (!record.leftTranscript || !record.rightTranscript) return record.confidence < 0.9;
      return record._metrics?.coverage < 0.72 || record._metrics?.runnerGap < 0.007;
    })
    .map((record) => ({
      slug: record.slug,
      pageIndex: record.pageIndex,
      confidence: record.confidence,
      leftTranscript: record.leftTranscript,
      rightTranscript: record.rightTranscript,
      reason: record.reason,
      metrics: record._metrics ?? null,
    }));
  const summary = {
    books: BOOKS.length,
    pages: records.length,
    singlePages: records.filter((record) => record.layout === "single").length,
    spreadPages: records.filter((record) => record.layout === "spread").length,
    spreadWithBothSides: records.filter(
      (record) => record.layout === "spread" && record.leftTranscript && record.rightTranscript,
    ).length,
    spreadWithLeftOnly: records.filter(
      (record) => record.layout === "spread" && record.leftTranscript && !record.rightTranscript,
    ).length,
    spreadWithRightOnly: records.filter(
      (record) => record.layout === "spread" && !record.leftTranscript && record.rightTranscript,
    ).length,
    silentSpreads: records.filter(
      (record) => record.layout === "spread" && !record.leftTranscript && !record.rightTranscript,
    ).length,
    nonEmptySideTranscripts: records.reduce(
      (total, record) => total + Number(Boolean(record.leftTranscript)) + Number(Boolean(record.rightTranscript)),
      0,
    ),
    reviewedPages: reviewedPages.length,
    reorderedPages: reorderedPages.length,
    lowConfidencePages: lowConfidence.length,
  };
  const sourceIdentity = {
    generator: NORMALISATION_VERSION,
    bookDataSha256: sha256(await readFile(join(PROJECT_ROOT, "app", "book-data.ts"))),
    ocrSourceSha256: sha256(await readFile(OCR_SOURCE)),
  };
  const metadata = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: sourceIdentity,
    summary,
    pages: candidatePages,
  };
  await writeFile(METADATA_PATH, `${JSON.stringify(metadata, null, 2)}\n`);
  await writeFile(LOW_CONFIDENCE_PATH, `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: metadata.generatedAt,
    threshold: "confidence < 0.78, missing-side confidence < 0.90, coverage < 0.72, or runner gap < 0.007",
    count: lowConfidence.length,
    pages: lowConfidence,
  }, null, 2)}\n`);
  await writeFile(REVIEWED_PAGES_PATH, `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: metadata.generatedAt,
    count: reviewedPages.length,
    pages: reviewedPages,
  }, null, 2)}\n`);
  await writeFile(REORDERED_PAGES_PATH, `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: metadata.generatedAt,
    note: "These pages require physical left/right assignment that differs from the stored canonical transcript order.",
    count: reorderedPages.length,
    pages: reorderedPages,
  }, null, 2)}\n`);
  await writeFile(SUMMARY_PATH, `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: metadata.generatedAt,
    source: sourceIdentity,
    ...summary,
  }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || error}\n`);
  process.exitCode = 1;
});
