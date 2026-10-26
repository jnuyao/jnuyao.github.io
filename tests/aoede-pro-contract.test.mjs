import assert from "node:assert/strict";
import test from "node:test";

import {
  PRO_EXPECTED_TOTAL,
  PRO_BATCH_TOOL_VERSION,
  PRO_PACING_POLICY,
  PRO_PACING_POLICY_VERSION,
  PRO_PACING_SCHEMA_VERSION,
  PRO_PACING_TRANSFORM_VERSION,
  PRO_SOURCE_GENERATOR_VERSION,
  PRO_SOURCE_MODEL,
  PRO_SOURCE_VOICE,
  assertCompleteProSourceManifest,
  assertProBatchJournal,
  assertProGeneratorReceipt,
  pacedClipSourceMatches,
  pacedManifestMatchesProSource,
  proPacingPolicyMatches,
  proPausePaddingRecordMatches,
  proPacingSettingsForJob,
  proPacingSettingsMatch,
} from "../scripts/aoede-pro-contract.mjs";
import {
  buildPausePaddingPlan,
  buildTimelineEditFilter,
} from "../scripts/aoede-pacing-timeline.mjs";

const hashes = Array.from({ length: 12 }, (_, index) =>
  (index + 1).toString(16).repeat(64).slice(0, 64));

function completeManifestFixture() {
  return {
    schemaVersion: 1,
    generatorVersion: PRO_SOURCE_GENERATOR_VERSION,
    isolatedProduction: true,
    model: PRO_SOURCE_MODEL,
    voice: PRO_SOURCE_VOICE,
    source: { manifestSha256: hashes[0], planSha256: hashes[1] },
    plan: {
      generatorVersion: PRO_SOURCE_GENERATOR_VERSION,
      model: PRO_SOURCE_MODEL,
      voice: PRO_SOURCE_VOICE,
      planSha256: hashes[2],
      counts: { total: PRO_EXPECTED_TOTAL },
    },
    jobs: Array.from({ length: PRO_EXPECTED_TOTAL }, (_, index) => ({
      id: `fixture/${String(index).padStart(3, "0")}`,
      status: "complete",
    })),
    clips: Array.from({ length: PRO_EXPECTED_TOTAL }, (_, index) => ({
      id: `fixture/${String(index).padStart(3, "0")}`,
      status: "complete",
    })),
  };
}

