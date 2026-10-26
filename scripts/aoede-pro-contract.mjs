const HASH_PATTERN = /^[a-f0-9]{64}$/;

export const PRO_SOURCE_GENERATOR_VERSION = "pro-aoede-production-v1";
export const PRO_BATCH_TOOL_VERSION = "pro-aoede-production-batch-v1";
export const PRO_SOURCE_MODEL = "gemini-2.5-pro-preview-tts";
export const PRO_SOURCE_VOICE = "Aoede";
export const PRO_EXPECTED_TOTAL = 134;
export const PRO_PACING_SCHEMA_VERSION = 2;
export const PRO_PACING_TRANSFORM_VERSION = "aoede-pacing-pro-v3";
export const PRO_PACING_POLICY_VERSION = "p1-pro-canary-90wpm-v1";
export const PRO_PACING_POLICY = Object.freeze({
  version: PRO_PACING_POLICY_VERSION,
  activeWpmCap: 150,
  tempoFloor: 0.72,
  targets: Object.freeze({
    storyContentWpm: 90,
    listenReadContentWpm: 90,
    speakWriteContentWpm: 85,
  }),
  shortClip: Object.freeze({
    wordCountBelow: 8,
    baseContentSeconds: 0.6,
    contentSecondsPerWord: 0.65,
  }),
  floorLimitedPausePadding: Object.freeze({
    contentWpmCeiling: 110,
    detectionNoise: "-40dB",
    detectionMinimumSeconds: 0.05,
    maxCandidates: 3,
    maxFinalPauseSeconds: 0.65,
    maxAddedSeconds: 1.2,
  }),
});
export const PRO_ALLOWED_BATCH_MAPPINGS = Object.freeze([
  "metadata",
  "official-request-order-fallback",
]);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function proPacingPolicyMatches(policy) {
  return stableJson(policy) === stableJson(PRO_PACING_POLICY);
}

function proContentTarget(job) {
  if (job?.kind === "story") return PRO_PACING_POLICY.targets.storyContentWpm;
  if (job?.kind !== "task") throw new Error("Pacing job kind must be story or task.");
  if (job?.taskType === "listen" || job?.taskType === "read") {
    return PRO_PACING_POLICY.targets.listenReadContentWpm;
  }
  if (job?.taskType === "speak" || job?.taskType === "write") {
    return PRO_PACING_POLICY.targets.speakWriteContentWpm;
  }
  throw new Error("Pacing task type must be listen, speak, read, or write.");
}

export function proPacingSettingsForJob(job) {
  if (!Number.isInteger(job?.wordCount) || job.wordCount < 1) {
    throw new Error("Pacing job wordCount must be a positive integer.");
  }
  const isShort = job.wordCount < PRO_PACING_POLICY.shortClip.wordCountBelow;
  const minimumContentSeconds = isShort
    ? Number((
        PRO_PACING_POLICY.shortClip.baseContentSeconds +
        PRO_PACING_POLICY.shortClip.contentSecondsPerWord * job.wordCount
      ).toFixed(6))
    : null;
  return {
    policyVersion: PRO_PACING_POLICY_VERSION,
    activeWpmCap: PRO_PACING_POLICY.activeWpmCap,
    contentWpmTarget: isShort ? null : proContentTarget(job),
    minimumContentSeconds,
    tempoFloor: PRO_PACING_POLICY.tempoFloor,
  };
}

export function proPacingSettingsMatch(pacing, job) {
  let expected;
  try {
    expected = proPacingSettingsForJob(job);
  } catch {
    return false;
  }
  return (
    pacing?.policyVersion === expected.policyVersion &&
    pacing?.activeWpmCap === expected.activeWpmCap &&
    pacing?.contentWpmTarget === expected.contentWpmTarget &&
    pacing?.minimumContentSeconds === expected.minimumContentSeconds &&
    pacing?.tempoFloor === expected.tempoFloor &&
    Number.isFinite(pacing?.tempo) &&
    pacing.tempo >= expected.tempoFloor &&
    pacing.tempo <= 1 &&
    pacing?.floorHit === (pacing.tempo <= expected.tempoFloor + 0.000001)
  );
}

