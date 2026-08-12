import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ASSET_ROOT = resolve(
  ROOT,
  "public/adult-reading/hackers-and-painters",
);
const EXPECTED_PDF_PAGES = Array.from({ length: 14 }, (_, index) => index + 20);
const EXPECTED_IMAGE_NAMES = Array.from(
  { length: 14 },
  (_, index) => `${String(index + 1).padStart(2, "0")}.webp`,
);

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function includesChinese(value) {
  return nonEmpty(value) && /[\u3400-\u9fff]/u.test(value);
}

let dataModulePromise;

async function loadDataModule() {
  if (dataModulePromise) return dataModulePromise;
  dataModulePromise = (async () => {
    const source = await readFile(
      new URL("../app/adult-reader/hackers-painters-data.ts", import.meta.url),
      "utf8",
    );
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: "hackers-painters-data.ts",
      reportDiagnostics: true,
    });
    const errors = (transpiled.diagnostics ?? []).filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    );
    assert.deepEqual(
      errors,
      [],
      `hackers-painters-data.ts must transpile cleanly: ${errors
        .map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
        .join("; ")}`,
    );
    const moduleUrl = `data:text/javascript;base64,${Buffer.from(
      transpiled.outputText,
    ).toString("base64")}#hackers-painters-${Date.now()}-${Math.random()}`;
    return import(moduleUrl);
  })();
  return dataModulePromise;
}

test("Chapter 2 data transpiles and exposes six stable, unique units", async () => {
  const { HACKERS_PAINTERS_UNIT_IDS: ids, HACKERS_PAINTERS_UNITS: units } =
    await loadDataModule();

  assert.ok(Array.isArray(ids), "unit IDs must be exported as an array");
  assert.ok(Array.isArray(units), "units must be exported as an array");
  assert.equal(ids.length, 6, "Chapter 2 must be divided into six units");
  assert.equal(units.length, 6, "Chapter 2 must expose six unit records");
  assert.equal(new Set(ids).size, ids.length, "unit IDs must be unique");
  assert.deepEqual(
    units.map((unit) => unit.id),
    ids,
    "unit records must follow the exported stable ID order",
  );

  for (const unit of units) {
    assert.ok(nonEmpty(unit.title), `${unit.id} needs an English title`);
    assert.ok(includesChinese(unit.titleZh), `${unit.id} needs a Chinese title`);
    assert.ok(nonEmpty(unit.guidingQuestion), `${unit.id} needs a guiding question`);
    assert.ok(
      includesChinese(unit.guidingQuestionZh),
      `${unit.id} needs a Chinese guiding question`,
    );
  }
});

test("PDF pages 20-33 are assigned exactly once and map to images 01-14", async () => {
  const { HACKERS_PAINTERS_UNITS: units } = await loadDataModule();
  const assignedPages = [];
  const assignedImages = [];

  for (const unit of units) {
    assert.ok(unit.pdfPages.length > 0, `${unit.id} needs at least one PDF page`);
    assert.equal(
      unit.pageImages.length,
      unit.pdfPages.length,
      `${unit.id} must provide one image for every assigned PDF page`,
    );
    for (const [index, pdfPage] of unit.pdfPages.entries()) {
      const imageNumber = String(pdfPage - 19).padStart(2, "0");
      const expectedImage =
        `/adult-reading/hackers-and-painters/pages/${imageNumber}.webp`;
      assert.equal(
        unit.pageImages[index],
        expectedImage,
        `${unit.id} PDF page ${pdfPage} must map to ${imageNumber}.webp`,
      );
      assignedPages.push(pdfPage);
      assignedImages.push(unit.pageImages[index]);
    }
  }

  assert.deepEqual(
    [...assignedPages].sort((a, b) => a - b),
    EXPECTED_PDF_PAGES,
    "every original PDF page from 20 through 33 must appear exactly once",
  );
  assert.equal(
    new Set(assignedPages).size,
    EXPECTED_PDF_PAGES.length,
    "no original PDF page may be assigned to two units",
  );
  assert.equal(
    new Set(assignedImages).size,
    EXPECTED_IMAGE_NAMES.length,
    "no rendered page image may be assigned to two units",
  );
});

