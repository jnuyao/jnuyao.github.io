"use client";

/* eslint-disable @next/next/no-img-element -- story scans are pre-sized WebP files and must render without a transforming proxy */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { BOOKS, type Book } from "./book-data";
import { wordsForBook } from "./word-data";
import { WordGarden } from "./word-garden";
import {
  LEGACY_PROGRESS_KEY,
  PROGRESS_KEY,
  emptyBookProgress,
  normaliseProgress,
  type BookProgress,
  type ProgressStore,
  type QuestStep,
} from "./progress";
import { wordIsMastered, type SpellingResult } from "./word-progress";
import {
  DEFAULT_NARRATION_RATE,
  NARRATION_PACES,
  buildStoryNarrationSegments,
  normaliseNarrationPace,
  preparedAudioSource,
  rankEnglishVoices,
  voiceQualityScore,
  type NarrationPace,
  type NarrationPurpose,
} from "./narration";

type View =
  | { kind: "shelf" }
  | { kind: "reader"; bookSlug: string; page: number }
  | { kind: "word-garden"; bookSlug: string }
  | { kind: "quest"; bookSlug: string; step: QuestStep }
  | { kind: "celebration"; bookSlug: string };

const NARRATION_SETTINGS_KEY = "story-garden-narration-v1";
const STEP_ORDER: QuestStep[] = ["listen", "speak", "read", "write"];
const STEP_META: Record<
  QuestStep,
  { icon: string; label: string; garden: string; title: string; instruction: string }
> = {
  listen: {
    icon: "👂",
    label: "Listen",
    garden: "Water",
    title: "Listen closely",
    instruction: "Tap the sound, then choose what you heard.",
  },
  speak: {
    icon: "🎙️",
    label: "Speak",
    garden: "Sunshine",
    title: "Your turn to speak",
    instruction: "Hear the line, say it, then play your voice.",
  },
  read: {
    icon: "📖",
    label: "Read",
    garden: "Leaf",
    title: "Read like a detective",
    instruction: "Read the clue and find the best answer.",
  },
  write: {
    icon: "✏️",
    label: "Write",
    garden: "Flower",
    title: "Make the sentence",
    instruction: "Copy the sentence with a capital letter and full stop.",
  },
};

function hasMasteredWords(book: Book, progress: BookProgress): boolean {
  return wordsForBook(book.slug).every((word) => wordIsMastered(progress.wordPractice.words[word.id]));
}

function bookIsComplete(book: Book, progress: BookProgress): boolean {
  return STEP_ORDER.every((step) => progress.steps[step]) && hasMasteredWords(book, progress);
}

function parseViewFromUrl(): View {
  if (typeof window === "undefined") return { kind: "shelf" };
  const params = new URLSearchParams(window.location.search);
  const bookSlug = params.get("book") ?? "";
  const book = BOOKS.find((item) => item.slug === bookSlug);
  if (!book) return { kind: "shelf" };

  const stage = params.get("stage");
  if (stage === "words") return { kind: "word-garden", bookSlug };
  if (stage === "quest") {
    const step = params.get("step") as QuestStep | null;
    return {
      kind: "quest",
      bookSlug,
      step: step && STEP_ORDER.includes(step) ? step : "listen",
    };
  }
  if (stage === "celebration") return { kind: "celebration", bookSlug };

  const pageNumber = Number(params.get("page") ?? "1");
  const page = Number.isFinite(pageNumber)
    ? Math.max(0, Math.min(Math.floor(pageNumber) - 1, book.pages.length - 1))
    : 0;
  return { kind: "reader", bookSlug, page };
}

function urlForView(view: View): string {
  const params = new URLSearchParams();
  if (view.kind !== "shelf") params.set("book", view.bookSlug);
  if (view.kind === "reader") params.set("page", String(view.page + 1));
  if (view.kind === "word-garden") params.set("stage", "words");
  if (view.kind === "quest") {
    params.set("stage", "quest");
    params.set("step", view.step);
  }
  if (view.kind === "celebration") params.set("stage", "celebration");
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

type SpeakOptions = {
  purpose?: NarrationPurpose;
  activeKey?: string;
  audioSrc?: string;
};

function readNarrationSettings(): { pace: NarrationPace } {
  try {
    const stored = JSON.parse(window.localStorage.getItem(NARRATION_SETTINGS_KEY) ?? "null");
    return { pace: normaliseNarrationPace(stored?.pace) };
  } catch {
    return { pace: "child" };
  }
}

function useNarrator() {
  const [speaking, setSpeaking] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [supported, setSupported] = useState(
    () => typeof window === "undefined" || "Audio" in window || "speechSynthesis" in window,
  );
  const [pace, setPace] = useState<NarrationPace>("child");
  const [settingsReady, setSettingsReady] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const narrationRunRef = useRef(0);
  const segmentTimerRef = useRef<number | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const settingsTimer = window.setTimeout(() => {
      const saved = readNarrationSettings();
      setPace(saved.pace);
      setSettingsReady(true);
    }, 0);
    return () => window.clearTimeout(settingsTimer);
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      return;
    }
    const refreshVoices = () => {
      const ranked = rankEnglishVoices(Array.from(window.speechSynthesis.getVoices()))
        .filter((voice) => voiceQualityScore(voice) > 0);
      voicesRef.current = ranked;
    };
    const initialVoiceTimer = window.setTimeout(refreshVoices, 0);
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    return () => {
      window.clearTimeout(initialVoiceTimer);
      window.speechSynthesis.cancel();
      window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
    };
  }, []);

  useEffect(() => {
    if (!settingsReady) return;
    try {
      window.localStorage.setItem(NARRATION_SETTINGS_KEY, JSON.stringify({ pace }));
    } catch {
      // Narration still works when private browsing blocks local preferences.
    }
  }, [pace, settingsReady]);

  const stop = useCallback(() => {
    narrationRunRef.current += 1;
    if (segmentTimerRef.current !== null) {
      window.clearTimeout(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }
    currentAudioRef.current?.pause();
    currentAudioRef.current = null;
    currentUtteranceRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    }
    setSpeaking(false);
    setActiveKey(null);
  }, []);

  const speak = useCallback((text: string, options: SpeakOptions = {}) => {
    const capturedRun = ++narrationRunRef.current;
    const purpose = options.purpose ?? "story";
    const key = options.activeKey ?? `speech-${capturedRun}`;
    if (segmentTimerRef.current !== null) window.clearTimeout(segmentTimerRef.current);
    currentAudioRef.current?.pause();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    }
    setSpeaking(true);
    setActiveKey(key);

    const finish = () => {
      if (capturedRun !== narrationRunRef.current) return;
      currentAudioRef.current = null;
      currentUtteranceRef.current = null;
      setSpeaking(false);
      setActiveKey(null);
    };

    let fallbackStarted = false;
    const playSpeechFallback = () => {
      if (fallbackStarted) return;
      fallbackStarted = true;
      if (capturedRun !== narrationRunRef.current) return;
      currentAudioRef.current?.pause();
      currentAudioRef.current = null;
      if (!("speechSynthesis" in window)) {
        setSupported(false);
        finish();
        return;
      }
      const refreshed = rankEnglishVoices(Array.from(window.speechSynthesis.getVoices()))
        .filter((voice) => voiceQualityScore(voice) > 0);
      if (refreshed.length) voicesRef.current = refreshed;
      const voice = voicesRef.current[0] ?? null;
      const segments = buildStoryNarrationSegments(text, purpose);

      const playSegment = (index: number) => {
        if (capturedRun !== narrationRunRef.current) return;
        const segment = segments[index];
        if (!segment) {
          finish();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(segment.text);
        currentUtteranceRef.current = utterance;
        utterance.voice = voice;
        utterance.lang = voice?.lang ?? "en-US";
        utterance.rate = (NARRATION_PACES[pace]?.rate ?? DEFAULT_NARRATION_RATE)
          * segment.rateMultiplier
          * (purpose === "practice" ? 0.94 : 1);
        utterance.pitch = segment.pitch;
        utterance.volume = 1;
        utterance.onend = () => {
          if (capturedRun !== narrationRunRef.current) return;
          segmentTimerRef.current = window.setTimeout(
            () => playSegment(index + 1),
            segment.pauseAfterMs,
          );
        };
        utterance.onerror = () => {
          if (capturedRun !== narrationRunRef.current) return;
          finish();
        };
        window.speechSynthesis.speak(utterance);
      };

      if (segments.length) playSegment(0);
      else finish();
    };

    if (options.audioSrc && "Audio" in window) {
      const audio = new Audio(preparedAudioSource(options.audioSrc, pace));
      currentAudioRef.current = audio;
      audio.preload = "auto";
      audio.playbackRate = 1;
      audio.preservesPitch = true;
      audio.onended = finish;
      audio.onerror = playSpeechFallback;
      audio.play().catch(playSpeechFallback);
      return;
    }

    playSpeechFallback();
  }, [pace]);

  const audioSourceFor = useCallback(
    (source: string) => preparedAudioSource(source, pace),
    [pace],
  );

  return {
    speak,
    stop,
    speaking,
    supported,
    activeKey,
    pace,
    setPace,
    audioSourceFor,
    currentVoiceLabel: "Aoede picture-book teacher",
  };
}

