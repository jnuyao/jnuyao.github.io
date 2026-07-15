export type SpellingResult = "new" | "correct" | "supported";

export type WordResult = {
  readConfirmed: boolean;
  spelling: SpellingResult;
  attempts: number;
  lastPractisedAt?: number;
};

export type WordPracticeProgress = {
  words: Record<string, WordResult>;
  completedAt?: string;
};

export function emptyWordPractice(): WordPracticeProgress {
  return { words: {} };
}

export function wordIsMastered(result: WordResult | undefined): boolean {
  return Boolean(result?.readConfirmed && result.spelling === "correct");
}