test("every assigned page has complete focus text and useful target language", async () => {
  const { HACKERS_PAINTERS_UNITS: units } = await loadDataModule();
  const pagesWithText = new Set();
  const paragraphIds = new Set();

  for (const unit of units) {
    const unitPages = new Set(unit.pdfPages);
    assert.ok(unit.paragraphs.length > 0, `${unit.id} needs focus-reading paragraphs`);
    for (const paragraph of unit.paragraphs) {
      assert.ok(nonEmpty(paragraph.id), `${unit.id} has a paragraph without an ID`);
      assert.equal(
        paragraphIds.has(paragraph.id),
        false,
        `paragraph ID ${paragraph.id} must be unique across the chapter`,
      );
      paragraphIds.add(paragraph.id);
      assert.ok(
        unitPages.has(paragraph.page),
        `${unit.id}/${paragraph.id} points outside the unit's PDF pages`,
      );
      assert.ok(nonEmpty(paragraph.text), `${unit.id}/${paragraph.id} needs text`);
      pagesWithText.add(paragraph.page);
    }
    for (const page of unit.pdfPages) {
      assert.ok(
        unit.paragraphs.some(
          (paragraph) => paragraph.page === page && nonEmpty(paragraph.text),
        ),
        `${unit.id} PDF page ${page} needs at least one focus-text paragraph`,
      );
    }

    assert.ok(
      unit.targetWords.length >= 4,
      `${unit.id} needs at least four reusable target words`,
    );
    assert.equal(
      new Set(unit.targetWords.map((item) => item.word.toLowerCase())).size,
      unit.targetWords.length,
      `${unit.id} target words must be unique`,
    );
    for (const item of unit.targetWords) {
      assert.ok(nonEmpty(item.word), `${unit.id} has a blank target word`);
      assert.match(item.ipa, /^\/.+\/$/u, `${unit.id}/${item.word} needs IPA`);
      assert.ok(
        nonEmpty(item.definition),
        `${unit.id}/${item.word} needs an English definition`,
      );
      assert.ok(
        includesChinese(item.definitionZh),
        `${unit.id}/${item.word} needs a Chinese definition`,
      );
      assert.ok(
        nonEmpty(item.collocation),
        `${unit.id}/${item.word} needs a usable collocation`,
      );
    }
  }

  assert.deepEqual(
    [...pagesWithText].sort((a, b) => a - b),
    EXPECTED_PDF_PAGES,
    "all 14 original pages need focus-reading text",
  );
});

test("each unit has a reversible sentence lab and valid understanding checks", async () => {
  const { HACKERS_PAINTERS_UNITS: units } = await loadDataModule();

  for (const unit of units) {
    const lab = unit.sentenceLab;
    assert.ok(nonEmpty(lab.sentence), `${unit.id} needs a sentence-lab sentence`);
    assert.ok(lab.chunks.length >= 2, `${unit.id} needs multiple sentence chunks`);
    for (const [index, chunk] of lab.chunks.entries()) {
      assert.ok(nonEmpty(chunk.text), `${unit.id} chunk ${index + 1} needs text`);
      assert.ok(nonEmpty(chunk.role), `${unit.id} chunk ${index + 1} needs a role`);
      assert.ok(
        includesChinese(chunk.roleZh),
        `${unit.id} chunk ${index + 1} needs a Chinese role`,
      );
    }
    assert.equal(
      lab.chunks.map((chunk) => chunk.text).join(""),
      lab.sentence,
      `${unit.id} sentence chunks must rebuild the sentence exactly`,
    );
    assert.ok(
      includesChinese(lab.explanationZh),
      `${unit.id} needs a Chinese sentence explanation`,
    );

    assert.ok(
      unit.comprehension.length >= 2,
      `${unit.id} needs at least two comprehension questions`,
    );
    for (const [index, question] of unit.comprehension.entries()) {
      assert.ok(nonEmpty(question.prompt), `${unit.id} question ${index + 1} needs a prompt`);
      assert.ok(
        Array.isArray(question.options) && question.options.length >= 2,
        `${unit.id} question ${index + 1} needs answer options`,
      );
      assert.ok(
        question.options.every(nonEmpty),
        `${unit.id} question ${index + 1} cannot have blank options`,
      );
      assert.ok(
        Number.isInteger(question.answerIndex)
          && question.answerIndex >= 0
          && question.answerIndex < question.options.length,
        `${unit.id} question ${index + 1} needs a valid answerIndex`,
      );
      assert.ok(
        nonEmpty(question.explanation),
        `${unit.id} question ${index + 1} needs answer feedback`,
      );
    }
  }
});

