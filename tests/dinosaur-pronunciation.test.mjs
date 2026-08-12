import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGINAL_V1_DINOSAUR_IDS = [
  "allosaurus",
  "spinosaurus",
  "triceratops",
  "suchomimus",
  "acrocanthosaurus",
  "cryolophosaurus",
];

async function loadDinosaurPronunciationModules() {
  const compilerOptions = {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  };

  const dataSource = await readFile(
    new URL("../app/dinosaur-pronunciation-data.ts", import.meta.url),
    "utf8",
  );
  const transpiledData = ts.transpileModule(dataSource, {
    compilerOptions,
    fileName: "dinosaur-pronunciation-data.ts",
    reportDiagnostics: true,
  });
  const dataErrors = (transpiledData.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(
    dataErrors,
    [],
    "app/dinosaur-pronunciation-data.ts must transpile cleanly",
  );
  const dataModuleUrl = `data:text/javascript;base64,${Buffer.from(
    transpiledData.outputText,
  ).toString("base64")}#dino-pronunciation-data-${Date.now()}-${Math.random()}`;

  const progressSource = (await readFile(
    new URL("../app/dinosaur-pronunciation-progress.ts", import.meta.url),
    "utf8",
  )).replace(
    /from\s+["']\.\/dinosaur-pronunciation-data["']/,
    `from "${dataModuleUrl}"`,
  );
  const transpiledProgress = ts.transpileModule(progressSource, {
    compilerOptions,
    fileName: "dinosaur-pronunciation-progress.ts",
    reportDiagnostics: true,
  });
  const progressErrors = (transpiledProgress.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(
    progressErrors,
    [],
    "app/dinosaur-pronunciation-progress.ts must transpile cleanly",
  );
  const progressModuleUrl = `data:text/javascript;base64,${Buffer.from(
    transpiledProgress.outputText,
  ).toString("base64")}#dino-pronunciation-progress-${Date.now()}-${Math.random()}`;

  const [data, progress] = await Promise.all([
    import(dataModuleUrl),
    import(progressModuleUrl),
  ]);
  return { data, progress };
}

function lettersOnly(value) {
  return value.replace(/[^a-z]/gi, "").toLowerCase();
}

test("the pronunciation trail has ordered, child-coachable dinosaur names", async () => {
  const { data } = await loadDinosaurPronunciationModules();

  assert.ok(
    data.DINOSAUR_PRONUNCIATION_IDS.length >= ORIGINAL_V1_DINOSAUR_IDS.length,
  );
  assert.equal(data.DINOSAUR_PRONUNCIATION_IDS.length, 20);
  assert.equal(
    new Set(data.DINOSAUR_PRONUNCIATION_IDS).size,
    data.DINOSAUR_PRONUNCIATION_IDS.length,
  );
  for (const originalId of ORIGINAL_V1_DINOSAUR_IDS) {
    assert.ok(
      data.DINOSAUR_PRONUNCIATION_IDS.includes(originalId),
      `the original v1 dinosaur ${originalId} must remain available`,
    );
  }
  assert.equal(
    data.DINOSAUR_PRONUNCIATION_ITEMS.length,
    data.DINOSAUR_PRONUNCIATION_IDS.length,
  );
  assert.equal(
    data.DINOSAUR_PRONUNCIATION_LESSONS,
    data.DINOSAUR_PRONUNCIATION_ITEMS,
  );
  assert.deepEqual(
    data.DINOSAUR_PRONUNCIATION_ITEMS.map((item) => item.id),
    data.DINOSAUR_PRONUNCIATION_IDS,
  );
  assert.deepEqual(
    [...new Set(data.DINOSAUR_PRONUNCIATION_ITEMS.map((item) => item.difficulty))].sort(),
    [1, 2, 3],
  );
  assert.equal(Object.keys(data.DINOSAUR_PRONUNCIATION_IMAGE_CREDITS).length, 18);

  for (const item of data.DINOSAUR_PRONUNCIATION_ITEMS) {
    assert.match(item.id, /^[a-z]+$/);
    assert.ok(item.name.trim());
    assert.match(item.nameZh, /[\u3400-\u9fff]/u);
    assert.equal(item.imageSrc, `/dinosaur-pronunciation/${item.id}.jpg`);
    const imageFile = await stat(resolve(ROOT, "public", item.imageSrc.slice(1)));
    assert.ok(imageFile.size > 20_000, `${item.id} needs a real local image`);
    assert.equal(
      item.nameAudioSrc,
      `/dinosaur-pronunciation-audio/${item.id}/whole.mp3`,
    );
    assert.equal(
      item.coachAudioSrc,
      `/dinosaur-pronunciation-audio/${item.id}/coach.mp3`,
    );
    assert.equal(
      item.descriptionAudioSrc,
      `/dinosaur-pronunciation-audio/${item.id}/description.mp3`,
    );
    assert.ok(item.chunks.length >= 4 && item.chunks.length <= 7);
    assert.equal(
      lettersOnly(item.chunks.map((chunk) => chunk.text).join("")),
      lettersOnly(item.name),
      `${item.id} spelling chunks must rebuild the displayed name`,
    );
    assert.equal(
      new Set(item.chunks.map((chunk) => chunk.id)).size,
      item.chunks.length,
      `${item.id} chunk IDs must be unique`,
    );
    assert.equal(
      item.chunks.filter((chunk) => chunk.stressed).length,
      1,
      `${item.id} needs exactly one primary stress`,
    );
    assert.ok(item.chunks.every((chunk) => chunk.text.trim() && chunk.cue.trim()));
    assert.ok(item.chunks.every((chunk) => item.coachScript.includes(chunk.cue)));
    assert.ok(item.coachScript.includes(item.name));
    assert.match(item.fact, /^[A-Z].*[.!?]$/);
    assert.match(item.factZh, /[\u3400-\u9fff]/u);
    assert.equal(item.description.length, 3, `${item.id} English description`);
    assert.equal(item.descriptionZh.length, 3, `${item.id} Chinese description`);
    assert.equal(item.descriptionKeywords.length, 3, `${item.id} keywords`);
    const descriptionText = item.description.join(" ");
    const wordCount = descriptionText.match(/[A-Za-z]+(?:-[A-Za-z]+)*/g)?.length ?? 0;
    assert.ok(
      wordCount >= 25 && wordCount <= 40,
      `${item.id} description must stay between 25 and 40 words; found ${wordCount}`,
    );
    assert.ok(
      item.description.every((sentence) => /^[A-Z].*[.!?]$/.test(sentence)),
      `${item.id} needs three complete English sentences`,
    );
    assert.ok(
      item.descriptionZh.every((sentence) => /[\u3400-\u9fff].*。$/u.test(sentence)),
      `${item.id} needs three complete Chinese sentences`,
    );
    for (const keyword of item.descriptionKeywords) {
      assert.match(keyword.word, /^[A-Za-z][A-Za-z-]*$/);
      assert.match(keyword.zh, /[\u3400-\u9fff]/u);
      assert.ok(
        descriptionText.toLowerCase().includes(keyword.word.toLowerCase()),
        `${item.id} keyword ${keyword.word} must appear in its description`,
      );
    }
    assert.match(item.soundTip, /[A-Za-z]/);
    assert.match(item.soundTipZh, /[\u3400-\u9fff]/u);
    assert.match(item.ipa, /^\/.+\/$/);
    assert.match(item.imageSourceUrl, /^https:\/\/(?:www\.abcmouse\.com|commons\.wikimedia\.org)\//);
    assert.match(item.factSourceUrl, /^https:\/\/www\.nhm\.ac\.uk\//);
    assert.equal(data.dinosaurPronunciationById(item.id), item);
    assert.equal(data.isDinosaurPronunciationId(item.id), true);
    const imageCredit = data.dinosaurPronunciationImageCreditById(item.id);
    if (imageCredit) {
      assert.equal(imageCredit.sourceUrl, item.imageSourceUrl);
      assert.match(imageCredit.author, /\S/);
      assert.match(imageCredit.license, /^(?:CC BY(?:-SA)? 4\.0|Public domain)$/);
      assert.match(imageCredit.licenseUrl, /^https:\/\//);
    }
  }

  assert.equal(data.isDinosaurPronunciationId("not-a-dinosaur"), false);
});

test("pronunciation progress is independent, allow-listed and bounded", async () => {
  const { progress } = await loadDinosaurPronunciationModules();

  assert.equal(
    progress.DINOSAUR_PRONUNCIATION_PROGRESS_KEY,
    "story-garden-dinosaur-pronunciation-v1",
  );
  assert.deepEqual(progress.emptyDinosaurPronunciationProgress(), {
    version: 1,
    exploredIds: [],
    dinosaurs: {},
  });

  const clean = progress.normaliseDinosaurPronunciationProgress({
    version: 1,
    lastDinosaurId: "triceratops",
    exploredIds: [
      "allosaurus",
      "allosaurus",
      "not-a-dinosaur",
      42,
    ],
    dinosaurs: {
      allosaurus: {
        heardWhole: true,
        heardCoach: true,
        saidIt: true,
        repeatCount: 1_000,
        completedAt: "x".repeat(100),
        updatedAt: 123.9,
        score: 100,
        transcript: "must disappear",
      },
      spinosaurus: [],
      triceratops: {
        heardWhole: true,
        heardCoach: "yes",
        saidIt: 1,
        repeatCount: -8,
        updatedAt: -40,
      },
      "not-a-dinosaur": {
        heardWhole: true,
        heardCoach: true,
        saidIt: true,
        repeatCount: 1,
      },
    },
    unknownRootField: "must disappear",
  });

  assert.equal(clean.version, 1);
  assert.equal(clean.lastDinosaurId, "triceratops");
  assert.deepEqual(clean.exploredIds, ["allosaurus", "triceratops"]);
  assert.deepEqual(Object.keys(clean.dinosaurs), ["allosaurus", "triceratops"]);
  assert.deepEqual(clean.dinosaurs.allosaurus, {
    heardWhole: true,
    heardCoach: true,
    saidIt: true,
    repeatCount: 99,
    completedAt: "x".repeat(40),
    updatedAt: 123,
  });
  assert.deepEqual(clean.dinosaurs.triceratops, {
    heardWhole: true,
    heardCoach: false,
    saidIt: false,
    repeatCount: 0,
    completedAt: undefined,
    updatedAt: 0,
  });
  assert.equal(
    progress.dinosaurPronunciationIsComplete(clean.dinosaurs.allosaurus),
    true,
  );
  assert.equal(
    progress.dinosaurPronunciationIsComplete(clean.dinosaurs.triceratops),
    false,
  );
  assert.equal(progress.dinosaurPronunciationIsComplete(undefined), false);

  const empty = { version: 1, exploredIds: [], dinosaurs: {} };
  assert.deepEqual(
    progress.normaliseDinosaurPronunciationProgress({ version: 2, dinosaurs: {} }),
    empty,
  );
  assert.deepEqual(
    progress.normaliseDinosaurPronunciationProgress({ version: 1, dinosaurs: [] }),
    empty,
  );
  assert.deepEqual(progress.normaliseDinosaurPronunciationProgress(null), empty);
});

test("original six-item v1 pronunciation progress remains compatible", async () => {
  const { data, progress } = await loadDinosaurPronunciationModules();
  const originalDinosaurs = Object.fromEntries(
    ORIGINAL_V1_DINOSAUR_IDS.map((id, index) => [
      id,
      {
        heardWhole: true,
        heardCoach: index % 2 === 0,
        saidIt: index % 3 === 0,
        repeatCount: index + 1,
        updatedAt: 1_000 + index,
      },
    ]),
  );

  const clean = progress.normaliseDinosaurPronunciationProgress({
    version: 1,
    lastDinosaurId: "cryolophosaurus",
    exploredIds: [...ORIGINAL_V1_DINOSAUR_IDS],
    dinosaurs: originalDinosaurs,
  });

  assert.equal(clean.version, 1);
  assert.equal(clean.lastDinosaurId, "cryolophosaurus");
  assert.deepEqual(
    [...clean.exploredIds].sort(),
    [...ORIGINAL_V1_DINOSAUR_IDS].sort(),
  );
  assert.deepEqual(
    Object.keys(clean.dinosaurs).sort(),
    [...ORIGINAL_V1_DINOSAUR_IDS].sort(),
  );
  for (const [index, id] of ORIGINAL_V1_DINOSAUR_IDS.entries()) {
    assert.deepEqual(clean.dinosaurs[id], {
      heardWhole: true,
      heardCoach: index % 2 === 0,
      saidIt: index % 3 === 0,
      repeatCount: index + 1,
      completedAt: undefined,
      updatedAt: 1_000 + index,
    });
  }
  for (const newId of data.DINOSAUR_PRONUNCIATION_IDS.filter(
    (id) => !ORIGINAL_V1_DINOSAUR_IDS.includes(id),
  )) {
    assert.equal(clean.exploredIds.includes(newId), false);
    assert.equal(clean.dinosaurs[newId], undefined);
  }
});

test("prepared dinosaur audio, standalone routing and shelf entry stay complete", async () => {
  const [{ data }, manifestText, pageSource, labSource, narrationSource] = await Promise.all([
    loadDinosaurPronunciationModules(),
    readFile(resolve(ROOT, "work/dinosaur-pronunciation-audio/manifest.json"), "utf8"),
    readFile(resolve(ROOT, "app/page.tsx"), "utf8"),
    readFile(resolve(ROOT, "app/dinosaur-pronunciation-lab.tsx"), "utf8"),
    readFile(resolve(ROOT, "app/narration.ts"), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);
  const expectedJobIds = data.DINOSAUR_PRONUNCIATION_ITEMS.flatMap((item) => [
    `${item.id}/whole`,
    `${item.id}/coach`,
    `${item.id}/description`,
    ...item.chunks.map((chunk) => `${item.id}/chunk-${chunk.id}`),
  ]);
  const expectedJobCount = data.DINOSAUR_PRONUNCIATION_ITEMS.reduce(
    (total, item) => total + 3 + item.chunks.length,
    0,
  );

  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.voice, "Aoede");
  assert.equal(expectedJobIds.length, expectedJobCount);
  assert.equal(manifest.expectedJobs, expectedJobCount);
  assert.equal(manifest.jobs.length, expectedJobCount);
  assert.equal(new Set(manifest.jobs.map((job) => job.id)).size, expectedJobCount);
  assert.equal(
    manifest.jobs.filter((job) => job.id.endsWith("/description")).length,
    data.DINOSAUR_PRONUNCIATION_ITEMS.length,
  );
  assert.deepEqual(
    manifest.jobs.map((job) => job.id).sort(),
    [...expectedJobIds].sort(),
    "the audio manifest must contain exactly the planned dinosaur jobs",
  );
  for (const item of data.DINOSAUR_PRONUNCIATION_ITEMS) {
    const expectedItemJobIds = [
      `${item.id}/whole`,
      `${item.id}/coach`,
      `${item.id}/description`,
      ...item.chunks.map((chunk) => `${item.id}/chunk-${chunk.id}`),
    ].sort();
    assert.deepEqual(
      manifest.jobs
        .filter((job) => job.id.startsWith(`${item.id}/`))
        .map((job) => job.id)
        .sort(),
      expectedItemJobIds,
      `${item.id} must have whole, coach, description and every chunk clip`,
    );
  }
  for (const job of manifest.jobs) {
    assert.match(job.id, /^[a-z0-9-]+\/(?:whole|coach|description|chunk-[a-z0-9-]+)$/);
    assert.match(job.standardPath, /^dinosaur-pronunciation-audio-standard\/.+\.mp3$/);
    assert.match(job.childPath, /^dinosaur-pronunciation-audio\/.+\.mp3$/);
    const [standardFile, childFile] = await Promise.all([
      stat(resolve(ROOT, "public", job.standardPath)),
      stat(resolve(ROOT, "public", job.childPath)),
    ]);
    assert.equal(standardFile.size, job.standard.bytes, `${job.id} standard bytes`);
    assert.equal(childFile.size, job.child.bytes, `${job.id} child bytes`);
    assert.ok(job.standard.durationSeconds > 0, `${job.id} standard duration`);
    assert.ok(job.child.durationSeconds > job.standard.durationSeconds, `${job.id} child pace`);
  }

  assert.match(
    narrationSource,
    /\/dinosaur-pronunciation-audio\(\?:-standard\)\?\\\/\(\.\+\\\.mp3\)/,
  );
  assert.match(narrationSource, /DINOSAUR_PRONUNCIATION_AUDIO_CACHE_VERSION/);
  assert.match(labSource, /chunk-\$\{chunk\.id\}\.mp3/);
  assert.match(labSource, /audioSrc:\s*dinosaur\.descriptionAudioSrc/);
  assert.match(labSource, /Meet this dinosaur · 认识它/);
  assert.match(labSource, /dinosaur\.descriptionKeywords\.map/);
  assert.match(labSource, /preparedOnly:\s*true/);
  assert.doesNotMatch(labSource, /SpeechRecognition|MediaRecorder|scorePronunciation/);

  const pictureIndex = labSource.indexOf('className="dino-pronunciation-profile__picture"');
  const nameAudioIndex = labSource.indexOf("dino-pronunciation-profile__pronunciation");
  const overviewIndex = labSource.indexOf('className="dino-pronunciation-overview"');
  const descriptionIndex = labSource.indexOf('className="dino-pronunciation-description"');
  const practiceIndex = labSource.indexOf('className="dino-pronunciation-practice"');
  assert.ok(
    pictureIndex >= 0
      && pictureIndex < nameAudioIndex
      && nameAudioIndex < overviewIndex
      && overviewIndex < descriptionIndex
      && descriptionIndex < practiceIndex,
    "the lesson must place the picture and name audio before the right-side English overview",
  );
  assert.equal(
    [...labSource.matchAll(/id="dino-whole-title"/g)].length,
    1,
    "the moved whole-name control must keep one unique heading",
  );

  const parseStart = pageSource.indexOf("function parseViewFromUrl");
  const labRoute = pageSource.indexOf('params.get("lab") === "dinosaur-pronunciation"', parseStart);
  const bookLookup = pageSource.indexOf('const bookSlug = params.get("book")', parseStart);
  assert.ok(parseStart >= 0 && labRoute > parseStart && labRoute < bookLookup);
  const labRender = pageSource.indexOf('if (view.kind === "dinosaur-pronunciation-lab")');
  const missingBookGuard = pageSource.indexOf('if (view.kind !== "shelf" && !book)');
  assert.ok(labRender >= 0 && labRender < missingBookGuard);
  assert.match(pageSource, /className="dino-shelf-invite dino-pronunciation-shelf-invite"/);
  assert.match(pageSource, /localStorage\.getItem\(DINOSAUR_PRONUNCIATION_PROGRESS_KEY\)/);
  assert.match(pageSource, /localStorage\.removeItem\(DINOSAUR_PRONUNCIATION_PROGRESS_KEY\)/);

  const completionStart = pageSource.indexOf("function bookIsComplete");
  const completionEnd = pageSource.indexOf("function parseViewFromUrl", completionStart);
  assert.doesNotMatch(
    pageSource.slice(completionStart, completionEnd),
    /dinosaur|pronunciation/i,
    "Dinosaur name practice must not gate picture-book English completion",
  );
});
