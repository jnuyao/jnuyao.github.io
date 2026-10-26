import {
  HACKERS_PAINTERS_UNIT_IDS,
  type HackersPaintersUnitId,
} from "./hackers-painters-data";

export const HACKERS_PAINTERS_PROGRESS_KEY =
  "story-garden-hackers-painters-chapter-2-v1";

export type HackersPaintersUnitProgress = {
  lastParagraphId?: string;
  heardParagraphIds: string[];
  savedWords: string[];
  comprehensionAnswers: Record<string, number>;
  speakingPractised: boolean;
  writingDraft: string;
  completed: boolean;
  completedAt?: string;
  updatedAt?: number;
};

export type HackersPaintersProgress = {
  version: 1;
  lastUnitId?: HackersPaintersUnitId;
  units: Partial<Record<HackersPaintersUnitId, HackersPaintersUnitProgress>>;
};

export function emptyHackersPaintersUnitProgress(): HackersPaintersUnitProgress {
  return {
    heardParagraphIds: [],
    savedWords: [],
    comprehensionAnswers: {},
    speakingPractised: false,
    writingDraft: "",
    completed: false,
  };
}

export function emptyHackersPaintersProgress(): HackersPaintersProgress {
  return { version: 1, units: {} };
}

function safeString(value: unknown, maximum: number): string {
  return typeof value === "string" ? value.slice(0, maximum) : "";
}

function safeTimestamp(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value)));
}

function safeStringList(value: unknown, maximumItems: number): string[] {
  if (!Array.isArray(value)) return [];
  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.slice(0, 120))
    .filter(Boolean);
  return [...new Set(items)].slice(0, maximumItems);
}

function safeAnswers(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const answers: Record<string, number> = {};
  for (const [key, answer] of Object.entries(value)) {
    if (
      key.length <= 80
      && typeof answer === "number"
      && Number.isInteger(answer)
      && answer >= 0
      && answer <= 20
    ) {
      answers[key] = answer;
    }
  }
  return answers;
}

export function normaliseHackersPaintersProgress(
  value: unknown,
): HackersPaintersProgress {
  const safe = emptyHackersPaintersProgress();
  if (!value || typeof value !== "object" || Array.isArray(value)) return safe;

  const raw = value as Record<string, unknown>;
  if (
    raw.version !== 1
    || !raw.units
    || typeof raw.units !== "object"
    || Array.isArray(raw.units)
  ) {
    return safe;
  }

  if (
    typeof raw.lastUnitId === "string"
    && HACKERS_PAINTERS_UNIT_IDS.includes(raw.lastUnitId as HackersPaintersUnitId)
  ) {
    safe.lastUnitId = raw.lastUnitId as HackersPaintersUnitId;
  }

  const rawUnits = raw.units as Record<string, unknown>;
  for (const unitId of HACKERS_PAINTERS_UNIT_IDS) {
    const rawUnit = rawUnits[unitId];
    if (!rawUnit || typeof rawUnit !== "object" || Array.isArray(rawUnit)) continue;
    const unit = rawUnit as Record<string, unknown>;
    const lastParagraphId = safeString(unit.lastParagraphId, 120);
    const completedAt = safeString(unit.completedAt, 40);
    safe.units[unitId] = {
      ...(lastParagraphId ? { lastParagraphId } : {}),
      heardParagraphIds: safeStringList(unit.heardParagraphIds, 100),
      savedWords: safeStringList(unit.savedWords, 100),
      comprehensionAnswers: safeAnswers(unit.comprehensionAnswers),
      speakingPractised: unit.speakingPractised === true,
      writingDraft: safeString(unit.writingDraft, 8_000),
      completed: unit.completed === true,
      ...(completedAt ? { completedAt } : {}),
      updatedAt: safeTimestamp(unit.updatedAt),
    };
  }

  return safe;
}

export function hackersPaintersCompletedCount(
  progress: HackersPaintersProgress,
): number {
  return HACKERS_PAINTERS_UNIT_IDS.filter(
    (unitId) => progress.units[unitId]?.completed,
  ).length;
}
