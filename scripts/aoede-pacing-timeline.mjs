import { PRO_PACING_POLICY } from "./aoede-pro-contract.mjs";

const DEFAULT_INTERNAL_HARD_SECONDS = 1.5;

export function buildPausePaddingPlan({
  job,
  pacing,
  metrics,
  microIntervals,
  removals,
  internalHardSeconds = DEFAULT_INTERNAL_HARD_SECONDS,
}) {
  const policy = PRO_PACING_POLICY.floorLimitedPausePadding;
  const internalRemovedSeconds = removals
    .filter((range) => range.reason === "internal")
    .reduce((sum, range) => sum + range.end - range.start, 0);
  const contentSecondsAfterTrim = metrics.contentSeconds - internalRemovedSeconds;
  const projectedContentWpm = (job.wordCount / contentSecondsAfterTrim) * 60;
  const desiredContentSeconds = (job.wordCount / policy.contentWpmCeiling) * 60;
  const requestedSeconds = Math.max(0, desiredContentSeconds - contentSecondsAfterTrim);
  const base = {
    applied: false,
    addedSeconds: 0,
    additions: [],
    candidateCount: 0,
    contentWpmCeiling: policy.contentWpmCeiling,
    detectionMinimumSeconds: policy.detectionMinimumSeconds,
    detectionNoise: policy.detectionNoise,
    projectedContentWpm: Number(projectedContentWpm.toFixed(1)),
    requestedSeconds: Number(requestedSeconds.toFixed(3)),
  };
  if (
    !pacing.floorHit ||
    projectedContentWpm <= policy.contentWpmCeiling ||
    requestedSeconds <= 0.001
  ) {
    return base;
  }

  const leading = microIntervals.find((interval) => interval.start <= 0.03) || null;
  const trailing = [...microIntervals]
    .reverse()
    .find((interval) => interval.end >= metrics.durationSeconds - 0.03) || null;
  const candidates = microIntervals
    .filter((interval) => interval !== leading && interval !== trailing)
    .filter((interval) => interval.duration < internalHardSeconds)
    .map((interval) => ({
      at: (interval.start + interval.end) / 2,
      capacity: Math.max(0, policy.maxFinalPauseSeconds - interval.duration),
      originalSilenceSeconds: interval.duration,
    }))
    .filter((candidate) => candidate.capacity > 0.01)
    .filter(
      (candidate) =>
        !removals.some(
          (range) => candidate.at >= range.start - 0.001 && candidate.at <= range.end + 0.001,
        ),
    )
    .sort((left, right) => right.originalSilenceSeconds - left.originalSilenceSeconds)
    .slice(0, policy.maxCandidates)
    .sort((left, right) => left.at - right.at);
  base.candidateCount = candidates.length;
  if (!candidates.length) return base;

  let remaining = Math.min(requestedSeconds, policy.maxAddedSeconds);
  const planned = candidates.map((candidate) => ({ ...candidate, seconds: 0 }));
  while (remaining > 0.0005) {
    const available = planned.filter(
      (candidate) => candidate.capacity - candidate.seconds > 0.0005,
    );
    if (!available.length) break;
    const share = remaining / available.length;
    let consumed = 0;
    for (const candidate of available) {
      const seconds = Math.min(share, candidate.capacity - candidate.seconds);
      candidate.seconds += seconds;
      consumed += seconds;
    }
    if (consumed <= 0.0005) break;
    remaining -= consumed;
  }
  const additions = planned
    .filter((candidate) => candidate.seconds > 0.005)
    .map((candidate) => ({
      at: Number(candidate.at.toFixed(6)),
      originalSilenceSeconds: Number(candidate.originalSilenceSeconds.toFixed(3)),
      seconds: Number(candidate.seconds.toFixed(6)),
    }));
  const addedSeconds = additions.reduce((sum, addition) => sum + addition.seconds, 0);
  return {
    ...base,
    applied: additions.length > 0,
    addedSeconds: Number(addedSeconds.toFixed(3)),
    additions,
  };
}

export function buildTimelineEditFilter(durationSeconds, removals, additions) {
  if (!removals.length && !additions.length) {
    return { filter: "[0:a]anull[out]", addedSeconds: 0, removedSeconds: 0 };
  }
  const sorted = [...removals].sort((left, right) => left.start - right.start);
  const kept = [];
  let cursor = 0;
  for (const removal of sorted) {
    if (removal.start > cursor + 0.001) kept.push({ start: cursor, end: removal.start });
    cursor = Math.max(cursor, removal.end);
  }
  if (durationSeconds > cursor + 0.001) kept.push({ start: cursor, end: durationSeconds });
  if (!kept.length) throw new Error("Silence trimming would remove the entire clip.");

  const plannedAdditions = [...additions].sort((left, right) => left.at - right.at);
  const filters = [];
  const labels = [];
  let pieceIndex = 0;
  let usedAdditions = 0;
  const addAudioPiece = (start, end) => {
    if (end <= start + 0.0005) return;
    const label = `p${pieceIndex++}`;
    filters.push(
      `[0:a]atrim=start=${start.toFixed(6)}:end=${end.toFixed(6)},asetpts=PTS-STARTPTS[${label}]`,
    );
    labels.push(`[${label}]`);
  };
  const addSilencePiece = (seconds) => {
    const label = `p${pieceIndex++}`;
    filters.push(
      `anullsrc=r=24000:cl=mono:d=${seconds.toFixed(6)},aformat=sample_fmts=s16:sample_rates=24000:channel_layouts=mono[${label}]`,
    );
    labels.push(`[${label}]`);
  };
  for (const range of kept) {
    let rangeCursor = range.start;
    for (const addition of plannedAdditions) {
      if (addition.at <= range.start + 0.0005 || addition.at >= range.end - 0.0005) continue;
      addAudioPiece(rangeCursor, addition.at);
      addSilencePiece(addition.seconds);
      rangeCursor = addition.at;
      usedAdditions += 1;
    }
    addAudioPiece(rangeCursor, range.end);
  }
  if (usedAdditions !== plannedAdditions.length) {
    throw new Error("Pause padding point is outside the retained audio timeline.");
  }
  return {
    filter: `${filters.join(";")};${labels.join("")}concat=n=${labels.length}:v=0:a=1[out]`,
    addedSeconds: additions.reduce((sum, addition) => sum + addition.seconds, 0),
    removedSeconds: removals.reduce((sum, range) => sum + range.end - range.start, 0),
  };
}
