import {
  EVERYDAY_DISCOVERY_IDS,
  EVERYDAY_DISCOVERY_SCENE_IDS,
  type EverydayDiscoveryId,
  type EverydayDiscoverySceneId,
} from "./everyday-discovery-data";

export const EVERYDAY_DISCOVERY_PROGRESS_KEY =
  "story-garden-everyday-discovery-v1";

export type EverydayDiscoveryItemProgress = {
  heardWhole: boolean;
  heardCoach: boolean;
  saidIt: boolean;
  spelledIt: boolean;
  spellingAttempts: number;
  completedAt?: string;
  updatedAt?: number;
};

export type EverydayDiscoveryProgress = {
  version: 1;
  lastSceneId?: EverydayDiscoverySceneId;
  lastItemId?: EverydayDiscoveryId;
  exploredIds: EverydayDiscoveryId[];
  completedChallengeIds: EverydayDiscoverySceneId[];
  items: Partial<Record<EverydayDiscoveryId, EverydayDiscoveryItemProgress>>;
};

export function emptyEverydayDiscoveryProgress(): EverydayDiscoveryProgress {
  return {
    version: 1,
    exploredIds: [],
    completedChallengeIds: [],
    items: {},
  };
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

function safeAttempts(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(99, Math.floor(value)));
}

export function normaliseEverydayDiscoveryProgress(
  value: unknown,
): EverydayDiscoveryProgress {
  const safe = emptyEverydayDiscoveryProgress();
  if (!value || typeof value !== "object" || Array.isArray(value)) return safe;

  const raw = value as Record<string, unknown>;
  if (
    raw.version !== 1
    || !raw.items
    || typeof raw.items !== "object"
    || Array.isArray(raw.items)
  ) {
    return safe;
  }

  if (
    typeof raw.lastSceneId === "string"
    && EVERYDAY_DISCOVERY_SCENE_IDS.includes(
      raw.lastSceneId as EverydayDiscoverySceneId,
    )
  ) {
    safe.lastSceneId = raw.lastSceneId as EverydayDiscoverySceneId;
  }

  if (
    typeof raw.lastItemId === "string"
    && EVERYDAY_DISCOVERY_IDS.includes(raw.lastItemId as EverydayDiscoveryId)
  ) {
    safe.lastItemId = raw.lastItemId as EverydayDiscoveryId;
  }

  const rawExplored = Array.isArray(raw.exploredIds)
    ? new Set(raw.exploredIds.filter((id): id is string => typeof id === "string"))
    : new Set<string>();
  const rawChallenges = Array.isArray(raw.completedChallengeIds)
    ? new Set(raw.completedChallengeIds.filter((id): id is string => typeof id === "string"))
    : new Set<string>();
  const rawItems = raw.items as Record<string, unknown>;

  for (const sceneId of EVERYDAY_DISCOVERY_SCENE_IDS) {
    if (rawChallenges.has(sceneId)) safe.completedChallengeIds.push(sceneId);
  }

  for (const itemId of EVERYDAY_DISCOVERY_IDS) {
    const rawItem = rawItems[itemId];
    if (rawItem && typeof rawItem === "object" && !Array.isArray(rawItem)) {
      const item = rawItem as Record<string, unknown>;
      safe.items[itemId] = {
        heardWhole: item.heardWhole === true,
        heardCoach: item.heardCoach === true,
        saidIt: item.saidIt === true,
        spelledIt: item.spelledIt === true,
        spellingAttempts: safeAttempts(item.spellingAttempts),
        completedAt: safeDate(item.completedAt),
        updatedAt: safeTimestamp(item.updatedAt),
      };
    }

    if (rawExplored.has(itemId) || everydayDiscoveryIsComplete(safe.items[itemId])) {
      safe.exploredIds.push(itemId);
    }
  }

  return safe;
}

export function everydayDiscoveryIsComplete(
  value: EverydayDiscoveryItemProgress | undefined,
): boolean {
  return Boolean(
    value?.heardWhole
    && value.heardCoach
    && value.saidIt
    && value.spelledIt,
  );
}
