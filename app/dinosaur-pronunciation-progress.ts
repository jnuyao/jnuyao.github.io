import {
  DINOSAUR_PRONUNCIATION_IDS,
  type DinosaurPronunciationId,
} from "./dinosaur-pronunciation-data";

export const DINOSAUR_PRONUNCIATION_PROGRESS_KEY =
  "story-garden-dinosaur-pronunciation-v1";

export type DinosaurPronunciationItemProgress = {
  heardWhole: boolean;
  heardCoach: boolean;
  saidIt: boolean;
  repeatCount: number;
  completedAt?: string;
  updatedAt?: number;
};

export type DinosaurPronunciationProgress = {
  version: 1;
  lastDinosaurId?: DinosaurPronunciationId;
  exploredIds: DinosaurPronunciationId[];
  dinosaurs: Partial<
    Record<DinosaurPronunciationId, DinosaurPronunciationItemProgress>
  >;
};

export function emptyDinosaurPronunciationProgress(): DinosaurPronunciationProgress {
  return { version: 1, exploredIds: [], dinosaurs: {} };
}

function safeDate(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0
    ? value.slice(0, 40)
    : undefined;
}

function safeTimestamp(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value)));
}

function safeRepeatCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(99, Math.floor(value)));
}

export function normaliseDinosaurPronunciationProgress(
  value: unknown,
): DinosaurPronunciationProgress {
  const safe = emptyDinosaurPronunciationProgress();
  if (!value || typeof value !== "object" || Array.isArray(value)) return safe;

  const raw = value as Record<string, unknown>;
  if (
    raw.version !== 1
    || !raw.dinosaurs
    || typeof raw.dinosaurs !== "object"
    || Array.isArray(raw.dinosaurs)
  ) {
    return safe;
  }

  if (
    typeof raw.lastDinosaurId === "string"
    && DINOSAUR_PRONUNCIATION_IDS.includes(
      raw.lastDinosaurId as DinosaurPronunciationId,
    )
  ) {
    safe.lastDinosaurId = raw.lastDinosaurId as DinosaurPronunciationId;
  }

  const rawExplored = Array.isArray(raw.exploredIds)
    ? new Set(raw.exploredIds.filter((id): id is string => typeof id === "string"))
    : new Set<string>();
  const rawDinosaurs = raw.dinosaurs as Record<string, unknown>;

  for (const dinosaurId of DINOSAUR_PRONUNCIATION_IDS) {
    const rawItem = rawDinosaurs[dinosaurId];
    if (rawItem && typeof rawItem === "object" && !Array.isArray(rawItem)) {
      const item = rawItem as Record<string, unknown>;
      safe.dinosaurs[dinosaurId] = {
        heardWhole: item.heardWhole === true,
        heardCoach: item.heardCoach === true,
        saidIt: item.saidIt === true,
        repeatCount: safeRepeatCount(item.repeatCount),
        completedAt: safeDate(item.completedAt),
        updatedAt: safeTimestamp(item.updatedAt),
      };
    }

    if (rawExplored.has(dinosaurId) || safe.dinosaurs[dinosaurId]) {
      safe.exploredIds.push(dinosaurId);
    }
  }

  return safe;
}

export function dinosaurPronunciationIsComplete(
  value: DinosaurPronunciationItemProgress | undefined,
): boolean {
  return Boolean(
    value?.heardWhole
    && value.heardCoach
    && value.saidIt
    && value.repeatCount > 0,
  );
}
