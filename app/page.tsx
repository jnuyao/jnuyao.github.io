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
  dinosaurCloseReadingPageFor,
  type DinosaurCloseReadingBlock,
} from "./dinosaur-close-reading-data";
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
} from "./progress";
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
  | { kind: "art-studio"; bookSlug: string; step: ArtStep; missionId: ArtMissionId };

const NARRATION_SETTINGS_KEY = "story-garden-narration-v1";
function bookIsComplete(book: Book, progress: BookProgress): boolean {
  return book.pages.every((_, page) => progress.readPages.includes(page));
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
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

type SpeakOptions = {
  purpose?: NarrationPurpose;
  activeKey?: string;
  audioSrc?: string;
  preparedOnly?: boolean;
  onComplete?: () => void;
  onError?: () => void;
};

function readNarrationSettings(): { pace: NarrationPace } {
  try {
    const stored = JSON.parse(window.localStorage.getItem(NARRATION_SETTINGS_KEY) ?? "null");
    return { pace: normaliseNarrationPace(stored?.pace) };
  } catch {
    return { pace: "child" };
  }
}

function configurePreparedAudio(
  audio: HTMLAudioElement,
  source: string,
  pace: NarrationPace,
  finish: (completed?: boolean, failed?: boolean) => void,
  onError: () => void,
) {
  audio.onended = () => finish(true);
  audio.onerror = onError;
  audio.src = preparedAudioSource(source, pace);
  audio.preload = "auto";
  audio.playbackRate = 1;
  audio.preservesPitch = true;
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
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
    }
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
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    }
    setSpeaking(true);
    setActiveKey(key);

    let settled = false;
    const finish = (completed = false, failed = false) => {
      if (settled || capturedRun !== narrationRunRef.current) return;
      settled = true;
      currentUtteranceRef.current = null;
      setSpeaking(false);
      setActiveKey(null);
      if (completed) options.onComplete?.();
      if (failed) options.onError?.();
    };

    let fallbackStarted = false;
    const playSpeechFallback = () => {
      if (fallbackStarted) return;
      fallbackStarted = true;
      if (capturedRun !== narrationRunRef.current) return;
      currentAudioRef.current?.pause();
      if (!("speechSynthesis" in window)) {
        setSupported(false);
        finish(false, true);
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
          finish(true);
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
          finish(false, true);
        };
        window.speechSynthesis.speak(utterance);
      };

      if (segments.length) playSegment(0);
      else finish(false, true);
    };

    if (options.audioSrc && "Audio" in window) {
      // Reusing one media element makes a user-started bedtime playlist much
      // more reliable on mobile browsers than creating a new element per page.
      const audio = currentAudioRef.current ?? new Audio();
      currentAudioRef.current = audio;
      const preparedAudioError = options.preparedOnly
        ? () => finish(false, true)
        : playSpeechFallback;
      configurePreparedAudio(audio, options.audioSrc, pace, finish, preparedAudioError);
      if (options.preparedOnly) {
        audio.play().catch(() => finish(false, true));
      } else {
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

  return (
    <Shelf
      progress={progress}
      dinosaurArtProgress={dinosaurArtProgress}
      dinosaurPronunciationProgress={dinosaurPronunciationProgress}
      everydayDiscoveryProgress={everydayDiscoveryProgress}
      narrator={narrator}
      onOpenBook={openBook}
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

function NarrationSettings({
  narrator,
  brief = false,
  onPaceChange,
}: {
  narrator: Narrator;
  brief?: boolean;
  onPaceChange?: () => void;
}) {
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
                  onPaceChange?.();
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
        <div className="garden-counter" aria-label={`${completedBooks} of ${BOOKS.length} stories read`}>
          <span aria-hidden="true">📚</span>
          <strong>{completedBooks}</strong>
          <span className="garden-counter__of">/ {BOOKS.length} stories read</span>
        </div>
      </header>

      <section className="bookshelf bookshelf--first" aria-labelledby="bookshelf-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">My bookshelf</p>
            <h1 id="bookshelf-title">Choose a book</h1>
          </div>
          <div className="bookshelf-first__intro">
            <p>{BOOKS.length} stories ready to read and hear</p>
            {latestBook && (
              <button className="text-button" type="button" onClick={() => onOpenBook(latestBook)}>
                Continue {latestBook.title} →
              </button>
            )}
          </div>
        </div>
        {([1, 2, 3] as const).map((level) => {
          const levelBooks = BOOKS.filter((book) => book.level === level);
          if (!levelBooks.length) return null;
          return (
            <section className="level-shelf" key={level} aria-labelledby={`level-${level}-title`}>
              <div className="level-shelf__heading">
                <h2 id={`level-${level}-title`}>Primary {level}</h2>
                <span>{levelBooks.length} picture books</span>
              </div>
              <div className="book-grid">
                {levelBooks.map((book) => (
                  <BookCard
                    key={book.slug}
                    book={book}
                    progress={progress.books[book.slug] ?? emptyBookProgress()}
                    onOpen={() => onOpenBook(book)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </section>

      <div className="shelf-more-heading">
        <p className="eyebrow">More to explore · 选读内容</p>
        <h2>Learning labs for another day</h2>
      </div>

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
            <p>建议每次 8–12 分钟：孩子先选一本绘本，再逐页看图、听故事。需要跟读时可以分别听左页或右页；睡前可点击 Play whole story，网站会读完一页后自动翻页。</p>
            <p>阅读进度只保存在当前设备。</p>
            <NarrationSettings narrator={narrator} />
          </div>
          <div>
            <h3>P1、P2 与 P3 绘本课程</h3>
            <p>书架按 Primary 1、Primary 2 和 Primary 3 分组。每本书都配有标准版与儿童慢速版朗读。</p>
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
}: {
  book: Book;
  progress: BookProgress;
  onOpen: () => void;
}) {
  const readPages = progress.readPages.filter((page) => page >= 0 && page < book.pages.length).length;
  const complete = readPages === book.pages.length;
  const hasStarted = readPages > 0;
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
        {complete && <span className="book-card__bloom" aria-label="Story finished">✓</span>}
      </button>
      <div className="book-card__body">
        <div className="book-card__term">Term {book.term} <span>•</span> {book.focus[0]}</div>
        <h3>{book.title}</h3>
        <div className="book-card__story-progress" aria-label={`${readPages} of ${book.pages.length} pages read`}>
          <div aria-hidden="true"><span style={{ width: `${(readPages / book.pages.length) * 100}%` }} /></div>
          <span><strong>{readPages} / {book.pages.length} pages</strong><small>{complete ? "Story finished" : "Read and listen"}</small></span>
        </div>
        <div className="book-card__actions">
          <button className="book-card__button" type="button" onClick={onOpen}>
            {label} <span aria-hidden="true">→</span>
          </button>
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
  onArtStudio?: () => void;
  onDinosaurArt?: () => void;
  onMoonlightMarket?: (missionId: MidAutumnMissionId | null) => void;
}) {
  const [storyMode, setStoryMode] = useState<"english" | "guide-zh">("english");
  const [closeReadingEnabled, setCloseReadingEnabled] = useState(false);
  const [bedtimeAutoReading, setBedtimeAutoReading] = useState(false);
  const [bedtimeFinished, setBedtimeFinished] = useState(false);
  const [bedtimeError, setBedtimeError] = useState(false);
  const startX = useRef<number | null>(null);
  const bedtimeRunRef = useRef(0);
  const bedtimeTimerRef = useRef<number | null>(null);
  const current = book.pages[page];
  const currentSides = current.sides;
  const currentIsSpread = current.layout === "spread";
  const storyGuide = storyGuideForBook(book.slug);
  const artStudio = artStudioForBook(book.slug);
  const artObservation = artStudio?.observations.find((item) => item.pageIndex === page) ?? null;
  const currentGuide = storyGuide?.pages[page] ?? null;
  const closeReadingPage = dinosaurCloseReadingPageFor(book.slug, page);
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

  const clearBedtimeTimer = useCallback(() => {
    if (bedtimeTimerRef.current !== null) {
      window.clearTimeout(bedtimeTimerRef.current);
      bedtimeTimerRef.current = null;
    }
  }, []);

  const stopBedtimeAutoReading = useCallback(() => {
    bedtimeRunRef.current += 1;
    clearBedtimeTimer();
    setBedtimeAutoReading(false);
    setBedtimeFinished(false);
    setBedtimeError(false);
    stopNarration();
  }, [clearBedtimeTimer, stopNarration]);

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
        audio.preload = bedtimeAutoReading ? "auto" : "metadata";
      }
    }
  }, [audioSourceFor, bedtimeAutoReading, book.pages, page, storyGuide?.pages, storyMode]);

  useEffect(() => {
    const stopForBrowserNavigation = () => stopBedtimeAutoReading();
    window.addEventListener("popstate", stopForBrowserNavigation);
    return () => window.removeEventListener("popstate", stopForBrowserNavigation);
  }, [stopBedtimeAutoReading]);

  useEffect(() => () => {
    bedtimeRunRef.current += 1;
    clearBedtimeTimer();
    stopNarration();
  }, [clearBedtimeTimer, stopNarration]);

  const pageVoiceKey = `${guideMode ? "guide-zh" : "english"}-${book.slug}-${page}`;
  const pageIsSpeaking = narrator.activeKey === pageVoiceKey;
  const sideVoiceKey = (side: "left" | "right") => `english-${book.slug}-${page}-${side}`;
  const leftPageIsSpeaking = narrator.activeKey === sideVoiceKey("left");
  const rightPageIsSpeaking = narrator.activeKey === sideVoiceKey("right");
  const showSideReadAlong = storyMode === "english" && Boolean(currentSides);
  const closeReadingVoiceKey = (blockId: string) => `close-reading-${book.slug}-${page}-${blockId}`;
  const activeCloseReadingBlock = closeReadingPage?.blocks.find(
    (block) => narrator.activeKey === closeReadingVoiceKey(block.id),
  ) ?? null;

  const chooseStoryMode = (mode: "english" | "guide-zh") => {
    stopBedtimeAutoReading();
    setStoryMode(mode);
  };

  function finishBedtimeStory(targetPage: number, bedtimeRun: number) {
    if (bedtimeRun !== bedtimeRunRef.current) return;
    if (targetPage >= book.pages.length - 1) {
      bedtimeRunRef.current += 1;
      clearBedtimeTimer();
      setBedtimeAutoReading(false);
      setBedtimeFinished(true);
      setBedtimeError(false);
    }
  }

  function failBedtimeStory(bedtimeRun: number) {
    if (bedtimeRun !== bedtimeRunRef.current) return;
    bedtimeRunRef.current += 1;
    clearBedtimeTimer();
    setBedtimeAutoReading(false);
    setBedtimeFinished(false);
    setBedtimeError(true);
  }

  function continueBedtimeStory(targetPage: number, bedtimeRun: number) {
    if (bedtimeRun !== bedtimeRunRef.current) return;
    if (targetPage >= book.pages.length - 1) {
      finishBedtimeStory(targetPage, bedtimeRun);
      return;
    }

    const nextPage = targetPage + 1;
    clearBedtimeTimer();
    bedtimeTimerRef.current = window.setTimeout(() => {
      if (bedtimeRun !== bedtimeRunRef.current) return;
      onPageChange(nextPage);
      // Let the new picture appear before the narrator begins the next page.
      bedtimeTimerRef.current = window.setTimeout(() => {
        if (bedtimeRun !== bedtimeRunRef.current) return;
        playPage(nextPage, bedtimeRun);
      }, 260);
    }, 700);
  }

  function playPage(targetPage: number, bedtimeRun?: number) {
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
        onComplete: bedtimeRun === undefined
          ? undefined
          : () => continueBedtimeStory(targetPage, bedtimeRun),
        onError: bedtimeRun === undefined
          ? undefined
          : () => failBedtimeStory(bedtimeRun),
      });
      return;
    }
    if (target?.audioSrc) {
      narrator.speak(target.transcript, {
        purpose: "story",
        activeKey: targetVoiceKey,
        audioSrc: target.audioSrc,
        onComplete: bedtimeRun === undefined
          ? undefined
          : () => continueBedtimeStory(targetPage, bedtimeRun),
        onError: bedtimeRun === undefined
          ? undefined
          : () => failBedtimeStory(bedtimeRun),
      });
      return;
    }
    if (bedtimeRun !== undefined) {
      // Picture-only pages stay on screen briefly, then the story continues.
      clearBedtimeTimer();
      bedtimeTimerRef.current = window.setTimeout(
        () => continueBedtimeStory(targetPage, bedtimeRun),
        1400,
      );
    }
  }

  const startBedtimeStory = () => {
    clearBedtimeTimer();
    stopNarration();
    const bedtimeRun = ++bedtimeRunRef.current;
    const startPage = bedtimeFinished ? 0 : page;
    setBedtimeAutoReading(true);
    setBedtimeFinished(false);
    setBedtimeError(false);
    if (startPage !== page) onPageChange(startPage);
    playPage(startPage, bedtimeRun);
  };

  const toggleBedtimeStory = () => {
    if (bedtimeAutoReading) stopBedtimeAutoReading();
    else startBedtimeStory();
  };

  const playCurrentPage = () => {
    if (bedtimeAutoReading) {
      stopBedtimeAutoReading();
      return;
    }
    if (pageIsSpeaking) {
      narrator.stop();
      return;
    }
    playPage(page);
  };

  const playPageSide = (side: "left" | "right") => {
    const pageSide = currentSides?.[side];
    const key = sideVoiceKey(side);
    if (bedtimeAutoReading) stopBedtimeAutoReading();
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

  const toggleCloseReading = () => {
    stopBedtimeAutoReading();
    narrator.stop();
    setCloseReadingEnabled((enabled) => !enabled);
  };

  const playCloseReadingBlock = (block: DinosaurCloseReadingBlock) => {
    const key = closeReadingVoiceKey(block.id);
    if (bedtimeAutoReading) stopBedtimeAutoReading();
    if (narrator.activeKey === key) {
      narrator.stop();
      return;
    }
    narrator.speak(block.speechText ?? block.text, {
      purpose: "story",
      activeKey: key,
      audioSrc: block.audioSrc,
      preparedOnly: true,
    });
  };

  const movePage = useCallback((next: number) => {
    const targetPage = Math.max(0, Math.min(next, book.pages.length - 1));
    stopBedtimeAutoReading();
    stopNarration();
    if (targetPage === page) return;
    setCloseReadingEnabled(false);
    onPageChange(targetPage);
  }, [book.pages.length, onPageChange, page, stopBedtimeAutoReading, stopNarration]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && page > 0) movePage(page - 1);
      if (event.key === "ArrowRight" && page < book.pages.length - 1) movePage(page + 1);
      if (event.key === "Home") movePage(0);
      if (event.key === "End") movePage(book.pages.length - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [book.pages.length, movePage, page]);

  const exitReader = () => {
    stopBedtimeAutoReading();
    onBack();
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
    <main
      className={`reader${book.slug === "dinosaur-david-lambert" ? " reader--reference-book" : ""}`}
      style={{ "--book-colour": book.colour } as CSSProperties}
    >
      <header className="reader__header">
        <button className="round-button" type="button" onClick={exitReader} aria-label="Back to my bookshelf">←</button>
        <div className="reader__title">
          <span>Now reading</span>
          <h1>{book.title}</h1>
        </div>
        <div className="reader__mission-dots" aria-label="Story progress">
          <span aria-hidden="true">📖</span>
          <strong>{page + 1} / {book.pages.length}</strong>
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
          <span aria-hidden="true">←</span>
        </button>

        <section className="story-page" aria-label={`Page ${page + 1} of ${book.pages.length}`}>
          <div className="story-page__layout">
            <div className="story-page__paper">
              <div className="story-page__image-stage">
                <div className="story-page__image-button">
                  <img
                    key={current.src}
                    src={current.src}
                    alt={`Page ${page + 1} of ${book.title}`}
                    draggable={false}
                    decoding="async"
                  />
                </div>
                {closeReadingEnabled && closeReadingPage && (
                  <div className="close-reading-layer" role="group" aria-label={`Close reading audio blocks for printed pages ${closeReadingPage.printedPages}`}>
                    {closeReadingPage.blocks.map((block, index) => {
                      const active = activeCloseReadingBlock?.id === block.id;
                      return (
                        <button
                          key={block.id}
                          className={`close-reading-hotspot${active ? " is-speaking" : ""}`}
                          type="button"
                          style={{
                            "--block-left": `${block.rect.left}%`,
                            "--block-top": `${block.rect.top}%`,
                            "--block-width": `${block.rect.width}%`,
                            "--block-height": `${block.rect.height}%`,
                          } as CSSProperties}
                          onClick={(event) => {
                            event.stopPropagation();
                            playCloseReadingBlock(block);
                          }}
                          aria-label={`${active ? "Stop" : "Hear"} block ${index + 1}: ${block.title}`}
                          aria-pressed={active}
                          title={`${index + 1}. ${block.title}`}
                        >
                          <span aria-hidden="true">{active ? "■" : index + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {closeReadingEnabled && closeReadingPage && (
                <div className="close-reading-hint" role="status">
                  <span aria-hidden="true">🔎</span>
                  <span>
                    <strong>{activeCloseReadingBlock ? activeCloseReadingBlock.title : "精读模式已开启"}</strong>
                    <small>{activeCloseReadingBlock ? "正在播放 · 再点一次可停止" : `点击书页上的编号框，逐块听英文 · 共 ${closeReadingPage.blocks.length} 块`}</small>
                  </span>
                </div>
              )}
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
                {closeReadingPage && (
                  <button
                    className={`listen-button close-reading-toggle${closeReadingEnabled ? " is-selected" : ""}`}
                    type="button"
                    onClick={toggleCloseReading}
                    disabled={!narrator.supported}
                    aria-pressed={closeReadingEnabled}
                  >
                    <span className="listen-button__icon" aria-hidden="true">{closeReadingEnabled ? "×" : "🔎"}</span>
                    <span>
                      <strong>{closeReadingEnabled ? "退出精读" : "精读这一页"}</strong>
                      <small>点击每块文字单独听</small>
                    </span>
                  </button>
                )}
                <button
                  className={`listen-button bedtime-button ${bedtimeAutoReading ? "is-speaking" : ""}`}
                  type="button"
                  onClick={toggleBedtimeStory}
                  disabled={!narrator.supported}
                  aria-pressed={bedtimeAutoReading}
                  aria-label={bedtimeAutoReading ? "Stop bedtime story" : "Play whole story with automatic page turns"}
                >
                  <span className="listen-button__icon" aria-hidden="true">{bedtimeAutoReading ? "■" : "🌙"}</span>
                  <span>
                    <strong>{bedtimeAutoReading ? "Stop bedtime story" : bedtimeFinished ? "Play story again" : "Play whole story"}</strong>
                    <small>{bedtimeAutoReading
                      ? `Auto-reading · Page ${page + 1} / ${book.pages.length}`
                      : bedtimeFinished
                        ? "Story finished · 从头再听"
                        : bedtimeError
                          ? "Audio paused · Tap to try again"
                          : `自动翻页朗读 · From page ${page + 1}`}</small>
                  </span>
                </button>
              </div>
              {(bedtimeFinished || bedtimeError) && (
                <p className={`bedtime-status ${bedtimeError ? "is-error" : ""}`} role="status">
                  <span aria-hidden="true">{bedtimeError ? "☁️" : "🌙"}</span>
                  {bedtimeError ? "朗读暂时中断了，可以点按钮重试。" : "Story finished · 故事讲完了"}
                </p>
              )}
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
                <NarrationSettings narrator={narrator} brief onPaceChange={stopBedtimeAutoReading} />
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
            <div className="story-finish-actions">
              <div><small>You finished the story!</small><strong>Would you like to read it again?</strong></div>
              <div>
                <button className="button button--light" type="button" onClick={() => movePage(0)}>↻ Read again</button>
                <button className="button button--green" type="button" onClick={exitReader}>Choose another book <span aria-hidden="true">→</span></button>
              </div>
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
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <footer className="reader__footer">
        <button type="button" onClick={() => movePage(page - 1)} disabled={page === 0} aria-label="Previous page">←</button>
        {bedtimeAutoReading ? (
          <button className="bedtime-footer-status" type="button" onClick={stopBedtimeAutoReading} aria-label="Stop bedtime story">
            <span aria-hidden="true">■</span>
            <strong>Auto-reading {page + 1} / {book.pages.length}</strong>
          </button>
        ) : (
          <div className="page-progress">
            <div><span style={{ width: `${((page + 1) / book.pages.length) * 100}%` }} /></div>
            <strong>Page {page + 1} <span>of {book.pages.length}</span></strong>
          </div>
        )}
        <button type="button" onClick={() => movePage(page + 1)} disabled={isLast} aria-label="Next page">→</button>
      </footer>
      <p className="sr-only" aria-live="polite">
        {bedtimeAutoReading
          ? `Auto-reading page ${page + 1} of ${book.pages.length}`
          : bedtimeFinished
            ? "Story finished"
            : `Page ${page + 1} of ${book.pages.length}`}
      </p>
    </main>
  );
}
