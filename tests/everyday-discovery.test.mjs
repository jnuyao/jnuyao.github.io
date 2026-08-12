import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadModules() {
  const compilerOptions = {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  };

  const transpileToDataUrl = (source, fileName, label) => {
    const transpiled = ts.transpileModule(source, {
      compilerOptions,
      fileName,
      reportDiagnostics: true,
    });
    assert.deepEqual(
      (transpiled.diagnostics ?? []).filter(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
      ),
      [],
      `${label} must transpile cleanly`,
    );
    return `data:text/javascript;base64,${Buffer.from(
      transpiled.outputText,
    ).toString("base64")}#${label}-${Date.now()}-${Math.random()}`;
  };

  const expansionModules = [
    {
      specifier: "./everyday-discovery-market-weather-data",
      fileName: "everyday-discovery-market-weather-data.ts",
      url: new URL("../app/everyday-discovery-market-weather-data.ts", import.meta.url),
      label: "everyday-market-weather-data",
    },
    {
      specifier: "./everyday-discovery-transport-body-data",
      fileName: "everyday-discovery-transport-body-data.ts",
      url: new URL("../app/everyday-discovery-transport-body-data.ts", import.meta.url),
      label: "everyday-transport-body-data",
    },
    {
      specifier: "./everyday-discovery-home-school-play-data",
      fileName: "everyday-discovery-home-school-play-data.ts",
      url: new URL("../app/everyday-discovery-home-school-play-data.ts", import.meta.url),
      label: "everyday-home-school-play-data",
    },
  ];
  const expansionUrls = new Map();
  for (const expansion of expansionModules) {
    const source = await readFile(expansion.url, "utf8");
    expansionUrls.set(
      expansion.specifier,
      transpileToDataUrl(source, expansion.fileName, expansion.label),
    );
  }

  let dataSource = await readFile(
    new URL("../app/everyday-discovery-data.ts", import.meta.url),
    "utf8",
  );
  for (const [specifier, expansionUrl] of expansionUrls) {
    const escapedSpecifier = specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    dataSource = dataSource.replace(
      new RegExp(`from\\s+["']${escapedSpecifier}(?:\\.ts)?["']`, "g"),
      `from "${expansionUrl}"`,
    );
  }
  const dataUrl = transpileToDataUrl(
    dataSource,
    "everyday-discovery-data.ts",
    "everyday-data",
  );

  const progressSource = (await readFile(
    new URL("../app/everyday-discovery-progress.ts", import.meta.url),
    "utf8",
  )).replace(
    /from\s+["']\.\/everyday-discovery-data(?:\.ts)?["']/,
    `from "${dataUrl}"`,
  );
  const transpiledProgress = ts.transpileModule(progressSource, {
    compilerOptions,
    fileName: "everyday-discovery-progress.ts",
    reportDiagnostics: true,
  });
  assert.deepEqual(
    (transpiledProgress.diagnostics ?? []).filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    ),
    [],
    "everyday discovery progress must transpile cleanly",
  );
  const progressUrl = `data:text/javascript;base64,${Buffer.from(
    transpiledProgress.outputText,
  ).toString("base64")}#everyday-progress-${Date.now()}-${Math.random()}`;
  const [data, progress] = await Promise.all([import(dataUrl), import(progressUrl)]);
  return { data, progress };
}

function lettersOnly(value) {
  return value.replace(/[^a-z]/gi, "").toLowerCase();
}