function receiptFixture() {
  const sourceManifest = completeManifestFixture();
  const media = {
    bytes: 12_345,
    sha256: hashes[3],
    audioSha256: hashes[3],
    codec: "mp3",
    sampleRate: 24_000,
    channels: 1,
    bitrate: 64_000,
    durationSeconds: 3.2574,
    fullDecodePassed: true,
  };
  const sourceJob = {
    id: "dan-the-flying-man/01",
    outputPath: "audio/dan-the-flying-man/01.mp3",
    completedAt: "2026-07-14T00:00:00.000Z",
    displayTextSha256: hashes[4],
    spokenTextSha256: hashes[5],
    ttsTextSha256: hashes[6],
    promptSha256: hashes[7],
    requestSha256: hashes[8],
    batchName: "batches/pro_fixture_01",
    requestIndex: 0,
    mapping: "metadata",
    modelVersion: PRO_SOURCE_MODEL,
    responseId: "response-fixture-01",
    finishReason: "STOP",
    bytes: media.bytes,
    audioSha256: media.sha256,
    durationSeconds: 3.257,
    fullDecodePassed: true,
    receiptSha256: hashes[9],
  };
  const sourceClip = {
    id: sourceJob.id,
    relativePath: sourceJob.outputPath,
    status: "complete",
    bytes: media.bytes,
    fileHash: media.sha256,
    fullDecodePassed: true,
  };
  const receipt = {
    schemaVersion: 1,
    completedAt: sourceJob.completedAt,
    source: "gemini-batch-api",
    model: PRO_SOURCE_MODEL,
    voice: PRO_SOURCE_VOICE,
    proPlanSha256: sourceManifest.plan.planSha256,
    sourceManifestSha256: sourceManifest.source.manifestSha256,
    sourcePlanSha256: sourceManifest.source.planSha256,
    job: {
      id: sourceJob.id,
      outputPath: sourceJob.outputPath,
      displayTextSha256: sourceJob.displayTextSha256,
      spokenTextSha256: sourceJob.spokenTextSha256,
      ttsTextSha256: sourceJob.ttsTextSha256,
      promptSha256: sourceJob.promptSha256,
      requestSha256: sourceJob.requestSha256,
    },
    batch: {
      name: sourceJob.batchName,
      requestPlanSha256: hashes[10],
      requestIndex: sourceJob.requestIndex,
      mapping: sourceJob.mapping,
    },
    modelResponse: {
      modelVersion: PRO_SOURCE_MODEL,
      responseId: sourceJob.responseId,
      finishReason: "STOP",
      responseMimeType: "audio/L16;codec=pcm;rate=24000",
      rawPcmBytes: 96_000,
    },
    usageMetadata: { totalTokenCount: 12 },
    media,
    audio: structuredClone(media),
  };
  const journal = {
    schemaVersion: 1,
    toolVersion: PRO_BATCH_TOOL_VERSION,
    phase: "applied",
    requestPlanSha256: receipt.batch.requestPlanSha256,
    manifestPlanSha256: sourceManifest.plan.planSha256,
    sourceManifestSha256: sourceManifest.source.manifestSha256,
    sourcePlanSha256: sourceManifest.source.planSha256,
    model: PRO_SOURCE_MODEL,
    voice: PRO_SOURCE_VOICE,
    batchName: receipt.batch.name,
    jobs: [{
      id: sourceJob.id,
      requestIndex: 0,
      outputPath: sourceJob.outputPath,
      promptSha256: sourceJob.promptSha256,
      requestSha256: sourceJob.requestSha256,
    }],
    results: {
      [sourceJob.id]: {
        status: "complete",
        mapping: sourceJob.mapping,
        bytes: sourceJob.bytes,
        audioSha256: sourceClip.fileHash,
      },
    },
  };
  return { journal, receipt, sourceJob, sourceClip, sourceManifest, receiptSha256: hashes[9] };
}

test("only an isolated 134/134 Pro + Aoede manifest is complete", () => {
  const fixture = completeManifestFixture();
  assert.equal(assertCompleteProSourceManifest(fixture), fixture.plan.planSha256);

  const flash = structuredClone(fixture);
  flash.model = "gemini-2.5-flash-preview-tts";
  assert.throws(() => assertCompleteProSourceManifest(flash), /134\/134 complete/);

  const incomplete = structuredClone(fixture);
  incomplete.jobs[42].status = "pending";
  assert.throws(() => assertCompleteProSourceManifest(incomplete), /134\/134 complete/);

  const short = structuredClone(fixture);
  short.clips.pop();
  assert.throws(() => assertCompleteProSourceManifest(short), /134\/134 complete/);
});

test("legacy Flash paced output can never match the Pro pacing identity", () => {
  const contract = {
    sourceRoot: "work/pro-aoede-production",
    sourceManifestPath: "work/pro-aoede-production/manifest.json",
    sourcePlanSha256: hashes[2],
  };
  const pro = {
    schemaVersion: PRO_PACING_SCHEMA_VERSION,
    transformVersion: PRO_PACING_TRANSFORM_VERSION,
    pacingPolicy: PRO_PACING_POLICY,
    sourceRoot: contract.sourceRoot,
    sourceIdentity: {
      generatorVersion: PRO_SOURCE_GENERATOR_VERSION,
      manifestPath: contract.sourceManifestPath,
      model: PRO_SOURCE_MODEL,
      planSha256: contract.sourcePlanSha256,
      root: contract.sourceRoot,
      voice: PRO_SOURCE_VOICE,
    },
  };
  assert.equal(pacedManifestMatchesProSource(pro, contract), true);

  const legacy = structuredClone(pro);
  legacy.schemaVersion = 1;
  legacy.transformVersion = "aoede-pacing-v1";
  legacy.sourceRoot = "work/aoede-production";
  legacy.sourceIdentity.model = "gemini-2.5-flash-preview-tts";
  assert.equal(pacedManifestMatchesProSource(legacy, contract), false);

  const otherPlan = structuredClone(pro);
  otherPlan.sourceIdentity.planSha256 = hashes[11];
  assert.equal(pacedManifestMatchesProSource(otherPlan, contract), false);
});