test("each unit closes with supported speaking and writing output", async () => {
  const { HACKERS_PAINTERS_UNITS: units } = await loadDataModule();

  for (const unit of units) {
    assert.ok(nonEmpty(unit.speakingPrompt.prompt), `${unit.id} needs a speaking prompt`);
    assert.ok(
      includesChinese(unit.speakingPrompt.promptZh),
      `${unit.id} needs a Chinese speaking prompt`,
    );
    assert.ok(
      Array.isArray(unit.speakingPrompt.starters)
        && unit.speakingPrompt.starters.length >= 2
        && unit.speakingPrompt.starters.every(nonEmpty),
      `${unit.id} needs at least two speaking starters`,
    );
    assert.ok(nonEmpty(unit.writingPrompt.prompt), `${unit.id} needs a writing prompt`);
    assert.ok(
      includesChinese(unit.writingPrompt.promptZh),
      `${unit.id} needs a Chinese writing prompt`,
    );
    assert.ok(
      nonEmpty(unit.writingPrompt.starter),
      `${unit.id} needs a writing starter`,
    );
  }
});

test("the bundled Chapter 2 PDF and all fourteen WebP pages are substantial", async () => {
  const pdfPath = resolve(ASSET_ROOT, "chapter-02.pdf");
  const pdf = await readFile(pdfPath);
  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-", "chapter file must be a PDF");
  assert.ok(pdf.length > 100 * 1024, "chapter PDF should be larger than 100 KB");

  const pdfSource = pdf.toString("latin1");
  const pageObjects = pdfSource.match(/\/Type\s*\/Page\b/g) ?? [];
  assert.equal(pageObjects.length, 14, "chapter PDF must contain exactly 14 pages");

  const pagesDirectory = resolve(ASSET_ROOT, "pages");
  const imageNames = (await readdir(pagesDirectory))
    .filter((name) => name.endsWith(".webp"))
    .sort();
  assert.deepEqual(imageNames, EXPECTED_IMAGE_NAMES, "rendered pages must be named 01.webp-14.webp");

  for (const imageName of imageNames) {
    const imagePath = resolve(pagesDirectory, imageName);
    const [metadata, header] = await Promise.all([
      stat(imagePath),
      readFile(imagePath).then((buffer) => buffer.subarray(0, 12)),
    ]);
    assert.ok(metadata.size > 100 * 1024, `${imageName} should be larger than 100 KB`);
    assert.equal(header.subarray(0, 4).toString("ascii"), "RIFF", `${imageName} needs a RIFF header`);
    assert.equal(header.subarray(8, 12).toString("ascii"), "WEBP", `${imageName} needs a WebP header`);
  }
});

test("the reader keeps narration manual and saves adult progress locally", async () => {
  const [readerSource, progressSource] = await Promise.all([
    readFile(
      new URL("../app/adult-reader/hackers-painters-reader.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/adult-reader/hackers-painters-progress.ts", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(readerSource, /Focus text/i, "reader needs a Focus Text mode");
  assert.match(readerSource, /Original page/i, "reader needs an Original Page mode");
  assert.match(
    readerSource,
    /\[\s*0\.8\s*,\s*1\s*,\s*1\.15\s*\]/,
    "reader needs slow, natural, and brisk speech rates",
  );
  assert.match(
    readerSource,
    /window\.speechSynthesis\.speak\(utterance\)/,
    "reader needs deliberate browser speech playback",
  );
  assert.match(
    readerSource,
    /onClick=\{onHearParagraph\}/,
    "paragraph narration must be attached to an explicit button",
  );
  assert.doesNotMatch(
    readerSource,
    /\bautoPlay\s*=|<(?:audio|video)\b[^>]*\bautoplay\b/i,
    "reader media must never autoplay",
  );

  const selectParagraphStart = readerSource.indexOf("const selectParagraph =");
  const selectParagraphEnd = readerSource.indexOf("const selectSection =", selectParagraphStart);
  const selectParagraphSource = readerSource.slice(selectParagraphStart, selectParagraphEnd);
  assert.ok(selectParagraphStart >= 0 && selectParagraphEnd > selectParagraphStart);
  assert.match(selectParagraphSource, /stopSpeech\(\)/);
  assert.doesNotMatch(selectParagraphSource, /\bspeak\s*\(/);

  const changePageStart = readerSource.indexOf("const changeOriginalPage =");
  const changePageEnd = readerSource.indexOf("const goToUnit =", changePageStart);
  const changePageSource = readerSource.slice(changePageStart, changePageEnd);
  assert.ok(changePageStart >= 0 && changePageEnd > changePageStart);
  assert.match(changePageSource, /stopSpeech\(\)/);
  assert.doesNotMatch(changePageSource, /\bspeak\s*\(/);

  assert.match(
    progressSource,
    /story-garden-hackers-painters-chapter-2-v1/,
    "adult progress needs a chapter-specific storage key",
  );
  assert.match(readerSource, /localStorage\.getItem\(HACKERS_PAINTERS_PROGRESS_KEY\)/);
  assert.match(readerSource, /localStorage\.setItem\(/);
  assert.match(progressSource, /writingDraft:\s*string/);
});