export function proPausePaddingRecordMatches(record) {
  const policy = PRO_PACING_POLICY.floorLimitedPausePadding;
  const padding = record?.silenceTrim?.pausePadding;
  const additions = padding?.additions;
  if (
    typeof padding?.applied !== "boolean" ||
    !Number.isFinite(padding?.addedSeconds) ||
    padding.addedSeconds < 0 ||
    padding.addedSeconds > policy.maxAddedSeconds + 0.002 ||
    !Number.isInteger(padding?.candidateCount) ||
    padding.candidateCount < 0 ||
    padding.contentWpmCeiling !== policy.contentWpmCeiling ||
    padding.detectionMinimumSeconds !== policy.detectionMinimumSeconds ||
    padding.detectionNoise !== policy.detectionNoise ||
    !Number.isFinite(padding?.projectedContentWpm) ||
    !Number.isFinite(padding?.requestedSeconds) ||
    padding.requestedSeconds < 0 ||
    !Array.isArray(additions) ||
    additions.length > policy.maxCandidates ||
    padding.applied !== (additions.length > 0) ||
    padding.candidateCount < additions.length ||
    (padding.applied && record?.pacing?.floorHit !== true) ||
    (!padding.applied && padding.addedSeconds !== 0)
  ) {
    return false;
  }
  let addedSeconds = 0;
  for (const addition of additions) {
    if (
      !Number.isFinite(addition?.at) ||
      addition.at <= 0 ||
      addition.at >= record?.afterTempo?.durationSeconds ||
      !Number.isFinite(addition?.originalSilenceSeconds) ||
      addition.originalSilenceSeconds < policy.detectionMinimumSeconds - 0.002 ||
      !Number.isFinite(addition?.seconds) ||
      addition.seconds <= 0 ||
      addition.originalSilenceSeconds + addition.seconds > policy.maxFinalPauseSeconds + 0.002
    ) {
      return false;
    }
    addedSeconds += addition.seconds;
  }
  if (Math.abs(addedSeconds - padding.addedSeconds) > 0.002) return false;
  if (
    record?.pacing?.floorHit === true &&
    (!Number.isFinite(record?.final?.contentWpm) ||
      record.final.contentWpm > policy.contentWpmCeiling + 0.5)
  ) {
    return false;
  }
  return true;
}

export function assertCompleteProSourceManifest(manifest) {
  if (
    manifest?.schemaVersion !== 1 ||
    manifest?.generatorVersion !== PRO_SOURCE_GENERATOR_VERSION ||
    manifest?.isolatedProduction !== true ||
    manifest?.model !== PRO_SOURCE_MODEL ||
    manifest?.voice !== PRO_SOURCE_VOICE ||
    manifest?.plan?.generatorVersion !== PRO_SOURCE_GENERATOR_VERSION ||
    manifest?.plan?.model !== PRO_SOURCE_MODEL ||
    manifest?.plan?.voice !== PRO_SOURCE_VOICE ||
    manifest?.plan?.counts?.total !== PRO_EXPECTED_TOTAL ||
    !HASH_PATTERN.test(manifest?.plan?.planSha256 || "") ||
    !HASH_PATTERN.test(manifest?.source?.manifestSha256 || "") ||
    !HASH_PATTERN.test(manifest?.source?.planSha256 || "") ||
    !Array.isArray(manifest?.jobs) ||
    manifest.jobs.length !== PRO_EXPECTED_TOTAL ||
    !Array.isArray(manifest?.clips) ||
    manifest.clips.length !== PRO_EXPECTED_TOTAL ||
    manifest.jobs.some((job) => job?.status !== "complete") ||
    manifest.clips.some((clip) => clip?.status !== "complete")
  ) {
    throw new Error(
      `Source must be the isolated, receipt-backed, 134/134 complete ${PRO_SOURCE_MODEL} + ${PRO_SOURCE_VOICE} production plan.`,
    );
  }
  return manifest.plan.planSha256;
}