test("the versioned P1 policy reproduces the selected 90 WPM Pro canary without over-stretching", () => {
  assert.equal(PRO_PACING_POLICY_VERSION, "p1-pro-canary-90wpm-v1");
  assert.equal(PRO_PACING_POLICY.targets.storyContentWpm, 90);
  assert.equal(PRO_PACING_POLICY.targets.listenReadContentWpm, 90);
  assert.equal(PRO_PACING_POLICY.targets.speakWriteContentWpm, 85);
  assert.equal(PRO_PACING_POLICY.tempoFloor, 0.72);
  assert.deepEqual(PRO_PACING_POLICY.floorLimitedPausePadding, {
    contentWpmCeiling: 110,
    detectionNoise: "-40dB",
    detectionMinimumSeconds: 0.05,
    maxCandidates: 3,
    maxFinalPauseSeconds: 0.65,
    maxAddedSeconds: 1.2,
  });

  const story = { kind: "story", taskType: null, wordCount: 39 };
  const storySettings = proPacingSettingsForJob(story);
  assert.deepEqual(storySettings, {
    policyVersion: PRO_PACING_POLICY_VERSION,
    activeWpmCap: 150,
    contentWpmTarget: 90,
    minimumContentSeconds: null,
    tempoFloor: 0.72,
  });
  assert.equal(
    proPacingSettingsMatch({ ...storySettings, tempo: 0.72, floorHit: true }, story),
    true,
  );
  assert.equal(
    proPacingSettingsMatch(
      { ...storySettings, contentWpmTarget: 105, tempo: 0.72, floorHit: true },
      story,
    ),
    false,
  );

  const shortWrite = { kind: "task", taskType: "write", wordCount: 7 };
  assert.deepEqual(proPacingSettingsForJob(shortWrite), {
    policyVersion: PRO_PACING_POLICY_VERSION,
    activeWpmCap: 150,
    contentWpmTarget: null,
    minimumContentSeconds: 5.15,
    tempoFloor: 0.72,
  });
  assert.equal(proPacingPolicyMatches(structuredClone(PRO_PACING_POLICY)), true);
  const changed = structuredClone(PRO_PACING_POLICY);
  changed.targets.storyContentWpm = 105;
  assert.equal(proPacingPolicyMatches(changed), false);
});

test("floor-limited outliers add bounded silence only at existing phrase gaps", () => {
  const plan = buildPausePaddingPlan({
    job: { kind: "task", taskType: "speak", wordCount: 9 },
    pacing: { floorHit: true },
    metrics: { contentSeconds: 4.15, durationSeconds: 4.9 },
    microIntervals: [
      { start: 0, end: 0.25, duration: 0.25 },
      { start: 1.1, end: 1.21, duration: 0.11 },
      { start: 2.05, end: 2.28, duration: 0.23 },
      { start: 3.25, end: 3.39, duration: 0.14 },
      { start: 4.6, end: 4.9, duration: 0.3 },
    ],
    removals: [],
  });
  assert.equal(plan.applied, true);
  assert.equal(plan.candidateCount, 3);
  assert.equal(plan.additions.length, 3);
  assert.ok(plan.addedSeconds > 0.75 && plan.addedSeconds < 0.77);
  for (const addition of plan.additions) {
    assert.ok(addition.originalSilenceSeconds + addition.seconds <= 0.650001);
  }

  const edit = buildTimelineEditFilter(4.9, [], plan.additions);
  assert.equal(Number(edit.addedSeconds.toFixed(3)), plan.addedSeconds);
  assert.match(edit.filter, /anullsrc=r=24000:cl=mono/);
  assert.match(edit.filter, /concat=n=7:v=0:a=1\[out\]$/);

  const record = {
    pacing: { floorHit: true },
    afterTempo: { durationSeconds: 4.9 },
    final: { contentWpm: 110 },
    silenceTrim: { pausePadding: plan },
  };
  assert.equal(proPausePaddingRecordMatches(record), true);
  assert.equal(
    proPausePaddingRecordMatches({ ...record, final: { contentWpm: 111 } }),
    false,
  );

  const normal = buildPausePaddingPlan({
    job: { kind: "story", taskType: null, wordCount: 13 },
    pacing: { floorHit: false },
    metrics: { contentSeconds: 8.7, durationSeconds: 9.2 },
    microIntervals: [],
    removals: [],
  });
  assert.equal(normal.applied, false);
  assert.deepEqual(normal.additions, []);
});

