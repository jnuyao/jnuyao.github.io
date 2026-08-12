import {
  DINOSAUR_ART_LESSON_IDS,
  type DinosaurArtLessonId,
  type DinosaurArtStep,
} from "./dinosaur-art-data";

export const DINOSAUR_ART_PROGRESS_KEY = "story-garden-dinosaur-art-v1";

export type DinosaurLessonProgress = {
  lastStep: DinosaurArtStep;
  completedAt?: string;
  updatedAt?: number;
};

export type DinosaurArtProgress = {
  version: 1;
  lastLessonId?: DinosaurArtLessonId;
  lessons: Partial<Record<DinosaurArtLessonId, DinosaurLessonProgress>>;
};

export function emptyDinosaurArtProgress(): DinosaurArtProgress {
  return { version: 1, lessons: {} };
}

export function normaliseDinosaurArtProgress(value: unknown): DinosaurArtProgress {
  const safe = emptyDinosaurArtProgress();
  if (!value || typeof value !== "object") return safe;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || !raw.lessons || typeof raw.lessons !== "object") return safe;

  if (typeof raw.lastLessonId === "string"
    && DINOSAUR_ART_LESSON_IDS.includes(raw.lastLessonId as DinosaurArtLessonId)) {
    safe.lastLessonId = raw.lastLessonId as DinosaurArtLessonId;
  }

  const rawLessons = raw.lessons as Record<string, unknown>;
  for (const lessonId of DINOSAUR_ART_LESSON_IDS) {
    const rawLesson = rawLessons[lessonId];
    if (!rawLesson || typeof rawLesson !== "object") continue;
    const item = rawLesson as Record<string, unknown>;
    const numericStep = typeof item.lastStep === "number" && Number.isFinite(item.lastStep)
      ? Math.floor(item.lastStep)
      : 0;
    safe.lessons[lessonId] = {
      lastStep: Math.max(0, Math.min(3, numericStep)) as DinosaurArtStep,
      completedAt: typeof item.completedAt === "string" ? item.completedAt.slice(0, 40) : undefined,
      updatedAt: typeof item.updatedAt === "number" && Number.isFinite(item.updatedAt)
        ? item.updatedAt
        : undefined,
    };
  }

  return safe;
}