export function pacedManifestMatchesProSource(manifest, {
  sourceRoot,
  sourceManifestPath,
  sourcePlanSha256,
} = {}) {
  return (
    manifest?.schemaVersion === PRO_PACING_SCHEMA_VERSION &&
    manifest?.transformVersion === PRO_PACING_TRANSFORM_VERSION &&
    proPacingPolicyMatches(manifest?.pacingPolicy) &&
    manifest?.sourceRoot === sourceRoot &&
    manifest?.sourceIdentity?.generatorVersion === PRO_SOURCE_GENERATOR_VERSION &&
    manifest?.sourceIdentity?.manifestPath === sourceManifestPath &&
    manifest?.sourceIdentity?.model === PRO_SOURCE_MODEL &&
    manifest?.sourceIdentity?.planSha256 === sourcePlanSha256 &&
    manifest?.sourceIdentity?.root === sourceRoot &&
    manifest?.sourceIdentity?.voice === PRO_SOURCE_VOICE
  );
}

export function pacedClipSourceMatches(source, {
  audioSha256,
  sourceRecordSha256,
  generatorReceiptSha256,
  generatorJournalSha256,
  sourceManifestSha256,
  sourceManifestPath,
  sourcePlanSha256,
} = {}) {
  return (
    HASH_PATTERN.test(audioSha256 || "") &&
    HASH_PATTERN.test(sourceRecordSha256 || "") &&
    HASH_PATTERN.test(generatorReceiptSha256 || "") &&
    HASH_PATTERN.test(generatorJournalSha256 || "") &&
    HASH_PATTERN.test(sourceManifestSha256 || "") &&
    HASH_PATTERN.test(sourcePlanSha256 || "") &&
    typeof sourceManifestPath === "string" &&
    source?.hash === audioSha256 &&
    source?.recordHash === sourceRecordSha256 &&
    source?.generatorReceiptHash === generatorReceiptSha256 &&
    source?.generatorJournalHash === generatorJournalSha256 &&
    source?.manifestHash === sourceManifestSha256 &&
    source?.manifestPath === sourceManifestPath &&
    source?.planSha256 === sourcePlanSha256 &&
    source?.model === PRO_SOURCE_MODEL &&
    source?.voice === PRO_SOURCE_VOICE
  );
}

export function assertProBatchJournal({ journal, receipt, sourceJob, sourceManifest }) {
  const requestIndex = receipt?.batch?.requestIndex;
  const planned = Number.isInteger(requestIndex) ? journal?.jobs?.[requestIndex] : null;
  const result = journal?.results?.[sourceJob?.id];
  if (
    journal?.schemaVersion !== 1 ||
    journal?.toolVersion !== PRO_BATCH_TOOL_VERSION ||
    !["applied", "applied_with_errors"].includes(journal?.phase) ||
    journal?.requestPlanSha256 !== receipt?.batch?.requestPlanSha256 ||
    journal?.manifestPlanSha256 !== sourceManifest?.plan?.planSha256 ||
    journal?.sourceManifestSha256 !== sourceManifest?.source?.manifestSha256 ||
    journal?.sourcePlanSha256 !== sourceManifest?.source?.planSha256 ||
    journal?.model !== PRO_SOURCE_MODEL ||
    journal?.voice !== PRO_SOURCE_VOICE ||
    journal?.batchName !== receipt?.batch?.name ||
    planned?.id !== sourceJob?.id ||
    planned?.requestIndex !== requestIndex ||
    planned?.outputPath !== sourceJob?.outputPath ||
    planned?.promptSha256 !== sourceJob?.promptSha256 ||
    planned?.requestSha256 !== sourceJob?.requestSha256 ||
    result?.status !== "complete" ||
    result?.mapping !== receipt?.batch?.mapping ||
    result?.bytes !== sourceJob?.bytes ||
    result?.audioSha256 !== sourceJob?.audioSha256
  ) {
    throw new Error(`Pro Batch journal does not support receipt ${sourceJob?.id || "for an unknown job"}.`);
  }
  return true;
}