test("a paced clip is reusable only for the exact Pro manifest, generator receipt and audio", () => {
  const expected = {
    audioSha256: hashes[3],
    sourceRecordSha256: hashes[4],
    generatorReceiptSha256: hashes[5],
    generatorJournalSha256: hashes[6],
    sourceManifestSha256: hashes[7],
    sourceManifestPath: "work/pro-aoede-production/manifest.json",
    sourcePlanSha256: hashes[8],
  };
  const source = {
    hash: expected.audioSha256,
    recordHash: expected.sourceRecordSha256,
    generatorReceiptHash: expected.generatorReceiptSha256,
    generatorJournalHash: expected.generatorJournalSha256,
    manifestHash: expected.sourceManifestSha256,
    manifestPath: expected.sourceManifestPath,
    planSha256: expected.sourcePlanSha256,
    model: PRO_SOURCE_MODEL,
    voice: PRO_SOURCE_VOICE,
  };
  assert.equal(pacedClipSourceMatches(source, expected), true);
  for (const key of ["hash", "recordHash", "generatorReceiptHash", "generatorJournalHash", "manifestHash", "planSha256"]) {
    const changed = { ...source, [key]: hashes[11] };
    assert.equal(pacedClipSourceMatches(changed, expected), false, key);
  }
  assert.equal(
    pacedClipSourceMatches({ ...source, model: "gemini-2.5-flash-preview-tts" }, expected),
    false,
  );
});

test("generator receipt binds exact plan, request, Batch mapping, model response and decoded media", () => {
  const fixture = receiptFixture();
  assert.equal(assertProGeneratorReceipt(fixture), true);

  const mutations = [
    (copy) => { copy.receipt.model = "gemini-2.5-flash-preview-tts"; },
    (copy) => { copy.receipt.job.spokenTextSha256 = hashes[11]; },
    (copy) => { copy.receipt.batch.mapping = "array-order-guess"; },
    (copy) => { copy.receipt.modelResponse.modelVersion = "gemini-2.5-flash-preview-tts"; },
    (copy) => { copy.receipt.modelResponse.responseId = ""; },
    (copy) => { copy.receipt.media.fullDecodePassed = false; },
    (copy) => { copy.receipt.media.sha256 = hashes[11]; },
    (copy) => { copy.receiptSha256 = hashes[11]; },
  ];
  for (const mutate of mutations) {
    const copy = structuredClone(fixture);
    mutate(copy);
    assert.throws(() => assertProGeneratorReceipt(copy), /does not strictly match/);
  }
});

test("generator receipt must be backed by its exact terminal Batch journal", () => {
  const fixture = receiptFixture();
  assert.equal(assertProBatchJournal(fixture), true);

  const wrongPlan = structuredClone(fixture);
  wrongPlan.journal.manifestPlanSha256 = hashes[11];
  assert.throws(() => assertProBatchJournal(wrongPlan), /does not support receipt/);

  const guessedMapping = structuredClone(fixture);
  guessedMapping.journal.results[fixture.sourceJob.id].mapping = "array-order-guess";
  assert.throws(() => assertProBatchJournal(guessedMapping), /does not support receipt/);

  const incomplete = structuredClone(fixture);
  incomplete.journal.results[fixture.sourceJob.id].status = "failed";
  assert.throws(() => assertProBatchJournal(incomplete), /does not support receipt/);
});
