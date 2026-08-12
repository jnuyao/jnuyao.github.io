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
import { ArtStudio } from "./art-studio";
import {
  ART_MISSION_IDS,
  ART_STEPS,
  artStudioForBook,
  type ArtMissionId,
  type ArtStep,
} from "./art-studio-data";
import { clearArtPhotos } from "./art-photo-store";
import { DinosaurArtLab } from "./dinosaur-art-lab";
import {
  DINOSAUR_ART_LESSON_IDS,
  dinosaurArtLessonById,
  isDinosaurArtBook,
  type DinosaurArtLessonId,
  type DinosaurArtStep,
} from "./dinosaur-art-data";
import {
  DINOSAUR_ART_PROGRESS_KEY,
  emptyDinosaurArtProgress,
  normaliseDinosaurArtProgress,
  type DinosaurArtProgress,
} from "./dinosaur-art-progress";
import { DinosaurPronunciationLab } from "./dinosaur-pronunciation-lab";
import {
  DINOSAUR_PRONUNCIATION_IDS,
  type DinosaurPronunciationId,
} from "./dinosaur-pronunciation-data";
import {
  DINOSAUR_PRONUNCIATION_PROGRESS_KEY,
  emptyDinosaurPronunciationProgress,
  normaliseDinosaurPronunciationProgress,
  type DinosaurPronunciationProgress,
} from "./dinosaur-pronunciation-progress";
import { EverydayDiscoveryLab } from "./everyday-discovery-lab";
import {
  EVERYDAY_DISCOVERY_IDS,
  EVERYDAY_DISCOVERY_SCENE_IDS,
  everydayDiscoveryItemById,
  type EverydayDiscoveryId,
  type EverydayDiscoverySceneId,
} from "./everyday-discovery-data";
import {
  EVERYDAY_DISCOVERY_PROGRESS_KEY,
  emptyEverydayDiscoveryProgress,
  normaliseEverydayDiscoveryProgress,
  type EverydayDiscoveryProgress,
} from "./everyday-discovery-progress";
import {
  MID_AUTUMN_ADVENTURE_BOOK_SLUG,
  MID_AUTUMN_MISSION_IDS,
  isMidAutumnAdventureBook,
  type MidAutumnAdventureStep,
  type MidAutumnMissionId,
} from "./mid-autumn-adventure-data";
import {
  MID_AUTUMN_ADVENTURE_PROGRESS_KEY,
  emptyMidAutumnAdventureProgress,
  normaliseMidAutumnAdventureProgress,
  type MidAutumnAdventureProgress,
} from "./mid-autumn-adventure-progress";
import { MoonlightMarketAdventure } from "./moonlight-market-adventure";
import { storyGuideForBook } from "./story-guide-data";
import { wordsForBook } from "./word-data";
import { WordGarden } from "./word-garden";
import { HackersPaintersReader } from "./adult-reader/hackers-painters-reader";
import {
  HACKERS_PAINTERS_UNIT_IDS,
  type HackersPaintersUnitId,
} from "./adult-reader/hackers-painters-data";
import {
  LEGACY_PROGRESS_KEY,
  PROGRESS_KEY,
  emptyArtStudioProgress,
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
  | { kind: "hackers-painters"; unitId: HackersPaintersUnitId | null }
  | { kind: "dinosaur-art-lab"; lessonId: DinosaurArtLessonId | null; step: DinosaurArtStep; fromBookSlug?: string }
  | { kind: "dinosaur-pronunciation-lab"; dinosaurId: DinosaurPronunciationId | null }
  | { kind: "everyday-discovery-lab"; sceneId: EverydayDiscoverySceneId | null; itemId: EverydayDiscoveryId | null }
  | {
      kind: "mid-autumn-adventure";
      bookSlug: typeof MID_AUTUMN_ADVENTURE_BOOK_SLUG;
      missionId: MidAutumnMissionId | null;
      step: MidAutumnAdventureStep;
    }
  | { kind: "reader"; bookSlug: string; page: number }
  | { kind: "art-studio"; bookSlug: string; step: ArtStep; missionId: ArtMissionId }
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
  if (params.get("studio") === "hackers-painters") {
    const rawUnit = params.get("unit");
    return {
      kind: "hackers-painters",
      unitId: rawUnit && HACKERS_PAINTERS_UNIT_IDS.includes(rawUnit as HackersPaintersUnitId)
        ? rawUnit as HackersPaintersUnitId
        : null,
    };
  }
  if (params.get("lab") === "everyday-discovery") {
    const rawScene = params.get("scene");
    const rawItem = params.get("word");
    const itemId = rawItem && EVERYDAY_DISCOVERY_IDS.includes(rawItem as EverydayDiscoveryId)
      ? rawItem as EverydayDiscoveryId
      : null;
    const item = itemId ? everydayDiscoveryItemById(itemId) : undefined;
    const sceneId = item?.sceneId
      ?? (rawScene && EVERYDAY_DISCOVERY_SCENE_IDS.includes(rawScene as EverydayDiscoverySceneId)
        ? rawScene as EverydayDiscoverySceneId
        : null);
    return { kind: "everyday-discovery-lab", sceneId, itemId };
  }
  if (params.get("lab") === "dinosaur-pronunciation") {
    const rawDinosaur = params.get("dino");
    return {
      kind: "dinosaur-pronunciation-lab",
      dinosaurId: rawDinosaur
        && DINOSAUR_PRONUNCIATION_IDS.includes(rawDinosaur as DinosaurPronunciationId)
        ? rawDinosaur as DinosaurPronunciationId
        : null,
    };
  }
  if (params.get("lab") === "dinosaur-art") {
    const rawLesson = params.get("lesson");
    const rawStep = Number(params.get("step") ?? "1");
    const rawFrom = params.get("from") ?? "";
    return {
      kind: "dinosaur-art-lab",
      lessonId: rawLesson && DINOSAUR_ART_LESSON_IDS.includes(rawLesson as DinosaurArtLessonId)
        ? rawLesson as DinosaurArtLessonId
        : null,
      step: Math.max(0, Math.min(3, Number.isFinite(rawStep) ? Math.floor(rawStep) - 1 : 0)) as DinosaurArtStep,
      fromBookSlug: isDinosaurArtBook(rawFrom) ? rawFrom : undefined,
    };
  }
  const bookSlug = params.get("book") ?? "";
  const book = BOOKS.find((item) => item.slug === bookSlug);
  if (!book) return { kind: "shelf" };

  const stage = params.get("stage");
  if (stage === "moonlight-market" && isMidAutumnAdventureBook(bookSlug)) {
    const rawMission = params.get("mission");
    const missionId = rawMission && MID_AUTUMN_MISSION_IDS.includes(rawMission as MidAutumnMissionId)
      ? rawMission as MidAutumnMissionId
      : null;
    const rawStep = Number(params.get("step") ?? "1");
    return {
      kind: "mid-autumn-adventure",
      bookSlug: MID_AUTUMN_ADVENTURE_BOOK_SLUG,
      missionId,
      step: Math.max(0, Math.min(3, Number.isFinite(rawStep) ? Math.floor(rawStep) - 1 : 0)) as MidAutumnAdventureStep,
    };
  }
  if (stage === "art" && artStudioForBook(bookSlug)) {
    const rawStep = params.get("step");
    const rawMission = params.get("mission");
    return {
      kind: "art-studio",
      bookSlug,
      step: rawStep && ART_STEPS.includes(rawStep as ArtStep) ? rawStep as ArtStep : "observe",
      missionId: rawMission && ART_MISSION_IDS.includes(rawMission as ArtMissionId)
        ? rawMission as ArtMissionId
        : "story-artist",
    };
  }
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
  if (view.kind === "hackers-painters") {
    params.set("studio", "hackers-painters");
    if (view.unitId) params.set("unit", view.unitId);
    return `${window.location.pathname}?${params.toString()}`;
  }
  if (view.kind === "everyday-discovery-lab") {
    params.set("lab", "everyday-discovery");
    if (view.sceneId) params.set("scene", view.sceneId);
    if (view.itemId) params.set("word", view.itemId);
    return `${window.location.pathname}?${params.toString()}`;
  }
  if (view.kind === "dinosaur-pronunciation-lab") {
    params.set("lab", "dinosaur-pronunciation");
    if (view.dinosaurId) params.set("dino", view.dinosaurId);
    return `${window.location.pathname}?${params.toString()}`;
  }
  if (view.kind === "dinosaur-art-lab") {
    params.set("lab", "dinosaur-art");
    if (view.lessonId) params.set("lesson", view.lessonId);
    if (view.lessonId) params.set("step", String(view.step + 1));
    if (view.fromBookSlug) params.set("from", view.fromBookSlug);
    return `${window.location.pathname}?${params.toString()}`;
  }
  if (view.kind !== "shelf") params.set("book", view.bookSlug);
  if (view.kind === "reader") params.set("page", String(view.page + 1));
  if (view.kind === "mid-autumn-adventure") {
    params.set("stage", "moonlight-market");
    if (view.missionId) {
      params.set("mission", view.missionId);
      params.set("step", String(view.step + 1));
    }
  }
  if (view.kind === "art-studio") {
    params.set("stage", "art");
    params.set("step", view.step);
    params.set("mission", view.missionId);
  }
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
  preparedOnly?: boolean;
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
      if (options.preparedOnly) {
        audio.onerror = finish;
        audio.play().catch(finish);
      } else {
        audio.onerror = playSpeechFallback;
        audio.play().catch(playSpeechFallback);
      }
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
  const [dinosaurArtProgress, setDinosaurArtProgress] = useState<DinosaurArtProgress>(() => emptyDinosaurArtProgress());
  const [dinosaurPronunciationProgress, setDinosaurPronunciationProgress] =
    useState<DinosaurPronunciationProgress>(() => emptyDinosaurPronunciationProgress());
  const [everydayDiscoveryProgress, setEverydayDiscoveryProgress] =
    useState<EverydayDiscoveryProgress>(() => emptyEverydayDiscoveryProgress());
  const [midAutumnAdventureProgress, setMidAutumnAdventureProgress] =
    useState<MidAutumnAdventureProgress>(() => emptyMidAutumnAdventureProgress());
  const [progressReady, setProgressReady] = useState(false);
  const [dinosaurArtProgressReady, setDinosaurArtProgressReady] = useState(false);
  const [dinosaurPronunciationProgressReady, setDinosaurPronunciationProgressReady] = useState(false);
  const [everydayDiscoveryProgressReady, setEverydayDiscoveryProgressReady] = useState(false);
  const [midAutumnAdventureProgressReady, setMidAutumnAdventureProgressReady] = useState(false);
  const [progressSaveWarning, setProgressSaveWarning] = useState(false);
  const [dinosaurArtSaveWarning, setDinosaurArtSaveWarning] = useState(false);
  const [dinosaurPronunciationSaveWarning, setDinosaurPronunciationSaveWarning] = useState(false);
  const [everydayDiscoverySaveWarning, setEverydayDiscoverySaveWarning] = useState(false);
  const [midAutumnAdventureSaveWarning, setMidAutumnAdventureSaveWarning] = useState(false);
  const [otherSaveWarning, setOtherSaveWarning] = useState(false);
  const saveWarning = progressSaveWarning
    || dinosaurArtSaveWarning
    || dinosaurPronunciationSaveWarning
    || everydayDiscoverySaveWarning
    || midAutumnAdventureSaveWarning
    || otherSaveWarning;
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
        setProgressSaveWarning(true);
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
        setProgressSaveWarning(false);
      } catch {
        setProgressSaveWarning(true);
      }
    }, 0);
    return () => window.clearTimeout(saveTimer);
  }, [progress, progressReady]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(DINOSAUR_ART_PROGRESS_KEY);
        setDinosaurArtProgress(raw
          ? normaliseDinosaurArtProgress(JSON.parse(raw))
          : emptyDinosaurArtProgress());
      } catch {
        setDinosaurArtSaveWarning(true);
      } finally {
        setDinosaurArtProgressReady(true);
      }
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (!dinosaurArtProgressReady) return;
    const saveTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DINOSAUR_ART_PROGRESS_KEY, JSON.stringify(dinosaurArtProgress));
        setDinosaurArtSaveWarning(false);
      } catch {
        setDinosaurArtSaveWarning(true);
      }
    }, 0);
    return () => window.clearTimeout(saveTimer);
  }, [dinosaurArtProgress, dinosaurArtProgressReady]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(DINOSAUR_PRONUNCIATION_PROGRESS_KEY);
        setDinosaurPronunciationProgress(raw
          ? normaliseDinosaurPronunciationProgress(JSON.parse(raw))
          : emptyDinosaurPronunciationProgress());
      } catch {
        setDinosaurPronunciationSaveWarning(true);
      } finally {
        setDinosaurPronunciationProgressReady(true);
      }
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (!dinosaurPronunciationProgressReady) return;
    const saveTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          DINOSAUR_PRONUNCIATION_PROGRESS_KEY,
          JSON.stringify(dinosaurPronunciationProgress),
        );
        setDinosaurPronunciationSaveWarning(false);
      } catch {
        setDinosaurPronunciationSaveWarning(true);
      }
    }, 0);
    return () => window.clearTimeout(saveTimer);
  }, [dinosaurPronunciationProgress, dinosaurPronunciationProgressReady]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(EVERYDAY_DISCOVERY_PROGRESS_KEY);
        setEverydayDiscoveryProgress(raw
          ? normaliseEverydayDiscoveryProgress(JSON.parse(raw))
          : emptyEverydayDiscoveryProgress());
      } catch {
        setEverydayDiscoverySaveWarning(true);
      } finally {
        setEverydayDiscoveryProgressReady(true);
      }
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (!everydayDiscoveryProgressReady) return;
    const saveTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          EVERYDAY_DISCOVERY_PROGRESS_KEY,
          JSON.stringify(everydayDiscoveryProgress),
        );
        setEverydayDiscoverySaveWarning(false);
      } catch {
        setEverydayDiscoverySaveWarning(true);
      }
    }, 0);
    return () => window.clearTimeout(saveTimer);
  }, [everydayDiscoveryProgress, everydayDiscoveryProgressReady]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(MID_AUTUMN_ADVENTURE_PROGRESS_KEY);
        setMidAutumnAdventureProgress(raw
          ? normaliseMidAutumnAdventureProgress(JSON.parse(raw))
          : emptyMidAutumnAdventureProgress());
      } catch {
        setMidAutumnAdventureSaveWarning(true);
      } finally {
        setMidAutumnAdventureProgressReady(true);
      }
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (!midAutumnAdventureProgressReady) return;
    const saveTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          MID_AUTUMN_ADVENTURE_PROGRESS_KEY,
          JSON.stringify(midAutumnAdventureProgress),
        );
        setMidAutumnAdventureSaveWarning(false);
      } catch {
        setMidAutumnAdventureSaveWarning(true);
      }
    }, 0);
    return () => window.clearTimeout(saveTimer);
  }, [midAutumnAdventureProgress, midAutumnAdventureProgressReady]);

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
    setProgressSaveWarning(false);
    setDinosaurArtSaveWarning(false);
    setDinosaurPronunciationSaveWarning(false);
    setEverydayDiscoverySaveWarning(false);
    setMidAutumnAdventureSaveWarning(false);
    setOtherSaveWarning(false);
    try {
      window.localStorage.removeItem(PROGRESS_KEY);
      window.localStorage.removeItem(LEGACY_PROGRESS_KEY);
      window.localStorage.removeItem(DINOSAUR_ART_PROGRESS_KEY);
      window.localStorage.removeItem(DINOSAUR_PRONUNCIATION_PROGRESS_KEY);
      window.localStorage.removeItem(EVERYDAY_DISCOVERY_PROGRESS_KEY);
      window.localStorage.removeItem(MID_AUTUMN_ADVENTURE_PROGRESS_KEY);
    } catch {
      setOtherSaveWarning(true);
    }
    void clearArtPhotos().catch(() => setOtherSaveWarning(true));
    setProgress({ version: 3, books: {} });
    setDinosaurArtProgress(emptyDinosaurArtProgress());
    setDinosaurPronunciationProgress(emptyDinosaurPronunciationProgress());
    setEverydayDiscoveryProgress(emptyEverydayDiscoveryProgress());
    setMidAutumnAdventureProgress(emptyMidAutumnAdventureProgress());
  }, []);

  const openBook = useCallback((book: Book) => {
    const saved = progress.books[book.slug];
    const finished = saved ? bookIsComplete(book, saved) : false;
    const page = finished ? 0 : saved?.lastPage ?? 0;
    updateBookProgress(book.slug, (current) => ({ ...current, lastOpened: Date.now() }));
    navigate({ kind: "reader", bookSlug: book.slug, page });
  }, [navigate, progress.books, updateBookProgress]);

  const book = view.kind === "shelf"
    || view.kind === "hackers-painters"
    || view.kind === "dinosaur-art-lab"
    || view.kind === "dinosaur-pronunciation-lab"
    || view.kind === "everyday-discovery-lab"
    ? undefined
    : BOOKS.find((item) => item.slug === view.bookSlug);

  if (view.kind === "hackers-painters") {
    return (
      <HackersPaintersReader
        unitId={view.unitId}
        onBack={() => navigate({ kind: "shelf" })}
        onHome={() => navigate({ kind: "hackers-painters", unitId: null })}
        onOpenUnit={(unitId) => navigate({ kind: "hackers-painters", unitId })}
      />
    );
  }

  if (view.kind === "everyday-discovery-lab") {
    const openScene = (sceneId: EverydayDiscoverySceneId) => {
      setEverydayDiscoveryProgress((current) => ({
        ...current,
        lastSceneId: sceneId,
      }));
      navigate({ kind: "everyday-discovery-lab", sceneId, itemId: null });
    };
    const openItem = (itemId: EverydayDiscoveryId) => {
      const item = everydayDiscoveryItemById(itemId);
      if (!item) return;
      setEverydayDiscoveryProgress((current) => ({
        ...current,
        lastSceneId: item.sceneId,
        lastItemId: itemId,
      }));
      navigate({ kind: "everyday-discovery-lab", sceneId: item.sceneId, itemId });
    };
    const completeItem = (itemId: EverydayDiscoveryId, spellingAttempts: number) => {
      const item = everydayDiscoveryItemById(itemId);
      if (!item) return;
      setEverydayDiscoveryProgress((current) => {
        const existing = current.items[itemId];
        return {
          ...current,
          lastSceneId: item.sceneId,
          lastItemId: itemId,
          exploredIds: current.exploredIds.includes(itemId)
            ? current.exploredIds
            : [...current.exploredIds, itemId],
          items: {
            ...current.items,
            [itemId]: {
              heardWhole: true,
              heardCoach: true,
              saidIt: true,
              spelledIt: true,
              spellingAttempts: Math.min(99, (existing?.spellingAttempts ?? 0) + spellingAttempts),
              completedAt: existing?.completedAt ?? new Date().toISOString(),
              updatedAt: Date.now(),
            },
          },
        };
      });
    };
    const completeChallenge = (sceneId: EverydayDiscoverySceneId) => {
      setEverydayDiscoveryProgress((current) => ({
        ...current,
        lastSceneId: sceneId,
        completedChallengeIds: current.completedChallengeIds.includes(sceneId)
          ? current.completedChallengeIds
          : [...current.completedChallengeIds, sceneId],
      }));
    };
    return (
      <EverydayDiscoveryLab
        sceneId={view.sceneId}
        itemId={view.itemId}
        exploredIds={everydayDiscoveryProgress.exploredIds}
        completedChallengeIds={everydayDiscoveryProgress.completedChallengeIds}
        lastSceneId={everydayDiscoveryProgress.lastSceneId}
        lastItemId={everydayDiscoveryProgress.lastItemId}
        narrator={narrator}
        onBack={() => navigate({ kind: "shelf" })}
        onHome={() => navigate({ kind: "everyday-discovery-lab", sceneId: null, itemId: null })}
        onOpenScene={openScene}
        onOpenItem={openItem}
        onCompleteItem={completeItem}
        onCompleteChallenge={completeChallenge}
      />
    );
  }

  if (view.kind === "dinosaur-pronunciation-lab") {
    const openDinosaur = (dinosaurId: DinosaurPronunciationId) => {
      setDinosaurPronunciationProgress((current) => ({
        ...current,
        lastDinosaurId: dinosaurId,
      }));
      navigate({ kind: "dinosaur-pronunciation-lab", dinosaurId });
    };
    const markDinosaurExplored = (dinosaurId: DinosaurPronunciationId) => {
      setDinosaurPronunciationProgress((current) => {
        const existing = current.dinosaurs[dinosaurId];
        return {
          ...current,
          lastDinosaurId: dinosaurId,
          exploredIds: current.exploredIds.includes(dinosaurId)
            ? current.exploredIds
            : [...current.exploredIds, dinosaurId],
          dinosaurs: {
            ...current.dinosaurs,
            [dinosaurId]: {
              heardWhole: true,
              heardCoach: true,
              saidIt: true,
              repeatCount: Math.min(99, (existing?.repeatCount ?? 0) + 1),
              completedAt: existing?.completedAt ?? new Date().toISOString(),
              updatedAt: Date.now(),
            },
          },
        };
      });
    };
    return (
      <DinosaurPronunciationLab
        dinosaurId={view.dinosaurId}
        exploredIds={dinosaurPronunciationProgress.exploredIds}
        lastDinosaurId={dinosaurPronunciationProgress.lastDinosaurId}
        narrator={narrator}
        onBack={() => navigate({ kind: "shelf" })}
        onHome={() => navigate({ kind: "dinosaur-pronunciation-lab", dinosaurId: null })}
        onOpenDinosaur={openDinosaur}
        onMarkExplored={markDinosaurExplored}
      />
    );
  }

  if (view.kind === "dinosaur-art-lab") {
    const fromBook = view.fromBookSlug
      ? BOOKS.find((candidate) => candidate.slug === view.fromBookSlug)
      : undefined;
    const backToOrigin = () => {
      if (fromBook) {
        navigate({
          kind: "reader",
          bookSlug: fromBook.slug,
          page: progress.books[fromBook.slug]?.lastPage ?? 0,
        });
      } else {
        navigate({ kind: "shelf" });
      }
    };
    const openDinosaurLesson = (lessonId: DinosaurArtLessonId) => {
      const savedStep = dinosaurArtProgress.lessons[lessonId]?.lastStep ?? 0;
      setDinosaurArtProgress((current) => ({ ...current, lastLessonId: lessonId }));
      navigate({ ...view, lessonId, step: savedStep });
    };
    const changeDinosaurStep = (step: DinosaurArtStep) => {
      const lessonId = view.lessonId;
      if (!lessonId) return;
      setDinosaurArtProgress((current) => ({
        ...current,
        lastLessonId: lessonId,
        lessons: {
          ...current.lessons,
          [lessonId]: {
            ...current.lessons[lessonId],
            lastStep: step,
            updatedAt: Date.now(),
          },
        },
      }));
      navigate({ ...view, step }, true);
    };
    const completeDinosaurLesson = (lessonId: DinosaurArtLessonId) => {
      setDinosaurArtProgress((current) => ({
        ...current,
        lastLessonId: lessonId,
        lessons: {
          ...current.lessons,
          [lessonId]: {
            ...current.lessons[lessonId],
            lastStep: 3,
            completedAt: current.lessons[lessonId]?.completedAt ?? new Date().toISOString(),
            updatedAt: Date.now(),
          },
        },
      }));
    };
    return (
      <DinosaurArtLab
        lessonId={view.lessonId}
        step={view.step}
        progress={dinosaurArtProgress}
        fromBookTitle={fromBook?.title}
        activeSpeechKey={narrator.activeKey}
        onBack={backToOrigin}
        onHome={() => navigate({ ...view, lessonId: null, step: 0 })}
        onOpenLesson={openDinosaurLesson}
        onStepChange={changeDinosaurStep}
        onCompleteLesson={completeDinosaurLesson}
        onSpeak={(text, key) => {
          if (narrator.activeKey === key) narrator.stop();
          else narrator.speak(text, { purpose: "practice", activeKey: key });
        }}
      />
    );
  }

  if (view.kind !== "shelf" && !book) {
    return (
      <Shelf
        progress={progress}
        dinosaurArtProgress={dinosaurArtProgress}
        dinosaurPronunciationProgress={dinosaurPronunciationProgress}
        everydayDiscoveryProgress={everydayDiscoveryProgress}
        narrator={narrator}
        onOpenBook={openBook}
        onOpenWords={(selected) => navigate({ kind: "word-garden", bookSlug: selected.slug })}
        onOpenDinosaurArt={() => navigate({ kind: "dinosaur-art-lab", lessonId: null, step: 0 })}
        onOpenDinosaurPronunciation={() => navigate({ kind: "dinosaur-pronunciation-lab", dinosaurId: null })}
        onOpenEverydayDiscovery={() => navigate({ kind: "everyday-discovery-lab", sceneId: null, itemId: null })}
        onOpenAdultReading={() => navigate({ kind: "hackers-painters", unitId: null })}
        onReset={resetProgress}
        saveWarning={saveWarning}
      />
    );
  }

  if (view.kind === "mid-autumn-adventure" && book) {
    const openMission = (missionId: MidAutumnMissionId) => {
      const savedStep = midAutumnAdventureProgress.missions[missionId]?.lastStep ?? 0;
      setMidAutumnAdventureProgress((current) => ({ ...current, lastMissionId: missionId }));
      navigate({ ...view, missionId, step: savedStep });
    };
    const changeMissionStep = (step: MidAutumnAdventureStep) => {
      const missionId = view.missionId;
      if (!missionId) return;
      setMidAutumnAdventureProgress((current) => ({
        ...current,
        lastMissionId: missionId,
        missions: {
          ...current.missions,
          [missionId]: {
            ...current.missions[missionId],
            lastStep: step,
            updatedAt: Date.now(),
          },
        },
      }));
      navigate({ ...view, step }, true);
    };
    const completeMission = (missionId: MidAutumnMissionId) => {
      setMidAutumnAdventureProgress((current) => ({
        ...current,
        lastMissionId: missionId,
        missions: {
          ...current.missions,
          [missionId]: {
            ...current.missions[missionId],
            lastStep: 3,
            completedAt: current.missions[missionId]?.completedAt ?? new Date().toISOString(),
            updatedAt: Date.now(),
          },
        },
      }));
    };
    return (
      <MoonlightMarketAdventure
        key={view.missionId ?? "home"}
        book={book}
        missionId={view.missionId}
        step={view.step}
        progress={midAutumnAdventureProgress}
        activeSpeechKey={narrator.activeKey}
        onBack={() => navigate({
          kind: "reader",
          bookSlug: book.slug,
          page: progress.books[book.slug]?.lastPage ?? 0,
        })}
        onHome={() => navigate({ ...view, missionId: null, step: 0 })}
        onOpenMission={openMission}
        onStepChange={changeMissionStep}
        onLanternChange={(selectedLanternId) => {
          setMidAutumnAdventureProgress((current) => ({
            ...current,
            selectedLanternId,
          }));
        }}
        onCompleteMission={completeMission}
        onSpeak={(text, key) => {
          if (narrator.activeKey === key) narrator.stop();
          else narrator.speak(text, { purpose: "practice", activeKey: key });
        }}
      />
    );
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
        onArtStudio={artStudioForBook(book.slug)
          ? () => navigate({
              kind: "art-studio",
              bookSlug: book.slug,
              step: bookProgress.artStudio?.lastStep ?? "observe",
              missionId: bookProgress.artStudio?.selectedMission ?? "story-artist",
            })
          : undefined}
        onDinosaurArt={isDinosaurArtBook(book.slug)
          ? () => navigate({
              kind: "dinosaur-art-lab",
              lessonId: null,
              step: 0,
              fromBookSlug: book.slug,
            })
          : undefined}
        onMoonlightMarket={isMidAutumnAdventureBook(book.slug)
          ? (missionId) => {
              const savedStep = missionId
                ? midAutumnAdventureProgress.missions[missionId]?.lastStep ?? 0
                : 0;
              navigate({
                kind: "mid-autumn-adventure",
                bookSlug: MID_AUTUMN_ADVENTURE_BOOK_SLUG,
                missionId,
                step: savedStep,
              });
            }
          : undefined}
      />
    );
  }

  if (view.kind === "art-studio" && book) {
    const studio = artStudioForBook(book.slug);
    if (studio) {
      const bookProgress = progress.books[book.slug] ?? emptyBookProgress();
      const artProgress = bookProgress.artStudio ?? emptyArtStudioProgress();
      const updateArtProgress = (updater: (current: typeof artProgress) => typeof artProgress) => {
        updateBookProgress(book.slug, (current) => ({
          ...current,
          artStudio: updater(current.artStudio ?? emptyArtStudioProgress()),
          lastOpened: Date.now(),
        }));
      };
      return (
        <ArtStudio
          key={`${book.slug}-${view.step}-${view.missionId}`}
          book={book}
          studio={studio}
          step={view.step}
          missionId={view.missionId}
          progress={artProgress}
          onBack={() => navigate({ kind: "reader", bookSlug: book.slug, page: bookProgress.lastPage })}
          onOpenPage={(page) => navigate({ kind: "reader", bookSlug: book.slug, page })}
          onStepChange={(step) => navigate({ ...view, step }, true)}
          onMissionChange={(missionId) => navigate({ ...view, missionId }, true)}
          onProgressChange={updateArtProgress}
        />
      );
    }
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
      dinosaurArtProgress={dinosaurArtProgress}
      dinosaurPronunciationProgress={dinosaurPronunciationProgress}
      everydayDiscoveryProgress={everydayDiscoveryProgress}
      narrator={narrator}
      onOpenBook={openBook}
      onOpenWords={(selected) => navigate({ kind: "word-garden", bookSlug: selected.slug })}
      onOpenDinosaurArt={() => navigate({ kind: "dinosaur-art-lab", lessonId: null, step: 0 })}
      onOpenDinosaurPronunciation={() => navigate({ kind: "dinosaur-pronunciation-lab", dinosaurId: null })}
      onOpenEverydayDiscovery={() => navigate({ kind: "everyday-discovery-lab", sceneId: null, itemId: null })}
      onOpenAdultReading={() => navigate({ kind: "hackers-painters", unitId: null })}
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

function NarrationSettings({ narrator, brief = false }: { narrator: Narrator; brief?: boolean }) {
  const paceDetails = NARRATION_PACES[narrator.pace] ?? NARRATION_PACES.child;

  return (
    <details className={`narration-settings narration-settings--compact ${brief ? "narration-settings--brief" : ""}`}>
      <summary>
        <span aria-hidden="true">🎧</span>
        <span><strong>Story voice</strong><small>{brief ? paceDetails.shortLabel : `${paceDetails.shortLabel} · ${narrator.currentVoiceLabel}`}</small></span>
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
              <span>
                <strong>{brief ? option.shortLabel : option.label}</strong>
                {!brief && <small>{option.description}</small>}
              </span>
            </label>
          ))}
        </fieldset>
        {!brief && <p>Both choices use the same prepared Aoede picture-book teacher. The child version is a separately prepared recording, never a mechanically slowed browser voice.</p>}
      </div>
    </details>
  );
}

