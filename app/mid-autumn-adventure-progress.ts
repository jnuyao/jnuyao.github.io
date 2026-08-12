import {
  MID_AUTUMN_LANTERN_IDS,
  MID_AUTUMN_MISSION_IDS,
  type MidAutumnAdventureStep,
  type MidAutumnLanternId,
  type MidAutumnMissionId,
} from "./mid-autumn-adventure-data";

export const MID_AUTUMN_ADVENTURE_PROGRESS_KEY =
  "story-garden-mid-autumn-adventure-v1";

export type MidAutumnMissionProgress = {
  lastStep: MidAutumnAdventureStep;
  completedAt?: string;
  updatedAt?: number;
};

export type MidAutumnAdventureProgress = {
  version: 1;
  lastMissionId?: MidAutumnMissionId;
  selectedLanternId?: MidAutumnLanternId;
  missions: Partial<Record<MidAutumnMissionId, MidAutumnMissionProgress>>;
};

export function emptyMidAutumnAdventureProgress(): MidAutumnAdventureProgress {
  return { version: 1, missions: {} };
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

export function normaliseMidAutumnAdventureProgress(
  value: unknown,
): MidAutumnAdventureProgress {
  const safe = emptyMidAutumnAdventureProgress();
  if (!value || typeof value !== "object") return safe;

  const raw = value as Record<string, unknown>;
  if (
    raw.version !== 1
    || !raw.missions
    || typeof raw.missions !== "object"
    || Array.isArray(raw.missions)
  ) {
    return safe;
  }

  if (
    typeof raw.lastMissionId === "string"
    && MID_AUTUMN_MISSION_IDS.includes(raw.lastMissionId as MidAutumnMissionId)
  ) {
    safe.lastMissionId = raw.lastMissionId as MidAutumnMissionId;
  }

  if (
    typeof raw.selectedLanternId === "string"
    && MID_AUTUMN_LANTERN_IDS.includes(raw.selectedLanternId as MidAutumnLanternId)
  ) {
    safe.selectedLanternId = raw.selectedLanternId as MidAutumnLanternId;
  }

  const rawMissions = raw.missions as Record<string, unknown>;
  for (const missionId of MID_AUTUMN_MISSION_IDS) {
    const rawMission = rawMissions[missionId];
    if (
      !rawMission
      || typeof rawMission !== "object"
      || Array.isArray(rawMission)
    ) {
      continue;
    }

    const item = rawMission as Record<string, unknown>;
    const numericStep =
      typeof item.lastStep === "number" && Number.isFinite(item.lastStep)
        ? Math.floor(item.lastStep)
        : 0;

    safe.missions[missionId] = {
      lastStep: Math.max(0, Math.min(3, numericStep)) as MidAutumnAdventureStep,
      completedAt: safeDate(item.completedAt),
      updatedAt: safeTimestamp(item.updatedAt),
    };
  }

  return safe;
}