test("ten everyday scenes contain 80 complete, child-coachable word lessons", async () => {
  const { data } = await loadModules();
  assert.deepEqual(data.EVERYDAY_DISCOVERY_SCENE_IDS, [
    "kitchen", "animals", "plants", "supermarket", "weather",
    "transport", "body", "chores", "school", "playground",
  ]);
  assert.equal(data.EVERYDAY_DISCOVERY_IDS.length, 80);
  assert.equal(new Set(data.EVERYDAY_DISCOVERY_IDS).size, 80);
  assert.equal(data.EVERYDAY_DISCOVERY_ITEMS.length, 80);
  assert.equal(data.EVERYDAY_DISCOVERY_LESSONS, data.EVERYDAY_DISCOVERY_ITEMS);
  assert.deepEqual(
    data.EVERYDAY_DISCOVERY_ITEMS.map((item) => item.id),
    data.EVERYDAY_DISCOVERY_IDS,
  );
  assert.equal(Object.keys(data.EVERYDAY_DISCOVERY_IMAGE_CREDITS).length, 80);

  for (const scene of data.EVERYDAY_DISCOVERY_SCENES) {
    const items = data.everydayDiscoveryItemsForScene(scene.id);
    assert.equal(items.length, 8, `${scene.id} must have eight words`);
    assert.deepEqual(items.map((item) => item.id), scene.itemIds);
    assert.equal(scene.challenge.options.length, 3);
    assert.ok(scene.challenge.options.some((option) => option.id === scene.challenge.answerId));
  }

  for (const item of data.EVERYDAY_DISCOVERY_ITEMS) {
    assert.match(item.id, /^[a-z]+(?:-[a-z]+)*$/);
    assert.match(item.word, /^[a-z]+(?: [a-z]+)*$/);
    assert.match(item.wordZh, /[\u3400-\u9fff]/u);
    assert.equal(
      item.imageSrc,
      `/everyday-discovery/${item.sceneId}/${item.id}.jpg`,
    );
    const imageFile = await stat(resolve(ROOT, "public", item.imageSrc.slice(1)));
    assert.ok(imageFile.size > 20_000, `${item.id} needs a real local image`);
    assert.equal(
      item.wordAudioSrc,
      `/everyday-discovery-audio/${item.sceneId}/${item.id}/whole.mp3`,
    );
    assert.equal(
      item.coachAudioSrc,
      `/everyday-discovery-audio/${item.sceneId}/${item.id}/coach.mp3`,
    );
    assert.equal(
      item.descriptionAudioSrc,
      `/everyday-discovery-audio/${item.sceneId}/${item.id}/description.mp3`,
    );
    assert.ok(item.chunks.length >= 1 && item.chunks.length <= 4);
    assert.equal(
      lettersOnly(item.chunks.map((chunk) => chunk.text).join("")),
      lettersOnly(item.word),
      `${item.id} sound chunks must rebuild the spelling`,
    );
    assert.equal(new Set(item.chunks.map((chunk) => chunk.id)).size, item.chunks.length);
    assert.equal(item.chunks.filter((chunk) => chunk.stressed).length, 1);
    assert.ok(item.chunks.every((chunk) => item.coachScript.includes(chunk.cue)));
    assert.ok(item.coachScript.toLowerCase().includes(item.word));
    assert.match(item.ipa, /^\/.+\/$/);
    assert.equal(item.description.length, 3);
    assert.equal(item.descriptionZh.length, 3);
    assert.equal(item.descriptionKeywords.length, 3);
    const descriptionText = item.description.join(" ");
    const wordCount = descriptionText.match(/[A-Za-z]+(?:-[A-Za-z]+)*/g)?.length ?? 0;
    assert.ok(wordCount >= 15 && wordCount <= 45, `${item.id} has ${wordCount} description words`);
    assert.ok(item.description.every((sentence) => /^[A-Z].*[.!?]$/.test(sentence)));
    assert.ok(item.descriptionZh.every((sentence) => /[\u3400-\u9fff].*。$/u.test(sentence)));
    for (const keyword of item.descriptionKeywords) {
      assert.match(keyword.word, /^[A-Za-z][A-Za-z -]*$/);
      assert.match(keyword.zh, /[\u3400-\u9fff]/u);
      assert.ok(descriptionText.toLowerCase().includes(keyword.word.toLowerCase()));
    }
    assert.match(item.discovery, /^[A-Z].*[.!?]$/);
    assert.match(item.discoveryZh, /[\u3400-\u9fff].*(?:。|？|！)$/u);
    assert.match(item.factSourceUrl, /^https:\/\//);
    assert.match(item.imageCredit.sourceUrl, /^https:\/\//);
    assert.match(item.imageCredit.licenseUrl, /^https:\/\//);
    assert.match(item.imageCredit.author, /\S/);
  }
});

test("everyday progress is local, allow-listed and bounded", async () => {
  const { progress } = await loadModules();
  assert.equal(progress.EVERYDAY_DISCOVERY_PROGRESS_KEY, "story-garden-everyday-discovery-v1");
  assert.deepEqual(progress.emptyEverydayDiscoveryProgress(), {
    version: 1,
    exploredIds: [],
    completedChallengeIds: [],
    items: {},
  });

  const clean = progress.normaliseEverydayDiscoveryProgress({
    version: 1,
    lastSceneId: "animals",
    lastItemId: "octopus",
    exploredIds: ["onion", "onion", "not-a-word", 42],
    completedChallengeIds: ["kitchen", "not-a-scene", "kitchen"],
    items: {
      onion: {
        heardWhole: true,
        heardCoach: true,
        saidIt: true,
        spelledIt: true,
        spellingAttempts: 500,
        completedAt: "x".repeat(100),
        updatedAt: 123.8,
        transcript: "must disappear",
      },
      octopus: {
        heardWhole: true,
        heardCoach: "yes",
        saidIt: 1,
        spelledIt: false,
        spellingAttempts: -3,
        updatedAt: -20,
      },
      "not-a-word": { heardWhole: true, heardCoach: true, saidIt: true, spelledIt: true },
    },
  });

  assert.equal(clean.lastSceneId, "animals");
  assert.equal(clean.lastItemId, "octopus");
  assert.deepEqual(clean.exploredIds, ["onion"]);
  assert.deepEqual(clean.completedChallengeIds, ["kitchen"]);
  assert.deepEqual(Object.keys(clean.items), ["onion", "octopus"]);
  assert.deepEqual(clean.items.onion, {
    heardWhole: true,
    heardCoach: true,
    saidIt: true,
    spelledIt: true,
    spellingAttempts: 99,
    completedAt: "x".repeat(40),
    updatedAt: 123,
  });
  assert.equal(progress.everydayDiscoveryIsComplete(clean.items.onion), true);
  assert.equal(progress.everydayDiscoveryIsComplete(clean.items.octopus), false);
});

test("standalone routing, spelling interaction and prepared audio stay complete", async () => {
  const [{ data }, pageSource, labSource, narrationSource, manifestText] = await Promise.all([
    loadModules(),
    readFile(resolve(ROOT, "app/page.tsx"), "utf8"),
    readFile(resolve(ROOT, "app/everyday-discovery-lab.tsx"), "utf8"),
    readFile(resolve(ROOT, "app/narration.ts"), "utf8"),
    readFile(resolve(ROOT, "work/everyday-discovery-audio/manifest.json"), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);
  const expectedJobIds = data.EVERYDAY_DISCOVERY_ITEMS.flatMap((item) => [
    `${item.sceneId}/${item.id}/whole`,
    `${item.sceneId}/${item.id}/coach`,
    `${item.sceneId}/${item.id}/description`,
    ...item.chunks.map((chunk) => `${item.sceneId}/${item.id}/chunk-${chunk.id}`),
  ]);

  assert.equal(expectedJobIds.length, data.EVERYDAY_DISCOVERY_ITEMS.reduce(
    (total, item) => total + 3 + item.chunks.length,
    0,
  ));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.voice, "Aoede");
  assert.equal(manifest.expectedJobs, expectedJobIds.length);
  assert.equal(manifest.jobs.length, expectedJobIds.length);
  assert.deepEqual(manifest.jobs.map((job) => job.id).sort(), [...expectedJobIds].sort());
  for (const job of manifest.jobs) {
    assert.match(job.id, /^[a-z0-9-]+\/[a-z0-9-]+\/(?:whole|coach|description|chunk-[a-z0-9-]+)$/);
    const [standardFile, childFile] = await Promise.all([
      stat(resolve(ROOT, "public", job.standardPath)),
      stat(resolve(ROOT, "public", job.childPath)),
    ]);
    assert.equal(standardFile.size, job.standard.bytes);
    assert.equal(childFile.size, job.child.bytes);
    assert.ok(job.child.durationSeconds > job.standard.durationSeconds);
  }

  assert.match(pageSource, /params\.get\("lab"\) === "everyday-discovery"/);
  assert.match(pageSource, /Everyday Discovery Lab/);
  assert.match(pageSource, /localStorage\.getItem\(EVERYDAY_DISCOVERY_PROGRESS_KEY\)/);
  assert.match(pageSource, /localStorage\.removeItem\(EVERYDAY_DISCOVERY_PROGRESS_KEY\)/);
  assert.match(labSource, /Meet this word · 认识它/);
  assert.match(labSource, /Build the word from letters/);
  assert.match(labSource, /Check my word/);
  assert.match(labSource, /preparedOnly:\s*true/);
  assert.doesNotMatch(labSource, /SpeechRecognition|MediaRecorder|scorePronunciation/);
  assert.match(narrationSource, /EVERYDAY_DISCOVERY_AUDIO_CACHE_VERSION/);
  assert.match(narrationSource, /everyday-discovery-audio-standard/);
});
