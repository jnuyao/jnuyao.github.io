import { BOOKS } from "./book-data";
import { wordsForBook } from "./word-data";
import {
  emptyWordPractice,
  type SpellingResult,
  type WordPracticeProgress,
} from "./word-progress";

export type QuestStep = "listen" | "speak" | "read" | "write";

export type BookProgress = {
  lastPage: number;
  readPages: number[];
  steps: Record<QuestStep, boolean>;
  wordPractice: WordPracticeProgress;
  writingDraft?: string;
  completedAt?: string;
  lastOpened?: number;
};

export type ProgressStore = {
  version: 3;
  books: Record<string, BookProgress>;
};

export const PROGRESS_KEY = "story-garden-progress-v3";
export const LEGACY_PROGRESS_KEY = "story-garden-progress-v2";

export const emptySteps = (): Record<QuestStep, boolean> => ({
  listen: false,
  speak: false,
  read: false,
  write: false,
});

export const emptyBookProgress = (): BookProgress => ({
  lastPage: 0,
  readPages: [],
  steps: emptySteps(),
  wordPractice: emptyWordPractice(),
});

export function normaliseProgress(value: unknown): ProgressStore {
  const safe: ProgressStore = { version: 3, books: {} };
  if (!value || typeof value !== "object") return safe;

  const candidate = value as { version?: unknown; books?: unknown };
  if ((candidate.version !== 2 && candidate.version !== 3) || !candidate.books || typeof candidate.books !== "object") {
    return safe;
  }

  for (const book of BOOKS) {
    const raw = (candidate.books as Record<string, unknown>)[book.slug];
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const rawSteps = item.steps && typeof item.steps === "object"
      ? (item.steps as Record<string, unknown>)
      : {};
    const readPages = Array.isArray(item.readPages)
      ? [...new Set(item.readPages.filter((page): page is number =>
          Number.isInteger(page) && page >= 0 && page < book.pages.length,
        ))]
      : [];
    const lastPage = typeof item.lastPage === "number" && Number.isInteger(item.lastPage)
      ? Math.max(0, Math.min(item.lastPage, book.pages.length - 1))
      : 0;
    const rawWordPractice = candidate.version === 3 && item.wordPractice && typeof item.wordPractice === "object"
      ? (item.wordPractice as Record<string, unknown>)
      : {};
    const rawWordResults = rawWordPractice.words && typeof rawWordPractice.words === "object"
      ? (rawWordPractice.words as Record<string, unknown>)
      : {};
    const wordPractice: WordPracticeProgress = { words: {} };

    for (const word of wordsForBook(book.slug)) {
      const rawWord = rawWordResults[word.id];
      if (!rawWord || typeof rawWord !== "object") continue;
      const result = rawWord as Record<string, unknown>;
      const spelling: SpellingResult = result.spelling === "correct" || result.spelling === "supported"
        ? result.spelling
        : "new";
      wordPractice.words[word.id] = {
        readConfirmed: result.readConfirmed === true,
        spelling,
        attempts: typeof result.attempts === "number" && Number.isInteger(result.attempts)
          ? Math.max(0, Math.min(99, result.attempts))
          : 0,
        lastPractisedAt: typeof result.lastPractisedAt === "number" && Number.isFinite(result.lastPractisedAt)
          ? result.lastPractisedAt
          : undefined,
      };
    }
    if (typeof rawWordPractice.completedAt === "string") {
      wordPractice.completedAt = rawWordPractice.completedAt.slice(0, 40);
    }

    safe.books[book.slug] = {
      lastPage,
      readPages,
      steps: {
        listen: rawSteps.listen === true,
        speak: rawSteps.speak === true,
        read: rawSteps.read === true,
        write: rawSteps.write === true,
      },
      wordPractice,
      writingDraft: typeof item.writingDraft === "string" ? item.writingDraft.slice(0, 240) : undefined,
      completedAt: typeof item.completedAt === "string" ? item.completedAt.slice(0, 40) : undefined,
      lastOpened: typeof item.lastOpened === "number" && Number.isFinite(item.lastOpened)
        ? item.lastOpened
        : undefined,
    };
  }
  return safe;
}