function Shelf({
  progress,
  dinosaurArtProgress,
  dinosaurPronunciationProgress,
  everydayDiscoveryProgress,
  narrator,
  onOpenBook,
  onOpenWords,
  onOpenDinosaurArt,
  onOpenDinosaurPronunciation,
  onOpenEverydayDiscovery,
  onOpenAdultReading,
  onReset,
  saveWarning,
}: {
  progress: ProgressStore;
  dinosaurArtProgress: DinosaurArtProgress;
  dinosaurPronunciationProgress: DinosaurPronunciationProgress;
  everydayDiscoveryProgress: EverydayDiscoveryProgress;
  narrator: Narrator;
  onOpenBook: (book: Book) => void;
  onOpenWords: (book: Book) => void;
  onOpenDinosaurArt: () => void;
  onOpenDinosaurPronunciation: () => void;
  onOpenEverydayDiscovery: () => void;
  onOpenAdultReading: () => void;
  onReset: () => void;
  saveWarning: boolean;
}) {
  const completedBooks = BOOKS.filter((book) =>
    bookIsComplete(book, progress.books[book.slug] ?? emptyBookProgress()),
  ).length;
  const completedDinosaurLessons = DINOSAUR_ART_LESSON_IDS.filter((lessonId) =>
    dinosaurArtProgress.lessons[lessonId]?.completedAt,
  ).length;
  const exploredDinosaurNames = dinosaurPronunciationProgress.exploredIds.length;
  const exploredEverydayWords = everydayDiscoveryProgress.exploredIds.length;
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

      <section className="adult-reading-shelf-invite" aria-labelledby="adult-reading-shelf-title">
        <div className="adult-reading-shelf-invite__copy">
          <p className="eyebrow">For grown-ups · 成人精读</p>
          <h2 id="adult-reading-shelf-title">Hackers &amp; Painters — Deep Reading</h2>
          <p>精读 Chapter 2：听段落、拆长句、积累表达，再用英语说出和写出自己的观点。</p>
          <div className="adult-reading-shelf-invite__features">
            <span>6 focused sessions</span>
            <span>English + 中文支架</span>
            <span>Progress on this device</span>
          </div>
          <button className="adult-reading-shelf-invite__button" type="button" onClick={onOpenAdultReading}>
            Open my English studio <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="adult-reading-shelf-invite__mark" aria-hidden="true">
          <span>Chapter</span>
          <strong>02</strong>
          <small>Hackers &amp; Painters</small>
        </div>
      </section>

      <section className="dino-shelf-invite" aria-labelledby="dino-shelf-title">
        <div className="dino-shelf-invite__copy">
          <p className="eyebrow"><span aria-hidden="true">🦴</span> New creative lab</p>
          <h2 id="dino-shelf-title">Dinosaur Art Lab</h2>
          <p>从动态线和身体体块开始，画棘龙、霸王龙、三角龙、腕龙、甲龙和长羽毛的伶盗龙。</p>
          <div><span>6 dinosaurs</span><span>4 drawing steps each</span><span>Dino English</span></div>
          <button className="button button--green" type="button" onClick={onOpenDinosaurArt}>
            Explore the Dinosaur Art Lab <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="dino-shelf-invite__picture" aria-hidden="true">
          <img src={dinosaurArtLessonById("spinosaurus").guideSrc} alt="" />
          <span><strong>{completedDinosaurLessons}</strong> / 6 explored</span>
        </div>
      </section>

      <section
        className="dino-shelf-invite dino-pronunciation-shelf-invite"
        aria-labelledby="dino-pronunciation-shelf-title"
      >
        <div className="dino-shelf-invite__copy">
          <p className="eyebrow"><span aria-hidden="true">🔊</span> New sound lab</p>
          <h2 id="dino-pronunciation-shelf-title">Dinosaur Name Lab</h2>
          <p>听整词、点音节、连起来读，把长长的恐龙英文名字变成会拼的声音积木。</p>
          <div><span>{DINOSAUR_PRONUNCIATION_IDS.length} names</span><span>2 voice speeds</span><span>No scoring</span></div>
          <button className="button button--sun" type="button" onClick={onOpenDinosaurPronunciation}>
            Start the pronunciation lab <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="dino-shelf-invite__picture" aria-hidden="true">
          <img src="/dinosaur-pronunciation/allosaurus.jpg" alt="" />
          <span><strong>{exploredDinosaurNames}</strong> / {DINOSAUR_PRONUNCIATION_IDS.length} names</span>
        </div>
      </section>

      <section
        className="dino-shelf-invite everyday-discovery-shelf-invite"
        aria-labelledby="everyday-discovery-shelf-title"
      >
        <div className="dino-shelf-invite__copy">
          <p className="eyebrow"><span aria-hidden="true">🔎</span> New everyday lab</p>
          <h2 id="everyday-discovery-shelf-title">Everyday Discovery Lab</h2>
          <p>从厨房走到超市、学校和游乐场：看真实图片、听双速发音、读三句英文，再把单词拼出来。</p>
          <div><span>{EVERYDAY_DISCOVERY_SCENE_IDS.length} scenes</span><span>{EVERYDAY_DISCOVERY_IDS.length} words</span><span>{EVERYDAY_DISCOVERY_SCENE_IDS.length} mini missions</span></div>
          <button className="button button--green" type="button" onClick={onOpenEverydayDiscovery}>
            Explore everyday English <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="dino-shelf-invite__picture everyday-discovery-shelf-invite__picture" aria-hidden="true">
          <img src="/everyday-discovery/kitchen/onion.jpg" alt="" />
          <img src="/everyday-discovery/animals/octopus.jpg" alt="" />
          <img src="/everyday-discovery/plants/sunflower.jpg" alt="" />
          <span><strong>{exploredEverydayWords}</strong> / {EVERYDAY_DISCOVERY_IDS.length} words</span>
        </div>
      </section>

      <section className="bookshelf" aria-labelledby="bookshelf-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">My bookshelf</p>
            <h2 id="bookshelf-title">Choose a book</h2>
          </div>
          <p>{BOOKS.length} stories ready to read</p>
        </div>
        {([1, 2, 3] as const).map((level) => {
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
            <h3>P1、P2 与 P3 绘本课程</h3>
            <p>书架按 Primary 1、Primary 2 和 Primary 3 分组。每本书都配有标准版、儿童慢速版朗读，以及五个核心单词和听、说、读、写练习。</p>
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
  onArtStudio,
  onDinosaurArt,
  onMoonlightMarket,
}: {
  book: Book;
  page: number;
  bookProgress: BookProgress;
  narrator: Narrator;
  onPageChange: (page: number) => void;
  onBack: () => void;
  onWords: () => void;
  onArtStudio?: () => void;
  onDinosaurArt?: () => void;
  onMoonlightMarket?: (missionId: MidAutumnMissionId | null) => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const [storyMode, setStoryMode] = useState<"english" | "guide-zh">("english");
  const startX = useRef<number | null>(null);
  const current = book.pages[page];
  const currentSides = current.sides;
  const currentIsSpread = current.layout === "spread";
  const storyGuide = storyGuideForBook(book.slug);
  const artStudio = artStudioForBook(book.slug);
  const artObservation = artStudio?.observations.find((item) => item.pageIndex === page) ?? null;
  const currentGuide = storyGuide?.pages[page] ?? null;
  const guideMode = storyMode === "guide-zh" && Boolean(currentGuide);
  const isLast = page === book.pages.length - 1;
  const pageHasBeenRead = bookProgress.readPages.includes(page);
  const moonlightInvite = onMoonlightMarket
    ? page === 1 || page === 2
      ? {
          missionId: "dinosaur-lantern" as const,
          eyebrow: "Festival art",
          title: "Design a dinosaur lantern",
          copy: "看完老虎和兔子灯笼，再画一盏会发光的恐龙灯笼。",
          icon: "🦖",
        }
      : page === 4 || page === 5 || page === 7
        ? {
            missionId: "find-lee-ling" as const,
            eyebrow: "Picture detective",
            title: "Find Lee Ling",
            copy: "记住兔子灯笼，沿着故事里的线索去找她。",
            icon: "🔎",
          }
        : page === 6
          ? {
              missionId: "market-roleplay" as const,
              eyebrow: "Speak at the market",
              title: "Ask in English",
              copy: "用礼貌英语买灯笼，再向摊主询问 Lee Ling。",
              icon: "🗣️",
            }
          : {
              missionId: null,
              eyebrow: "Optional story adventure",
              title: "Moonlight Market",
              copy: "找线索、说英语、画恐龙灯笼。",
              icon: "🏮",
            }
    : null;
  const stopNarration = narrator.stop;
  const audioSourceFor = narrator.audioSourceFor;

  useEffect(() => {
    if (!pageHasBeenRead) onPageChange(page);
  }, [onPageChange, page, pageHasBeenRead]);

  useEffect(() => {
    const next = book.pages[page + 1];
    const nextGuide = storyGuide?.pages[page + 1];
    if (next) {
      const image = new Image();
      image.src = next.src;
      const nextAudioSrc = storyMode === "guide-zh" ? nextGuide?.audioSrc : next.audioSrc;
      if (nextAudioSrc) {
        const audio = new Audio(audioSourceFor(nextAudioSrc));
        audio.preload = "metadata";
      }
    }
  }, [audioSourceFor, book.pages, page, storyGuide?.pages, storyMode]);

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

  const pageVoiceKey = `${guideMode ? "guide-zh" : "english"}-${book.slug}-${page}`;
  const pageIsSpeaking = narrator.activeKey === pageVoiceKey;
  const sideVoiceKey = (side: "left" | "right") => `english-${book.slug}-${page}-${side}`;
  const leftPageIsSpeaking = narrator.activeKey === sideVoiceKey("left");
  const rightPageIsSpeaking = narrator.activeKey === sideVoiceKey("right");
  const showSideReadAlong = storyMode === "english" && Boolean(currentSides);

  const chooseStoryMode = (mode: "english" | "guide-zh") => {
    narrator.stop();
    setStoryMode(mode);
  };

  const playPage = (targetPage: number) => {
    const target = book.pages[targetPage];
    const targetGuide = storyGuide?.pages[targetPage];
    const targetUsesGuide = storyMode === "guide-zh" && Boolean(targetGuide);
    const targetVoiceKey = `${targetUsesGuide ? "guide-zh" : "english"}-${book.slug}-${targetPage}`;
    if (targetUsesGuide && targetGuide) {
      narrator.speak(targetGuide.narration, {
        purpose: "story",
        activeKey: targetVoiceKey,
        audioSrc: targetGuide.audioSrc,
        preparedOnly: true,
      });
      return;
    }
    if (target?.audioSrc) {
      narrator.speak(target.transcript, {
        purpose: "story",
        activeKey: targetVoiceKey,
        audioSrc: target.audioSrc,
      });
    }
  };

  const playCurrentPage = () => {
    if (pageIsSpeaking) {
      narrator.stop();
      return;
    }
    playPage(page);
  };

  const playPageSide = (side: "left" | "right") => {
    const pageSide = currentSides?.[side];
    const key = sideVoiceKey(side);
    if (narrator.activeKey === key) {
      narrator.stop();
      return;
    }
    if (!pageSide?.transcript.trim() || !pageSide.audioSrc) return;
    narrator.speak(pageSide.transcript, {
      purpose: "story",
      activeKey: key,
      audioSrc: pageSide.audioSrc,
    });
  };

  const movePage = (next: number) => {
    const targetPage = Math.max(0, Math.min(next, book.pages.length - 1));
    stopNarration();
    if (targetPage === page) return;
    onPageChange(targetPage);
  };

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
          {artStudio && (
            <span className={bookProgress.artStudio?.steps.tell ? "is-done" : ""} title="Art Studio">🎨</span>
          )}
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
          <div className="story-page__layout">
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
              {showSideReadAlong && currentSides && (
                <div className="story-page__side-listeners" role="group" aria-label={`Choose a side to hear on page ${page + 1}`}>
                  {(["left", "right"] as const).map((side) => {
                    const pageSide = currentSides[side];
                    const playable = Boolean(pageSide.transcript.trim() && pageSide.audioSrc);
                    const active = side === "left" ? leftPageIsSpeaking : rightPageIsSpeaking;
                    const sideLabel = side === "left" ? "left" : "right";
                    return (
                      <button
                        key={side}
                        className={active ? "is-speaking" : ""}
                        type="button"
                        onClick={() => playPageSide(side)}
                        disabled={!narrator.supported || !playable}
                        aria-label={playable
                          ? `${active ? "Stop reading" : "Hear"} ${sideLabel} page of ${book.title}`
                          : `${side === "left" ? "Left" : "Right"} page is picture only`}
                        aria-pressed={playable ? active : undefined}
                      >
                        <span className="story-page__side-listener-icon" aria-hidden="true">
                          {active ? "■" : playable ? "🔊" : "🖼️"}
                        </span>
                        <span>
                          <strong>{active ? `Stop ${sideLabel} page` : playable ? `Hear ${sideLabel} page` : "Picture only"}</strong>
                          <small>{playable ? (active ? "Tap again to stop" : "Listen and point") : `${side === "left" ? "Left" : "Right"} page`}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <aside className="reader__controls" aria-label="Page listening controls">
              {storyGuide && (
                <div className="story-mode-toggle" role="group" aria-label="Choose story mode">
                  <button
                    type="button"
                    className={storyMode === "english" ? "is-selected" : ""}
                    aria-pressed={storyMode === "english"}
                    onClick={() => chooseStoryMode("english")}
                  >
                    <span aria-hidden="true">🎧</span>
                    <span><strong>English</strong><small>朗读原文</small></span>
                  </button>
                  <button
                    type="button"
                    className={storyMode === "guide-zh" ? "is-selected" : ""}
                    aria-pressed={storyMode === "guide-zh"}
                    onClick={() => chooseStoryMode("guide-zh")}
                  >
                    <span aria-hidden="true">🧭</span>
                    <span><strong>中文讲绘本</strong><small>边讲边学</small></span>
                  </button>
                </div>
              )}
              <div className="reader__tools">
                <button
                  className={`listen-button ${pageIsSpeaking ? "is-speaking" : ""}`}
                  type="button"
                  onClick={playCurrentPage}
                  disabled={!narrator.supported || (guideMode ? !currentGuide?.audioSrc : !current.audioSrc)}
                >
                  <span className="listen-button__icon" aria-hidden="true">{pageIsSpeaking ? "■" : "🔊"}</span>
                  <span>
                    <strong>{pageIsSpeaking ? (guideMode ? "停止讲解" : "Stop") : guideMode ? "听中文讲绘本" : current.audioSrc ? (currentIsSpread ? "Hear both pages" : "Hear this page") : "Picture page"}</strong>
                    {guideMode && !pageIsSpeaking && <small>中文理解 · 完整 English · 跟读</small>}
                  </span>
                </button>
              </div>
              {guideMode && currentGuide ? (
                <section className="story-guide-cue" aria-label={`Chinese story guide for page ${page + 1}`}>
                  <span className="story-guide-cue__coverage">✓ 本页英文完整朗读</span>
                  <span className="story-guide-cue__eyebrow">Repeat after me</span>
                  <strong>{currentGuide.keyEnglish}</strong>
                  {currentGuide.prompt && <p><span aria-hidden="true">💭</span>{currentGuide.prompt}</p>}
                  <details>
                    <summary>查看双语讲读内容</summary>
                    <div>
                      <small>先看图</small>
                      <p>{currentGuide.introZh}</p>
                      <small>English on this page</small>
                      <p lang="en">{currentGuide.englishPassage}</p>
                      <small>中文重点</small>
                      <p>{currentGuide.explanationZh}</p>
                    </div>
                  </details>
                </section>
              ) : (
                <NarrationSettings narrator={narrator} brief />
              )}
              {onArtStudio && (
                <section className={`art-reader-invite ${artObservation ? "is-observation" : ""}`}>
                  <span className="art-reader-invite__icon" aria-hidden="true">🎨</span>
                  <div>
                    <small>{artObservation ? `${artObservation.label} · Art eye` : "Optional creative mission"}</small>
                    <strong>{artObservation ? artObservation.title : "Art Studio"}</strong>
                    <p>{artObservation ? artObservation.question : "动作、构图和英文表达"}</p>
                  </div>
                  <button type="button" onClick={onArtStudio}>{artObservation ? "Look closer" : "Open"} <span aria-hidden="true">→</span></button>
                </section>
              )}
              {onDinosaurArt && (
                <section className="dino-reader-invite">
                  <span aria-hidden="true">🦕</span>
                  <div><small>Optional art lab</small><strong>Draw more dinosaurs</strong><p>六种身体结构 · 四步跟画 · Dino English</p></div>
                  <button type="button" onClick={onDinosaurArt}>Explore <span aria-hidden="true">→</span></button>
                </section>
              )}
              {moonlightInvite && (
                <section className="moonlight-reader-invite">
                  <span aria-hidden="true">{moonlightInvite.icon}</span>
                  <div>
                    <small>{moonlightInvite.eyebrow}</small>
                    <strong>{moonlightInvite.title}</strong>
                    <p>{moonlightInvite.copy}</p>
                  </div>
                  <button type="button" onClick={() => onMoonlightMarket?.(moonlightInvite.missionId)}>
                    Start <span aria-hidden="true">→</span>
                  </button>
                </section>
              )}
            </aside>
          </div>

          {isLast && (
            <div className="quest-invite">
              <span className="quest-invite__plant" aria-hidden="true">🌱</span>
              <div><small>You finished the story!</small><strong>Ready to grow five word flowers?</strong></div>
              <button className="button button--green" type="button" onClick={onWords}>Grow my Word Garden <span aria-hidden="true">→</span></button>
            </div>
          )}
          {isLast && onArtStudio && (
            <div className="art-finish-invite">
              <span aria-hidden="true">🎨</span>
              <div><small>Make the story move</small><strong>Ready for an Art Studio adventure?</strong><p>观察动作，画三格故事，或者为恐龙设计自行车。</p></div>
              <button className="button" type="button" onClick={onArtStudio}>Start Art Studio <span aria-hidden="true">→</span></button>
            </div>
          )}
          {isLast && onDinosaurArt && (
            <div className="dino-finish-invite">
              <span aria-hidden="true">🦖</span>
              <div><small>Dinosaur Art Lab</small><strong>Want to draw six different dinosaurs?</strong><p>从骨架线到身体结构，再加入你自己的动作和场景。</p></div>
              <button className="button" type="button" onClick={onDinosaurArt}>Choose a dinosaur <span aria-hidden="true">→</span></button>
            </div>
          )}
          {isLast && onMoonlightMarket && (
            <div className="moonlight-finish-invite">
              <span aria-hidden="true">🏮</span>
              <div>
                <small>The story continues</small>
                <strong>Enter the Moonlight Market</strong>
                <p>寻找 Lee Ling、开口说夜市英语，再设计自己的恐龙灯笼。</p>
              </div>
              <button className="button" type="button" onClick={() => onMoonlightMarket(null)}>
                Start adventure <span aria-hidden="true">→</span>
              </button>
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