export function assertProGeneratorReceipt({
  receipt,
  sourceJob,
  sourceClip,
  sourceManifest,
  receiptSha256,
}) {
  const media = receipt?.media;
  if (
    receipt?.schemaVersion !== 1 ||
    receipt?.source !== "gemini-batch-api" ||
    receipt?.model !== PRO_SOURCE_MODEL ||
    receipt?.voice !== PRO_SOURCE_VOICE ||
    receipt?.proPlanSha256 !== sourceManifest?.plan?.planSha256 ||
    receipt?.sourceManifestSha256 !== sourceManifest?.source?.manifestSha256 ||
    receipt?.sourcePlanSha256 !== sourceManifest?.source?.planSha256 ||
    receipt?.completedAt !== sourceJob?.completedAt ||
    receipt?.job?.id !== sourceJob?.id ||
    receipt?.job?.outputPath !== sourceJob?.outputPath ||
    receipt?.job?.displayTextSha256 !== sourceJob?.displayTextSha256 ||
    receipt?.job?.spokenTextSha256 !== sourceJob?.spokenTextSha256 ||
    receipt?.job?.ttsTextSha256 !== sourceJob?.ttsTextSha256 ||
    receipt?.job?.promptSha256 !== sourceJob?.promptSha256 ||
    receipt?.job?.requestSha256 !== sourceJob?.requestSha256 ||
    typeof receipt?.batch?.name !== "string" ||
    !/^batches\/[A-Za-z0-9_-]+$/.test(receipt.batch.name) ||
    receipt.batch.name !== sourceJob?.batchName ||
    !HASH_PATTERN.test(receipt?.batch?.requestPlanSha256 || "") ||
    !Number.isInteger(receipt?.batch?.requestIndex) ||
    receipt.batch.requestIndex !== sourceJob?.requestIndex ||
    !PRO_ALLOWED_BATCH_MAPPINGS.includes(receipt?.batch?.mapping) ||
    receipt.batch.mapping !== sourceJob?.mapping ||
    receipt?.modelResponse?.modelVersion !== PRO_SOURCE_MODEL ||
    receipt.modelResponse.modelVersion !== sourceJob?.modelVersion ||
    typeof receipt?.modelResponse?.responseId !== "string" ||
    !receipt.modelResponse.responseId ||
    receipt.modelResponse.responseId !== sourceJob?.responseId ||
    receipt?.modelResponse?.finishReason !== "STOP" ||
    sourceJob?.finishReason !== "STOP" ||
    typeof receipt?.modelResponse?.responseMimeType !== "string" ||
    !/^audio\//i.test(receipt.modelResponse.responseMimeType) ||
    !/(?:pcm|l16)/i.test(receipt.modelResponse.responseMimeType) ||
    !Number.isInteger(receipt?.modelResponse?.rawPcmBytes) ||
    receipt.modelResponse.rawPcmBytes < 1_024 ||
    receipt.modelResponse.rawPcmBytes % 2 !== 0 ||
    !Number.isInteger(media?.bytes) ||
    media.bytes !== sourceClip?.bytes ||
    media.bytes !== sourceJob?.bytes ||
    media?.sha256 !== sourceClip?.fileHash ||
    media?.audioSha256 !== sourceClip?.fileHash ||
    sourceJob?.audioSha256 !== sourceClip?.fileHash ||
    media?.codec !== "mp3" ||
    media?.sampleRate !== 24_000 ||
    media?.channels !== 1 ||
    !Number.isFinite(media?.durationSeconds) ||
    Math.abs(media.durationSeconds - sourceJob?.durationSeconds) > 0.002 ||
    media?.fullDecodePassed !== true ||
    sourceJob?.fullDecodePassed !== true ||
    sourceClip?.fullDecodePassed !== true ||
    stableJson(receipt?.audio) !== stableJson(media) ||
    !HASH_PATTERN.test(receiptSha256 || "") ||
    sourceJob?.receiptSha256 !== receiptSha256
  ) {
    throw new Error(`Pro generator receipt does not strictly match ${sourceJob?.id || "an unknown job"}.`);
  }
  return true;
}