export default function StoryGarden() {
  const [view, setView] = useState<View>({ kind: "shelf" });
  const [progress, setProgress] = useState<ProgressStore>({ version: 3, books: {} });
  const [progressReady, setProgressReady] = useState(false);
  const [saveWarning, setSaveWarning] = useState(false);
  const narrator = useNarrator();
  const stopNarration = narrator.stop;

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setView(parseViewFromUrl()), 0);
    const onPopState = () => setView(parseViewFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => {
      window.clearTimeout(initialTimer);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(PROGRESS_KEY)
          ?? window.localStorage.getItem(LEGACY_PROGRESS_KEY);
        setProgress(raw ? normaliseProgress(JSON.parse(raw)) : { version: 3, books: {} });
      } catch {
        setSaveWarning(true);
      } finally {
        setProgressReady(true);
      }
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (!progressReady) return;
    const saveTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
        setSaveWarning(false);
      } catch {
        setSaveWarning(true);
      }
    }, 0);
    return () => window.clearTimeout(saveTimer);
  }, [progress, progressReady]);

  const navigate = useCallback((next: View, replace = false) => {
    stopNarration();
    setView(next);
    if (typeof window !== "undefined") {
      window.history[replace ? "replaceState" : "pushState"]({}, "", urlForView(next));
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [stopNarration]);

  const updateBookProgress = useCallback(
    (bookSlug: string, updater: (current: BookProgress) => BookProgress) => {
      setProgress((current) => ({
        ...current,
        books: {
          ...current.books,
          [bookSlug]: updater(current.books[bookSlug] ?? emptyBookProgress()),
        },
      }));
    },
    [],
  );

  const resetProgress = useCallback(() => {
    try {
      window.localStorage.removeItem(PROGRESS_KEY);
      window.localStorage.removeItem(LEGACY_PROGRESS_KEY);
    } catch {
      setSaveWarning(true);
    }
    setProgress({ version: 3, books: {} });
  }, []);

  const openBook = useCallback((book: Book) => {
    const saved = progress.books[book.slug];
    const finished = saved ? bookIsComplete(book, saved) : false;
    const page = finished ? 0 : saved?.lastPage ?? 0;
    updateBookProgress(book.slug, (current) => ({ ...current, lastOpened: Date.now() }));
    navigate({ kind: "reader", bookSlug: book.slug, page });
  }, [navigate, progress.books, updateBookProgress]);

  const book = view.kind === "shelf"
    ? undefined
    : BOOKS.find((item) => item.slug === view.bookSlug);

  if (view.kind !== "shelf" && !book) {
    return <Shelf progress={progress} narrator={narrator} onOpenBook={openBook} onOpenWords={(selected) => navigate({ kind: "word-garden", bookSlug: selected.slug })} onReset={resetProgress} saveWarning={saveWarning} />;
  }

  if (view.kind === "reader" && book) {
    const bookProgress = progress.books[book.slug] ?? emptyBookProgress();
    const changePage = (page: number) => {
      updateBookProgress(book.slug, (current) => ({
        ...current,
        lastPage: page,
        lastOpened: Date.now(),
        readPages: current.readPages.includes(page)
          ? current.readPages
          : [...current.readPages, page].sort((a, b) => a - b),
      }));
      navigate({ kind: "reader", bookSlug: book.slug, page }, true);
    };
    return (
      <StoryReader
        key={book.slug}
        book={book}
        page={view.page}
        bookProgress={bookProgress}
        narrator={narrator}
        onPageChange={changePage}
        onBack={() => navigate({ kind: "shelf" })}
        onWords={() => navigate({ kind: "word-garden", bookSlug: book.slug })}
      />
    );
  }

  if (view.kind === "word-garden" && book) {
    const bookProgress = progress.books[book.slug] ?? emptyBookProgress();
    const confirmRead = (wordId: string) => {
      updateBookProgress(book.slug, (current) => {
        const existing = current.wordPractice.words[wordId] ?? {
          readConfirmed: false,
          spelling: "new" as const,
          attempts: 0,
        };
        return {
          ...current,
          lastOpened: Date.now(),
          wordPractice: {
            ...current.wordPractice,
            words: {
              ...current.wordPractice.words,
              [wordId]: { ...existing, readConfirmed: true, lastPractisedAt: Date.now() },
            },
          },
        };
      });
    };
    const finishSpelling = (
      wordId: string,
      result: Exclude<SpellingResult, "new">,
      attempts: number,
    ) => {
      updateBookProgress(book.slug, (current) => {
        const existing = current.wordPractice.words[wordId] ?? {
          readConfirmed: false,
          spelling: "new" as const,
          attempts: 0,
        };
        const spelling = result;
        const words = {
          ...current.wordPractice.words,
          [wordId]: {
            ...existing,
            readConfirmed: true,
            spelling,
            attempts: Math.min(99, existing.attempts + Math.max(1, Math.min(1, attempts))),
            lastPractisedAt: Date.now(),
          },
        };
        const complete = wordsForBook(book.slug).every((word) => wordIsMastered(words[word.id]));
        const wholeBookComplete = complete && STEP_ORDER.every((step) => current.steps[step]);
        return {
          ...current,
          completedAt: wholeBookComplete
            ? current.completedAt ?? new Date().toISOString()
            : current.completedAt,
          lastOpened: Date.now(),
          wordPractice: {
            words,
            completedAt: complete
              ? current.wordPractice.completedAt ?? new Date().toISOString()
              : current.wordPractice.completedAt,
          },
        };
      });
    };
    const recordSpellingMiss = (wordId: string) => {
      updateBookProgress(book.slug, (current) => {
        const existing = current.wordPractice.words[wordId] ?? {
          readConfirmed: true,
          spelling: "new" as const,
          attempts: 0,
        };
        return {
          ...current,
          lastOpened: Date.now(),
          wordPractice: {
            ...current.wordPractice,
            words: {
              ...current.wordPractice.words,
              [wordId]: {
                ...existing,
                readConfirmed: true,
                spelling: "new",
                attempts: Math.min(99, existing.attempts + 1),
                lastPractisedAt: Date.now(),
              },
            },
          },
        };
      });
    };
    return (
      <WordGarden
        key={book.slug}
        book={book}
        progress={bookProgress.wordPractice}
        narrator={narrator}
        onBack={() => navigate({ kind: "shelf" })}
        onOpenStory={(page) => navigate({ kind: "reader", bookSlug: book.slug, page })}
        onConfirmRead={confirmRead}
        onFinishSpelling={finishSpelling}
        onSpellingMiss={recordSpellingMiss}
        onContinue={() => navigate({ kind: "quest", bookSlug: book.slug, step: "listen" })}
      />
    );
  }

  if (view.kind === "quest" && book) {
    const bookProgress = progress.books[book.slug] ?? emptyBookProgress();
    const completeStep = (step: QuestStep, writingDraft?: string) => {
      updateBookProgress(book.slug, (current) => {
        const steps = { ...current.steps, [step]: true };
        const allDone = STEP_ORDER.every((item) => steps[item]);
        const wholeBookComplete = allDone && hasMasteredWords(book, current);
        return {
          ...current,
          steps,
          writingDraft: writingDraft ?? current.writingDraft,
          completedAt: wholeBookComplete ? current.completedAt ?? new Date().toISOString() : current.completedAt,
          lastOpened: Date.now(),
        };
      });
    };
    const stepIndex = STEP_ORDER.indexOf(view.step);
    const continueQuest = () => {
      const nextStep = STEP_ORDER[stepIndex + 1];
      navigate(nextStep
        ? { kind: "quest", bookSlug: book.slug, step: nextStep }
        : hasMasteredWords(book, bookProgress)
          ? { kind: "celebration", bookSlug: book.slug }
          : { kind: "word-garden", bookSlug: book.slug });
    };
    return (
      <QuestPage
        key={`${book.slug}-${view.step}`}
        book={book}
        step={view.step}
        progress={bookProgress}
        narrator={narrator}
        onBack={() => navigate({ kind: "word-garden", bookSlug: book.slug })}
        onComplete={completeStep}
        onContinue={continueQuest}
      />
    );
  }

  if (view.kind === "celebration" && book) {
    const bookProgress = progress.books[book.slug] ?? emptyBookProgress();
    if (!bookIsComplete(book, bookProgress)) {
      return (
        <AlmostComplete
          book={book}
          needsWords={!hasMasteredWords(book, bookProgress)}
          onContinue={() => navigate(
            !hasMasteredWords(book, bookProgress)
              ? { kind: "word-garden", bookSlug: book.slug }
              : { kind: "quest", bookSlug: book.slug, step: STEP_ORDER.find((step) => !bookProgress.steps[step]) ?? "listen" },
          )}
          onShelf={() => navigate({ kind: "shelf" })}
        />
      );
    }
    return (
      <Celebration
        book={book}
        onReadAgain={() => navigate({ kind: "reader", bookSlug: book.slug, page: 0 })}
        onShelf={() => navigate({ kind: "shelf" })}
      />
    );
  }

  return (
    <Shelf
      progress={progress}
      narrator={narrator}
      onOpenBook={openBook}
      onOpenWords={(selected) => navigate({ kind: "word-garden", bookSlug: selected.slug })}
      onReset={resetProgress}
      saveWarning={saveWarning}
    />
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`} aria-label="Story Garden">
      <span className="brand__mark" aria-hidden="true">
        <span className="brand__leaf brand__leaf--left" />
        <span className="brand__leaf brand__leaf--right" />
      </span>
      <span>Story Garden</span>
    </div>
  );
}

function NarrationSettings({ narrator }: { narrator: Narrator }) {
  const paceDetails = NARRATION_PACES[narrator.pace] ?? NARRATION_PACES.child;

  return (
    <details className="narration-settings narration-settings--compact">
      <summary>
        <span aria-hidden="true">🎧</span>
        <span><strong>Story voice</strong><small>{paceDetails.shortLabel} · {narrator.currentVoiceLabel}</small></span>
        <span aria-hidden="true">⌄</span>
      </summary>
      <div className="narration-settings__panel">
        <fieldset className="pace-choice">
          <legend>Reading speed</legend>
          {Object.entries(NARRATION_PACES).map(([value, option]) => (
            <label key={value} className={narrator.pace === value ? "is-selected" : ""}>
              <input
                type="radio"
                name="reading-speed"
                value={value}
                checked={narrator.pace === value}
                onChange={() => {
                  narrator.stop();
                  narrator.setPace(value as NarrationPace);
                }}
              />
              <span><strong>{option.label}</strong><small>{option.description}</small></span>
            </label>
          ))}
        </fieldset>
        <p>Both choices use the same prepared Aoede picture-book teacher. The child version is a separately prepared recording, never a mechanically slowed browser voice.</p>
      </div>
    </details>
  );
}

function Shelf({
  progress,
  narrator,
  onOpenBook,
  onOpenWords,
  onReset,
  saveWarning,
}: {
  progress: ProgressStore;
  narrator: Narrator;
  onOpenBook: (book: Book) => void;
  onOpenWords: (book: Book) => void;
  onReset: () => void;
  saveWarning: boolean;
}) {
  const completedBooks = BOOKS.filter((book) =>
    bookIsComplete(book, progress.books[book.slug] ?? emptyBookProgress()),
  ).length;
  const latestBook = useMemo(() => {
    return [...BOOKS]
      .filter((book) => progress.books[book.slug]?.lastOpened)
      .sort((a, b) =>
        (progress.books[b.slug]?.lastOpened ?? 0) - (progress.books[a.slug]?.lastOpened ?? 0),
      )[0];
  }, [progress.books]);

  const resetProgress = () => {
    if (window.confirm("Start the whole Story Garden again? This clears saved progress on this device.")) {
      onReset();
    }
  };

  return (
    <main className="shelf-page">
      <header className="shelf-header">
        <Brand />
        <div className="garden-counter" aria-label={`${completedBooks} of ${BOOKS.length} story flowers grown`}>
          <span aria-hidden="true">🌼</span>
          <strong>{completedBooks}</strong>
          <span className="garden-counter__of">/ {BOOKS.length} blooms</span>
        </div>
      </header>

      <section className="welcome" aria-labelledby="welcome-title">
        <div className="welcome__copy">
          <p className="eyebrow"><span aria-hidden="true">☀️</span> Today&apos;s story time</p>
          <h1 id="welcome-title">Which story shall we read today?</h1>
          <p>Read a real picture book, grow its five word flowers, then finish the listening, speaking, reading and writing missions.</p>
          {latestBook && (
            <button className="button button--sun" type="button" onClick={() => onOpenBook(latestBook)}>
              <span aria-hidden="true">▶</span>
              Continue {latestBook.title}
            </button>
          )}
        </div>
        <div className="welcome__garden" aria-hidden="true">
          <span className="sun-shape" />
          <span className="cloud-shape cloud-shape--one" />
          <span className="cloud-shape cloud-shape--two" />
          <span className="hero-book">ABC</span>
          <span className="hero-sprout"><i /><b /></span>
          <span className="hero-flower hero-flower--one">✿</span>
          <span className="hero-flower hero-flower--two">✿</span>
        </div>
      </section>

      <section className="how-it-works" aria-label="Story and word learning steps">
        <div className="how-it-works__intro">
          <span className="little-label">How it works</span>
          <strong>Read. Say. Spell. Grow!</strong>
        </div>
        {[
          { icon: "📖", label: "Story", garden: "Read" },
          { icon: "🔊", label: "Words", garden: "Hear" },
          { icon: "🎙️", label: "Say", garden: "Try" },
          { icon: "🔤", label: "Spell", garden: "Build" },
        ].map((step, index) => (
          <div className="mini-step" key={step.label}>
            <span className="mini-step__number">{index + 1}</span>
            <span className="mini-step__icon" aria-hidden="true">{step.icon}</span>
            <span><strong>{step.label}</strong><small>{step.garden}</small></span>
          </div>
        ))}
      </section>

      <section className="bookshelf" aria-labelledby="bookshelf-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">My bookshelf</p>
            <h2 id="bookshelf-title">Choose a book</h2>
          </div>
          <p>{BOOKS.length} stories ready to read</p>
        </div>
        {([1, 2] as const).map((level) => {
          const levelBooks = BOOKS.filter((book) => book.level === level);
          if (!levelBooks.length) return null;
          return (
            <section className="level-shelf" key={level} aria-labelledby={`level-${level}-title`}>
              <div className="level-shelf__heading">
                <h3 id={`level-${level}-title`}>Primary {level}</h3>
                <span>{levelBooks.length} picture books</span>
              </div>
              <div className="book-grid">
                {levelBooks.map((book) => (
                  <BookCard
                    key={book.slug}
                    book={book}
                    progress={progress.books[book.slug] ?? emptyBookProgress()}
                    onOpen={() => onOpenBook(book)}
                    onOpenWords={() => onOpenWords(book)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </section>

      {saveWarning && (
        <p className="save-warning" role="status">
          <span aria-hidden="true">☁️</span> You can still learn, but this device cannot save progress right now.
        </p>
      )}

      <details className="parent-corner">
        <summary>
          <span className="parent-corner__icon" aria-hidden="true">🔐</span>
          <span><strong>For grown-ups · 家长角</strong><small>课程范围与本机进度</small></span>
          <span className="parent-corner__arrow" aria-hidden="true">⌄</span>
        </summary>
        <div className="parent-corner__body">
          <div>
            <h3>本网站怎样使用</h3>
            <p>建议每次 8–12 分钟：先读绘本，再到单词花园完成“听范音—跟读—拼字—默写”，最后完成故事听、说、读、写任务。网站不对口音打分，避免设备或口音误判。</p>
            <p>进度只保存在当前设备。孩子的录音只在当前练习页临时回放，不上传、不写入进度，离开页面即删除。</p>
            <NarrationSettings narrator={narrator} />
          </div>
          <div>
            <h3>P1 与 P2 绘本课程</h3>
            <p>书架按 Primary 1 和 Primary 2 分组。每本书都配有标准版、儿童慢速版朗读，以及五个核心单词和听、说、读、写练习。</p>
            <button className="text-button" type="button" onClick={resetProgress}>清除这台设备上的学习进度</button>
          </div>
        </div>
      </details>

      <footer className="site-footer">
        <Brand compact />
        <p>Open a story. Grow your English.</p>
      </footer>
    </main>
  );
}

function BookCard({
  book,
  progress,
  onOpen,
  onOpenWords,
}: {
  book: Book;
  progress: BookProgress;
  onOpen: () => void;
  onOpenWords: () => void;
}) {
  const stepCount = STEP_ORDER.filter((step) => progress.steps[step]).length;
  const words = wordsForBook(book.slug);
  const masteredWords = words.filter((word) => wordIsMastered(progress.wordPractice.words[word.id])).length;
  const complete = stepCount === STEP_ORDER.length && masteredWords === words.length;
  const hasStartedWords = Object.values(progress.wordPractice.words).some((result) =>
    result.readConfirmed || result.spelling !== "new",
  );
  const hasStarted = progress.readPages.length > 0 || stepCount > 0 || hasStartedWords;
  const label = complete
    ? "Read again"
    : hasStarted
      ? `Continue page ${progress.lastPage + 1}`
      : "Start reading";

  return (
    <article className={`book-card ${complete ? "book-card--complete" : ""}`} style={{ "--book-colour": book.colour } as CSSProperties}>
      <button className="book-card__cover" type="button" onClick={onOpen} aria-label={`${label}: ${book.title}`}>
        <img src={book.cover} alt={`Cover of ${book.title}`} loading="lazy" />
        <span className="book-card__unit">P{book.level} · Unit {book.unit}</span>
        {complete && <span className="book-card__bloom" aria-label="Story flower grown">🌼</span>}
      </button>
      <div className="book-card__body">
        <div className="book-card__term">Term {book.term} <span>•</span> {book.focus[0]}</div>
        <h3>{book.title}</h3>
        <div className="book-card__progress" aria-label={`${stepCount} of 4 missions complete`}>
          {STEP_ORDER.map((step) => (
            <span key={step} className={progress.steps[step] ? "is-done" : ""} title={STEP_META[step].label}>
              {STEP_META[step].icon}
            </span>
          ))}
        </div>
        <div className="book-card__word-progress" aria-label={`${masteredWords} of ${words.length} words mastered`}>
          <span aria-hidden="true">{masteredWords === words.length ? "🌼" : "🌱"}</span>
          <span><strong>{masteredWords} / {words.length} words</strong><small>{masteredWords === words.length ? "Ready to review" : "Hear · Say · Spell"}</small></span>
          <b aria-hidden="true">→</b>
        </div>
        <div className="book-card__actions">
          <button className="book-card__button" type="button" onClick={onOpen}>
            {label} <span aria-hidden="true">→</span>
          </button>
          <button className="book-card__words-button" type="button" onClick={onOpenWords}>Practice words</button>
        </div>
      </div>
    </article>
  );
}

type Narrator = ReturnType<typeof useNarrator>;

function StoryReader({
  book,
  page,
  bookProgress,
  narrator,
  onPageChange,
  onBack,
  onWords,
}: {
  book: Book;
  page: number;
  bookProgress: BookProgress;
  narrator: Narrator;
  onPageChange: (page: number) => void;
  onBack: () => void;
  onWords: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const startX = useRef<number | null>(null);
  const current = book.pages[page];
  const isLast = page === book.pages.length - 1;
  const pageHasBeenRead = bookProgress.readPages.includes(page);
  const stopNarration = narrator.stop;
  const audioSourceFor = narrator.audioSourceFor;

  useEffect(() => {
    if (!pageHasBeenRead) onPageChange(page);
  }, [onPageChange, page, pageHasBeenRead]);

  useEffect(() => {
    const next = book.pages[page + 1];
    if (next) {
      const image = new Image();
      image.src = next.src;
      if (next.audioSrc) {
        const audio = new Audio(audioSourceFor(next.audioSrc));
        audio.preload = "metadata";
      }
    }
  }, [audioSourceFor, book.pages, page]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (zoomed && event.key === "Escape") {
        setZoomed(false);
        return;
      }
      if (event.key === "ArrowLeft" && page > 0) onPageChange(page - 1);
      if (event.key === "ArrowRight" && page < book.pages.length - 1) onPageChange(page + 1);
      if (event.key === "Home") onPageChange(0);
      if (event.key === "End") onPageChange(book.pages.length - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [book.pages.length, onPageChange, page, zoomed]);

  useEffect(() => () => stopNarration(), [stopNarration]);

  const movePage = (next: number) => {
    stopNarration();
    onPageChange(Math.max(0, Math.min(next, book.pages.length - 1)));
  };
  const pageVoiceKey = `story-${book.slug}-${page}`;
  const pageIsSpeaking = narrator.activeKey === pageVoiceKey;

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.isPrimary) startX.current = event.clientX;
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (startX.current === null || !event.isPrimary) return;
    const distance = event.clientX - startX.current;
    startX.current = null;
    if (Math.abs(distance) < 65) return;
    if (distance > 0 && page > 0) movePage(page - 1);
    if (distance < 0 && page < book.pages.length - 1) movePage(page + 1);
  };

  return (
    <main className="reader" style={{ "--book-colour": book.colour } as CSSProperties}>
      <header className="reader__header">
        <button className="round-button" type="button" onClick={onBack} aria-label="Back to my bookshelf">←</button>
        <div className="reader__title">
          <span>Now reading</span>
          <h1>{book.title}</h1>
        </div>
        <div className="reader__mission-dots" aria-label="Learning missions">
          <span
            className={wordsForBook(book.slug).every((word) => wordIsMastered(bookProgress.wordPractice.words[word.id])) ? "is-done" : ""}
            title="Word Garden"
          >
            🌱
          </span>
          {STEP_ORDER.map((step) => (
            <span key={step} className={bookProgress.steps[step] ? "is-done" : ""} title={STEP_META[step].label}>
              {STEP_META[step].icon}
            </span>
          ))}
        </div>
      </header>

      <div className="reader__stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <button
          className="reader__side reader__side--previous"
          type="button"
          onClick={() => movePage(page - 1)}
          disabled={page === 0}
          aria-label="Previous page"
        >
          <span aria-hidden="true">←</span><small>Back</small>
        </button>

        <section className="story-page" aria-label={`Page ${page + 1} of ${book.pages.length}`}>
          <div className="story-page__paper">
            <button className="story-page__image-button" type="button" onClick={() => setZoomed(true)} aria-label="Open a larger view of this page">
              <img
                key={current.src}
                src={current.src}
                alt={`Page ${page + 1} of ${book.title}`}
                draggable={false}
                decoding="async"
              />
              <span className="story-page__zoom" aria-hidden="true">↗</span>
            </button>
          </div>

          <div className="reader__tools">
            <button
              className={`listen-button ${pageIsSpeaking ? "is-speaking" : ""}`}
              type="button"
              onClick={() => pageIsSpeaking
                ? narrator.stop()
                : current.audioSrc && narrator.speak(current.transcript, {
                    purpose: "story",
                    activeKey: pageVoiceKey,
                    audioSrc: current.audioSrc,
                  })}
              disabled={!narrator.supported || !current.audioSrc}
            >
              <span className="listen-button__icon" aria-hidden="true">{pageIsSpeaking ? "■" : "🔊"}</span>
              <span>
                <strong>{pageIsSpeaking ? "Stop" : current.audioSrc ? "Hear this page" : "Picture page"}</strong>
                <small>{current.audioSrc ? `${narrator.currentVoiceLabel} · listen, then point to the words` : "Pause and tell the story from the picture"}</small>
              </span>
            </button>
          </div>
          <NarrationSettings narrator={narrator} />

          {isLast && (
            <div className="quest-invite">
              <span className="quest-invite__plant" aria-hidden="true">🌱</span>
              <div><small>You finished the story!</small><strong>Ready to grow five word flowers?</strong></div>
              <button className="button button--green" type="button" onClick={onWords}>Grow my Word Garden <span aria-hidden="true">→</span></button>
            </div>
          )}
        </section>

        <button
          className="reader__side reader__side--next"
          type="button"
          onClick={() => movePage(page + 1)}
          disabled={isLast}
          aria-label="Next page"
        >
          <small>Next</small><span aria-hidden="true">→</span>
        </button>
      </div>

      <footer className="reader__footer">
        <button type="button" onClick={() => movePage(page - 1)} disabled={page === 0} aria-label="Previous page">←</button>
        <div className="page-progress">
          <div><span style={{ width: `${((page + 1) / book.pages.length) * 100}%` }} /></div>
          <strong>Page {page + 1} <span>of {book.pages.length}</span></strong>
        </div>
        <button type="button" onClick={() => movePage(page + 1)} disabled={isLast} aria-label="Next page">→</button>
      </footer>
      <p className="sr-only" aria-live="polite">Page {page + 1} of {book.pages.length}</p>

      {zoomed && (
        <div className="page-zoom" role="dialog" aria-modal="true" aria-label={`Large view of page ${page + 1}`}>
          <button className="page-zoom__close" type="button" onClick={() => setZoomed(false)}>Close ✕</button>
          <div className="page-zoom__scroll">
            <img src={current.src} alt={`Large page ${page + 1} of ${book.title}`} />
          </div>
        </div>
      )}
    </main>
  );
}

function QuestPage({
  book,
  step,
  progress,
  narrator,
  onBack,
  onComplete,
  onContinue,
}: {
  book: Book;
  step: QuestStep;
  progress: BookProgress;
  narrator: Narrator;
  onBack: () => void;
  onComplete: (step: QuestStep, writingDraft?: string) => void;
  onContinue: () => void;
}) {
  const [done, setDone] = useState(progress.steps[step]);
  const meta = STEP_META[step];
  const finish = (writingDraft?: string) => {
    onComplete(step, writingDraft);
    setDone(true);
  };

  return (
    <main className={`quest quest--${step}`} style={{ "--book-colour": book.colour } as CSSProperties}>
      <header className="quest__header">
        <button className="round-button" type="button" onClick={onBack} aria-label="Back to the story">←</button>
        <div className="quest__book">
          <img src={book.cover} alt="" />
          <span><small>Story missions</small><strong>{book.title}</strong></span>
        </div>
        <span className="quest__count">{STEP_ORDER.indexOf(step) + 1} / 4</span>
      </header>

      <nav className="quest-path" aria-label="Listen, speak, read and write missions">
        {STEP_ORDER.map((item, index) => {
          const isCurrent = item === step;
          const isDone = progress.steps[item] || STEP_ORDER.indexOf(step) > index;
          return (
            <div key={item} className={`${isCurrent ? "is-current" : ""} ${isDone ? "is-done" : ""}`}>
              <span aria-hidden="true">{isDone && !isCurrent ? "✓" : STEP_META[item].icon}</span>
              <strong>{STEP_META[item].label}</strong>
            </div>
          );
        })}
      </nav>

      <section className="mission-card" aria-labelledby="mission-title">
        <div className="mission-heading">
          <span className="mission-heading__icon" aria-hidden="true">{meta.icon}</span>
          <div>
            <p className="eyebrow">Mission {STEP_ORDER.indexOf(step) + 1} · Grow {meta.garden.toLowerCase()}</p>
            <h1 id="mission-title">{meta.title}</h1>
            <p>{meta.instruction}</p>
          </div>
        </div>

        {done ? (
          <MissionComplete step={step} onContinue={onContinue} />
        ) : (
          <>
            {step === "listen" && <ListenMission book={book} narrator={narrator} onDone={() => finish()} />}
            {step === "speak" && <SpeakMission book={book} narrator={narrator} onDone={() => finish()} />}
            {step === "read" && <ReadMission book={book} narrator={narrator} onDone={() => finish()} />}
            {step === "write" && <WriteMission book={book} narrator={narrator} initialValue={progress.writingDraft ?? ""} onDone={finish} />}
          </>
        )}
      </section>
    </main>
  );
}

function ListenMission({ book, narrator, onDone }: { book: Book; narrator: Narrator; onDone: () => void }) {
  const task = book.tasks.listen;
  const [picked, setPicked] = useState<string>();
  const [tries, setTries] = useState(0);
  const correct = picked === task.correctAnswer;
  const voiceKey = `listen-${book.slug}`;
  const isSpeaking = narrator.activeKey === voiceKey;

  const choose = (choice: string) => {
    setPicked(choice);
    if (choice === task.correctAnswer) onDone();
    else setTries((value) => value + 1);
  };

  return (
    <div className="mission-body">
      <button className={`sound-orb ${isSpeaking ? "is-speaking" : ""}`} type="button" onClick={() => isSpeaking ? narrator.stop() : narrator.speak(task.audioText, { purpose: "practice", activeKey: voiceKey, audioSrc: `/audio/${book.slug}/listen.mp3` })}>
        <span aria-hidden="true">{isSpeaking ? "■" : "🔊"}</span>
        <strong>{isSpeaking ? "Stop" : tries ? "Listen again" : "Tap to listen"}</strong>
        <small>You can play it more than once</small>
      </button>
      <div className="question-block">
        <h2>{task.prompt}</h2>
        <div className="choice-grid">
          {task.choices.map((choice, index) => (
            <button
              type="button"
              key={choice}
              className={`${picked === choice ? "is-picked" : ""} ${picked === choice && !correct ? "needs-retry" : ""}`}
              onClick={() => choose(choice)}
            >
              <span>{String.fromCharCode(65 + index)}</span>{choice}
            </button>
          ))}
        </div>
        {picked && !correct && <p className="try-again" role="status">Almost! Listen once more and try a different answer.</p>}
      </div>
    </div>
  );
}

function SpeakMission({ book, narrator, onDone }: { book: Book; narrator: Narrator; onDone: () => void }) {
  const task = book.tasks.speak;
  const [recordingSupported, setRecordingSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [requestingRecording, setRequestingRecording] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const childPlayback = useRef<HTMLAudioElement | null>(null);
  const mounted = useRef(false);
  const microphoneRequest = useRef(0);
  const voiceKey = `model-${book.slug}`;
  const modelIsSpeaking = narrator.activeKey === voiceKey;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      microphoneRequest.current += 1;
      if (recorder.current?.state === "recording") {
        recorder.current.ondataavailable = null;
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      stream.current?.getTracks().forEach((track) => track.stop());
      childPlayback.current?.pause();
      recorder.current = null;
      stream.current = null;
      childPlayback.current = null;
    };
  }, []);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const startRecording = async () => {
    if (requestingRecording || recording) return;
    narrator.stop();
    childPlayback.current?.pause();
    const request = ++microphoneRequest.current;
    setRequestingRecording(true);
    setPermissionMessage("");
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || request !== microphoneRequest.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = mediaStream;
      chunks.current = [];
      const mediaRecorder = new MediaRecorder(mediaStream);
      recorder.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        if (!mounted.current || request !== microphoneRequest.current) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        const blob = new Blob(chunks.current, { type: mediaRecorder.mimeType || "audio/webm" });
        setAudioUrl((oldUrl) => {
          if (oldUrl) URL.revokeObjectURL(oldUrl);
          return URL.createObjectURL(blob);
        });
        mediaStream.getTracks().forEach((track) => track.stop());
        setRecording(false);
      };
      mediaRecorder.start();
      setRecording(true);
    } catch {
      if (!mounted.current || request !== microphoneRequest.current) return;
      stream.current?.getTracks().forEach((track) => track.stop());
      setPermissionMessage("No microphone? That is okay — say it aloud, then tap ‘I said it!’");
      setRecordingSupported(false);
    } finally {
      if (mounted.current && request === microphoneRequest.current) {
        setRequestingRecording(false);
      }
    }
  };

  const stopRecording = () => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  };

  return (
    <div className="speak-practice">
      <div className="model-line">
        <span>Say this</span>
        <blockquote>{task.modelLine}</blockquote>
        <button className="button button--sound" type="button" disabled={recording || requestingRecording} onClick={() => modelIsSpeaking ? narrator.stop() : narrator.speak(task.modelLine, { purpose: "practice", activeKey: voiceKey, audioSrc: `/audio/${book.slug}/speak.mp3` })}>
          <span aria-hidden="true">{modelIsSpeaking ? "■" : "🔊"}</span> {modelIsSpeaking ? "Stop" : "Hear the line"}
        </button>
      </div>
      <div className="speech-tip"><span aria-hidden="true">💡</span><p><strong>Coach&apos;s tip</strong>{task.tip}</p></div>
      <div className="record-panel">
        <div className={`mic-visual ${recording ? "is-recording" : ""}`} aria-hidden="true"><span>🎙️</span></div>
        <div>
          <h2>{recording ? "I am listening..." : audioUrl ? "Play your voice" : "Now it is your turn!"}</h2>
          <p>{recording ? "Say the whole line, then stop." : "Speak slowly and clearly. Trying is what matters."}</p>
        </div>
        {recordingSupported && !recording && (
          <button className="button button--coral" type="button" disabled={requestingRecording} onClick={startRecording}>
            {requestingRecording ? "Opening microphone…" : "Record my voice"}
          </button>
        )}
        {recording && (
          <button className="button button--coral" type="button" onClick={stopRecording}>■ Stop recording</button>
        )}
        {audioUrl && !recording && !requestingRecording && (
          <audio ref={childPlayback} className="voice-playback" src={audioUrl} controls aria-label="Play your recording" onPlay={narrator.stop} />
        )}
        {permissionMessage && <p className="permission-note" role="status">{permissionMessage}</p>}
        <button className="button button--green" type="button" onClick={onDone}>
          ✓ I said it!
        </button>
      </div>
    </div>
  );
}

function ReadMission({ book, narrator, onDone }: { book: Book; narrator: Narrator; onDone: () => void }) {
  const task = book.tasks.read;
  const [picked, setPicked] = useState<string>();
  const correct = picked === task.correctAnswer;
  const voiceKey = `read-${book.slug}`;
  const isSpeaking = narrator.activeKey === voiceKey;
  const choose = (choice: string) => {
    setPicked(choice);
    if (choice === task.correctAnswer) onDone();
  };
  return (
    <div className="read-practice">
      <div className="reading-card">
        <div className="reading-card__top"><span>Story clue</span><button type="button" onClick={() => isSpeaking ? narrator.stop() : narrator.speak(task.passage, { purpose: "practice", activeKey: voiceKey, audioSrc: `/audio/${book.slug}/read.mp3` })}>{isSpeaking ? "■ Stop" : "🔊 Help me hear it"}</button></div>
        <p>{task.passage}</p>
      </div>
      <div className="question-block">
        <h2>{task.question}</h2>
        <div className="choice-grid choice-grid--wide">
          {task.choices.map((choice, index) => (
            <button
              type="button"
              key={choice}
              className={`${picked === choice ? "is-picked" : ""} ${picked === choice && !correct ? "needs-retry" : ""}`}
              onClick={() => choose(choice)}
            >
              <span>{String.fromCharCode(65 + index)}</span>{choice}
            </button>
          ))}
        </div>
        {picked && !correct && <p className="try-again" role="status">Good try. Read the clue once more — the answer is hiding there!</p>}
      </div>
    </div>
  );
}

function WriteMission({
  book,
  narrator,
  initialValue,
  onDone,
}: {
  book: Book;
  narrator: Narrator;
  initialValue: string;
  onDone: (writingDraft?: string) => void;
}) {
  const task = book.tasks.write;
  const [mode, setMode] = useState<"type" | "handwrite">("type");
  const [value, setValue] = useState(initialValue);
  const [checked, setChecked] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const voiceKey = `write-${book.slug}`;
  const isSpeaking = narrator.activeKey === voiceKey;

  const trimmed = value.trim();
  const sentenceWords: string[] = trimmed.toLowerCase().match(/[a-z']+/g) ?? [];
  const hasCapital = /^[A-Z]/.test(trimmed);
  const hasPunctuation = /[.!?]$/.test(trimmed);
  const hasWords = task.targetWords.every((word) =>
    sentenceWords.includes(word.toLowerCase()),
  );
  const sentenceReady = hasCapital && hasPunctuation && hasWords;

  useEffect(() => {
    if (mode !== "handwrite" || !canvas.current) return;
    const element = canvas.current;
    const resize = () => {
      const rect = element.getBoundingClientRect();
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      element.width = Math.round(rect.width * ratio);
      element.height = Math.round(rect.height * ratio);
      const context = element.getContext("2d");
      context?.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (context) {
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = 5;
        context.strokeStyle = "#173c32";
      }
      setHasInk(false);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [mode]);

  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const startDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = event.currentTarget.getContext("2d");
    const here = point(event);
    context?.beginPath();
    context?.moveTo(here.x, here.y);
    drawing.current = true;
    setHasInk(true);
  };
  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext("2d");
    const here = point(event);
    context?.lineTo(here.x, here.y);
    context?.stroke();
  };
  const stopDrawing = () => {
    drawing.current = false;
  };
  const clearCanvas = () => {
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext("2d");
    context?.save();
    context?.setTransform(1, 0, 0, 1, 0, 0);
    context?.clearRect(0, 0, element.width, element.height);
    context?.restore();
    setHasInk(false);
  };

  const checkSentence = () => {
    setChecked(true);
    if (sentenceReady) onDone(value);
  };

  return (
    <div className="write-practice">
      <div className="copy-line">
        <span>My sentence</span>
        <p>{task.modelSentence}</p>
        <button type="button" onClick={() => isSpeaking ? narrator.stop() : narrator.speak(task.modelSentence, { purpose: "practice", activeKey: voiceKey, audioSrc: `/audio/${book.slug}/write.mp3` })}>{isSpeaking ? "■ Stop" : "🔊 Hear it"}</button>
      </div>
      <div className="write-tabs" role="tablist" aria-label="Choose how to write">
        <button type="button" role="tab" aria-selected={mode === "type"} onClick={() => setMode("type")}>⌨️ Type it</button>
        <button type="button" role="tab" aria-selected={mode === "handwrite"} onClick={() => setMode("handwrite")}>✏️ Write by hand</button>
      </div>

      {mode === "type" ? (
        <div className="typing-panel" role="tabpanel">
          <label htmlFor="my-sentence">Copy the whole sentence</label>
          <textarea
            id="my-sentence"
            value={value}
            onChange={(event) => { setValue(event.target.value); setChecked(false); }}
            placeholder="Start with a capital letter..."
            rows={3}
            spellCheck
            autoCapitalize="sentences"
          />
          <div className="sentence-checks" aria-label="Sentence checklist">
            <span className={hasCapital ? "is-ready" : ""}>{hasCapital ? "✓" : "○"} Capital letter</span>
            <span className={hasWords ? "is-ready" : ""}>{hasWords ? "✓" : "○"} Story words</span>
            <span className={hasPunctuation ? "is-ready" : ""}>{hasPunctuation ? "✓" : "○"} Full stop</span>
          </div>
          {checked && !sentenceReady && <p className="try-again" role="status">Nearly there! Use the three clues above, then check again.</p>}
          <button className="button button--green" type="button" onClick={checkSentence}>Check my sentence</button>
        </div>
      ) : (
        <div className="handwriting-panel" role="tabpanel">
          <div className="handwriting-toolbar"><span>Use your finger, mouse or pencil.</span><button type="button" onClick={clearCanvas}>Clear</button></div>
          <div className="canvas-wrap">
            <span className="canvas-line canvas-line--one" />
            <span className="canvas-line canvas-line--two" />
            <canvas
              ref={canvas}
              aria-label="Handwriting pad"
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
            />
          </div>
          <button className="button button--green" type="button" disabled={!hasInk} onClick={() => onDone(task.modelSentence)}>
            ✓ I finished writing
          </button>
        </div>
      )}
    </div>
  );
}

function MissionComplete({ step, onContinue }: { step: QuestStep; onContinue: () => void }) {
  const index = STEP_ORDER.indexOf(step);
  const last = index === STEP_ORDER.length - 1;
  return (
    <div className="mission-complete" role="status">
      <div className="mission-complete__garden" aria-hidden="true">
        <span className="mission-complete__burst" />
        <span>{step === "listen" ? "💧" : step === "speak" ? "☀️" : step === "read" ? "🍃" : "🌼"}</span>
      </div>
      <p className="eyebrow">Mission complete</p>
      <h2>{step === "listen" ? "A drop of water!" : step === "speak" ? "Here comes the sunshine!" : step === "read" ? "A new leaf!" : "Your flower is blooming!"}</h2>
      <p>You tried, learned and helped your story grow.</p>
      <button className="button button--green" type="button" onClick={onContinue}>
        {last ? "See my story flower" : `Next: ${STEP_META[STEP_ORDER[index + 1]].label}`} <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

function AlmostComplete({
  book,
  needsWords,
  onContinue,
  onShelf,
}: {
  book: Book;
  needsWords: boolean;
  onContinue: () => void;
  onShelf: () => void;
}) {
  return (
    <main className="celebration" style={{ "--book-colour": book.colour } as CSSProperties}>
      <section className="celebration__card">
        <p className="eyebrow">One garden step left</p>
        <div className="bloom-badge" aria-hidden="true"><span>🌱</span></div>
        <h1>Your flower is still growing!</h1>
        <p>{needsWords
          ? "Some spelling words still need one try without a clue. Let's make those roots strong."
          : "Finish the remaining story mission, then your flower can bloom."}</p>
        <div className="celebration__actions">
          <button className="button button--light" type="button" onClick={onShelf}>Back to my bookshelf</button>
          <button className="button button--green" type="button" onClick={onContinue}>
            {needsWords ? "Review my words" : "Finish my mission"} →
          </button>
        </div>
      </section>
    </main>
  );
}

function Celebration({ book, onReadAgain, onShelf }: { book: Book; onReadAgain: () => void; onShelf: () => void }) {
  return (
    <main className="celebration" style={{ "--book-colour": book.colour } as CSSProperties}>
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => <i key={index} />)}
      </div>
      <section className="celebration__card">
        <p className="eyebrow">Word Garden + all 4 missions complete</p>
        <div className="bloom-badge" aria-hidden="true"><span>🌼</span></div>
        <h1>Your story flower bloomed!</h1>
        <p>You learned five story words, then listened, spoke, read and wrote with <strong>{book.title}</strong>.</p>
        <div className="celebration__steps">
          {STEP_ORDER.map((step) => <span key={step}>{STEP_META[step].icon}<strong>{STEP_META[step].label}</strong><small>✓ done</small></span>)}
        </div>
        <div className="celebration__book">
          <img src={book.cover} alt={`Cover of ${book.title}`} />
          <div><small>New bloom</small><strong>{book.title}</strong></div>
        </div>
        <div className="celebration__actions">
          <button className="button button--light" type="button" onClick={onReadAgain}>↻ Read again</button>
          <button className="button button--green" type="button" onClick={onShelf}>Back to my bookshelf →</button>
        </div>
      </section>
    </main>
  );
}
