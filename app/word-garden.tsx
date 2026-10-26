"use client";

/* eslint-disable @next/next/no-img-element -- story scans are local, pre-sized course assets */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import type { Book } from "./book-data";
import {
  wordAudioSource,
  wordsForBook,
  type VocabularyWord,
} from "./word-data";
import type { NarrationPace, NarrationPurpose } from "./narration";
import {
  wordIsMastered,
  type SpellingResult,
  type WordPracticeProgress,
  type WordResult,
} from "./word-progress";

type NarratorLike = {
  speak: (
    text: string,
    options?: { purpose?: NarrationPurpose; activeKey?: string; audioSrc?: string },
  ) => void;
  stop: () => void;
  speaking: boolean;
  activeKey: string | null;
  supported: boolean;
  pace: NarrationPace;
  setPace: (pace: NarrationPace) => void;
  currentVoiceLabel: string;
};

type WordGardenProps = {
  book: Book;
  progress: WordPracticeProgress;
  narrator: NarratorLike;
  onBack: () => void;
  onOpenStory: (page: number) => void;
  onConfirmRead: (wordId: string) => void;
  onFinishSpelling: (
    wordId: string,
    result: Exclude<SpellingResult, "new">,
    attempts: number,
  ) => void;
  onSpellingMiss: (wordId: string) => void;
  onContinue: () => void;
};

type Phase = "intro" | "learn" | "spell" | "complete";

const emptyResult = (): WordResult => ({
  readConfirmed: false,
  spelling: "new",
  attempts: 0,
});

export function WordGarden({
  book,
  progress,
  narrator,
  onBack,
  onOpenStory,
  onConfirmRead,
  onFinishSpelling,
  onSpellingMiss,
  onContinue,
}: WordGardenProps) {
  const words = wordsForBook(book.slug);
  const [phase, setPhase] = useState<Phase>("intro");
  const [learnQueue, setLearnQueue] = useState<number[]>([]);
  const [learnPosition, setLearnPosition] = useState(0);
  const [spellQueue, setSpellQueue] = useState<number[]>([]);
  const [spellPosition, setSpellPosition] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const stopNarration = narrator.stop;
  const masteredCount = words.filter((word) => wordIsMastered(progress.words[word.id])).length;
  const readCount = words.filter((word) => progress.words[word.id]?.readConfirmed).length;
  const spellingCount = words.filter((word) => {
    const status = progress.words[word.id]?.spelling;
    return status === "correct";
  }).length;

  useEffect(() => () => stopNarration(), [stopNarration]);

  const start = (forceReview = false) => {
    narrator.stop();
    const missingRead = words
      .map((word, index) => ({ word, index }))
      .filter(({ word }) => !progress.words[word.id]?.readConfirmed)
      .map(({ index }) => index);
    const review = forceReview || (missingRead.length === 0 && masteredCount === words.length);
    setReviewMode(review);
    setLearnQueue(review ? words.map((_, index) => index) : missingRead);
    setLearnPosition(0);

    if (review || missingRead.length > 0) {
      setPhase("learn");
      return;
    }

    const missingSpell = words
      .map((word, index) => ({ word, index }))
      .filter(({ word }) => progress.words[word.id]?.spelling !== "correct")
      .map(({ index }) => index);
    setSpellQueue(missingSpell);
    setSpellPosition(0);
    setPhase(missingSpell.length ? "spell" : "complete");
  };

  const moveFromLearningToSpelling = () => {
    const missingSpell = words
      .map((word, index) => ({ word, index }))
      .filter(({ word }) => {
        if (reviewMode) return true;
        return progress.words[word.id]?.spelling !== "correct";
      })
      .map(({ index }) => index);
    setSpellQueue(missingSpell);
    setSpellPosition(0);
    setPhase(missingSpell.length ? "spell" : "complete");
  };

  const finishLearningWord = (wordId: string) => {
    onConfirmRead(wordId);
    if (learnPosition + 1 < learnQueue.length) {
      setLearnPosition((position) => position + 1);
    } else {
      moveFromLearningToSpelling();
    }
  };

  const finishSpellingWord = (
    wordId: string,
    result: Exclude<SpellingResult, "new">,
    attempts: number,
  ) => {
    onFinishSpelling(wordId, result, attempts);
    if (spellPosition + 1 < spellQueue.length) {
      setSpellPosition((position) => position + 1);
    } else {
      setPhase("complete");
    }
  };

  const currentLearnWord = words[learnQueue[learnPosition] ?? 0];
  const currentSpellWord = words[spellQueue[spellPosition] ?? 0];

  return (
    <main className="word-garden" style={{ "--book-colour": book.colour } as React.CSSProperties}>
      <header className="word-garden__header">
        <button className="round-button" type="button" onClick={onBack} aria-label="Back to my bookshelf">←</button>
        <div className="word-garden__book">
          <img src={book.cover} alt="" />
          <span><small>Word Garden · 单词花园</small><strong>{book.title}</strong></span>
        </div>
        <div className="word-garden__counter" aria-label={`${masteredCount} of ${words.length} words mastered`}>
          <span aria-hidden="true">🌱</span><strong>{masteredCount}</strong> / {words.length}
        </div>
      </header>

      <WordPath phase={phase} readCount={readCount} spellingCount={spellingCount} total={words.length} />
      <div className="word-speed" role="group" aria-label="Choose word pronunciation speed">
        <span><b aria-hidden="true">🎧</b> Word voice</span>
        <button type="button" aria-pressed={narrator.pace === "child"} onClick={() => narrator.setPace("child")}>🐢 Child slow · 儿童慢速</button>
        <button type="button" aria-pressed={narrator.pace === "standard"} onClick={() => narrator.setPace("standard")}>▶ Standard · 标准版</button>
      </div>
      <p className="sr-only" aria-live="polite">
        {phase === "learn" && currentLearnWord ? `Learning word ${learnPosition + 1}: ${currentLearnWord.word}.` : ""}
        {phase === "spell" && currentSpellWord ? `Spelling word ${spellPosition + 1}. Listen, then build it.` : ""}
        {phase === "complete" ? "This Word Garden round is complete." : ""}
      </p>

      {phase === "intro" && (
        <WordGardenIntro
          book={book}
          words={words}
          progress={progress}
          masteredCount={masteredCount}
          onStart={() => start(false)}
          onOpenStory={() => onOpenStory(0)}
        />
      )}

      {phase === "learn" && currentLearnWord && (
        <LearnWord
          key={`learn-${currentLearnWord.id}-${learnPosition}`}
          book={book}
          word={currentLearnWord}
          position={learnPosition + 1}
          total={learnQueue.length}
          narrator={narrator}
          onOpenStory={() => onOpenStory(currentLearnWord.pageIndex)}
          onDone={() => finishLearningWord(currentLearnWord.id)}
        />
      )}

      {phase === "spell" && currentSpellWord && (
        <SpellWord
          key={`spell-${currentSpellWord.id}-${spellPosition}`}
          bookSlug={book.slug}
          word={currentSpellWord}
          position={spellPosition + 1}
          total={spellQueue.length}
          narrator={narrator}
          onMiss={() => onSpellingMiss(currentSpellWord.id)}
          onDone={(result, attempts) => finishSpellingWord(currentSpellWord.id, result, attempts)}
        />
      )}

      {phase === "complete" && (
        <WordGardenComplete
          words={words}
          progress={progress}
          reviewMode={reviewMode}
          onReview={() => start(masteredCount === words.length)}
          onContinue={onContinue}
        />
      )}
    </main>
  );
}

function WordPath({
  phase,
  readCount,
  spellingCount,
  total,
}: {
  phase: Phase;
  readCount: number;
  spellingCount: number;
  total: number;
}) {
  const step = phase === "intro" || phase === "learn" ? 0 : phase === "spell" ? 1 : 2;
  return (
    <nav className="word-path" aria-label="Hear, say and spell learning path">
      {[
        ["🔊", "Hear, read & say", `${readCount}/${total}`],
        ["🔤", "Spell without clues", `${spellingCount}/${total}`],
        ["🌼", "Bloom", "reward"],
      ].map(([icon, label, note], index) => (
        <div
          key={label}
          className={`${step === index ? "is-current" : ""} ${step > index ? "is-done" : ""}`}
          aria-current={step === index ? "step" : undefined}
        >
          <span aria-hidden="true">{step > index ? "✓" : icon}</span>
          <strong>{label}</strong>
          <small>{note}</small>
        </div>
      ))}
    </nav>
  );
}

function WordGardenIntro({
  book,
  words,
  progress,
  masteredCount,
  onStart,
  onOpenStory,
}: {
  book: Book;
  words: VocabularyWord[];
  progress: WordPracticeProgress;
  masteredCount: number;
  onStart: () => void;
  onOpenStory: () => void;
}) {
  const complete = masteredCount === words.length;
  const started = words.some((word) => {
    const result = progress.words[word.id];
    return Boolean(result && (result.readConfirmed || result.spelling !== "new"));
  });
  return (
    <section className="word-intro" aria-labelledby="word-intro-title">
      <div className="word-intro__picture">
        <img src={book.cover} alt={`Cover of ${book.title}`} />
        <span aria-hidden="true">🌱</span>
      </div>
      <div className="word-intro__copy">
        <p className="eyebrow">5 story words · 约 6–10 分钟</p>
        <h1 id="word-intro-title">Grow five word flowers!</h1>
        <p>Listen to each story word, say it in your own voice, then hear it again and spell it.</p>
        <div className="seed-row" aria-label="Five words in this garden">
          {words.map((word) => (
            <span key={word.id} className={wordIsMastered(progress.words[word.id]) ? "is-grown" : ""}>
              <b aria-hidden="true">{wordIsMastered(progress.words[word.id]) ? "🌼" : word.icon}</b>
              {word.word}
            </span>
          ))}
        </div>
        <div className="word-intro__promise">
          <span aria-hidden="true">💛</span>
          <p><strong>No scores for your accent.</strong> Listen, try, and grow at your own pace.</p>
        </div>
        <div className="word-intro__actions">
          <button className="button button--green" type="button" onClick={onStart}>
            {complete ? "Practise all 5 again" : started ? "Continue my words" : "Start with the first word"} <span aria-hidden="true">→</span>
          </button>
          <button className="button button--light" type="button" onClick={onOpenStory}>📖 Read the story first</button>
        </div>
      </div>
    </section>
  );
}

function LearnWord({
  book,
  word,
  position,
  total,
  narrator,
  onOpenStory,
  onDone,
}: {
  book: Book;
  word: VocabularyWord;
  position: number;
  total: number;
  narrator: NarratorLike;
  onOpenStory: () => void;
  onDone: () => void;
}) {
  const voiceKey = `word-${book.slug}-${word.id}`;
  const isSpeaking = narrator.activeKey === voiceKey;
  const [heard, setHeard] = useState(false);
  const playWord = () => {
    if (isSpeaking) {
      narrator.stop();
      return;
    }
    setHeard(true);
    narrator.speak(word.word, {
      purpose: "practice",
      activeKey: voiceKey,
      audioSrc: wordAudioSource(book.slug, word.id),
    });
  };

  return (
    <section className="learn-word" aria-labelledby="learn-word-title">
      <div className="word-screen-heading">
        <div><p className="eyebrow">Word {position} of {total}</p><h1 id="learn-word-title">Listen, look, then say it</h1></div>
        <div className="word-progress-dots" aria-hidden="true">
          {Array.from({ length: total }, (_, index) => <i key={index} className={index < position ? "is-on" : ""} />)}
        </div>
      </div>

      <div className="learn-word__grid">
        <button className="word-story-picture" type="button" onClick={onOpenStory} aria-label={`Open the story page for ${word.word}`}>
          <img src={book.pages[word.pageIndex].src} alt={`Story picture for the word ${word.word}`} />
          <span>See it in the story ↗</span>
        </button>

        <div className="word-card-large">
          <span className="word-card-large__icon" aria-hidden="true">{word.icon}</span>
          <div className="word-card-large__word">{word.word}</div>
          <div className="sound-parts" aria-label={`${word.word} word parts`}>
            {word.soundParts.map((part, index) => <span key={`${part}-${index}`}>{part}</span>)}
          </div>
          {word.pronunciationHint && <p className="pronunciation-hint">Follow the model: {word.pronunciationHint}</p>}
          <button className={`word-audio-button ${isSpeaking ? "is-speaking" : ""}`} type="button" onClick={playWord} disabled={!narrator.supported}>
            <span aria-hidden="true">{isSpeaking ? "■" : "🔊"}</span>
            <strong>{isSpeaking ? "Stop" : heard ? "Hear it again" : "Hear the word"}</strong>
            <small>{narrator.currentVoiceLabel}</small>
          </button>
          <div className="word-meaning">
            <strong>{word.meaning}</strong><span>{word.meaningZh}</span>
          </div>
          <blockquote>{word.example}</blockquote>
        </div>
      </div>

      <WordRecorder word={word.word} narrator={narrator} />
      <div className="learn-word__next">
        {!heard && <p role="status">Tap “Hear the word” first, then say it aloud.</p>}
        <button className="button button--green" type="button" onClick={onDone} disabled={!heard}>
          ✓ I read and said it <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}

function WordRecorder({ word, narrator }: { word: string; narrator: NarratorLike }) {
  const [recording, setRecording] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [message, setMessage] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioUrlRef = useRef("");
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    clearTimer();
    if (recorderRef.current?.state === "recording") {
      try {
        recorderRef.current.stop();
      } catch {
        stopTracks();
        setRecording(false);
      }
    } else {
      stopTracks();
      setRecording(false);
    }
  }, [clearTimer, stopTracks]);

  useEffect(() => {
    mountedRef.current = true;
    const discardUrl = () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    };
    const leavePage = () => {
      requestRef.current += 1;
      stopRecording();
      discardUrl();
      setAudioUrl("");
      setRequesting(false);
    };
    window.addEventListener("pagehide", leavePage);
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      window.removeEventListener("pagehide", leavePage);
      clearTimer();
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.ondataavailable = null;
        recorderRef.current.onstop = null;
        try { recorderRef.current.stop(); } catch { /* the tracks are stopped below */ }
      }
      stopTracks();
      discardUrl();
    };
  }, [clearTimer, stopRecording, stopTracks]);

  const deleteRecording = () => {
    setAudioUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      audioUrlRef.current = "";
      return "";
    });
    setMessage("Recording deleted.");
  };

  const startRecording = async () => {
    if (recording || requesting) return;
    narrator.stop();
    deleteRecording();
    setMessage("");
    setRequesting(true);
    const request = ++requestRef.current;
    let mediaStream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("unsupported");
      }
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current || request !== requestRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = mediaStream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(mediaStream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        clearTimer();
        stopTracks();
        if (mountedRef.current) {
          setRecording(false);
          setMessage("The recorder stopped. Say the word aloud — that still counts!");
        }
      };
      recorder.onstop = () => {
        clearTimer();
        try {
          if (!mountedRef.current || request !== requestRef.current) return;
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          if (!blob.size) throw new Error("empty recording");
          const nextUrl = URL.createObjectURL(blob);
          audioUrlRef.current = nextUrl;
          setAudioUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return nextUrl;
          });
          setMessage("Nice try! Play it and compare it with the model word.");
        } catch {
          if (mountedRef.current) setMessage("I could not save that recording. You can try again.");
        } finally {
          stopTracks();
          if (mountedRef.current) setRecording(false);
        }
      };
      recorder.start();
      setRecording(true);
      timerRef.current = window.setTimeout(stopRecording, 10_000);
    } catch {
      mediaStream?.getTracks().forEach((track) => track.stop());
      stopTracks();
      if (mountedRef.current) {
        setMessage("No microphone? That is okay — say the word aloud and keep learning.");
      }
    } finally {
      if (mountedRef.current && request === requestRef.current) setRequesting(false);
    }
  };

  return (
    <aside className="word-recorder" aria-label={`Optional voice practice for ${word}`}>
      <div className="word-recorder__privacy"><span aria-hidden="true">🔒</span><p><strong>Optional voice mirror</strong>Your recording only plays on this page. It is never uploaded and is deleted when you leave.</p></div>
      <div className="word-recorder__actions">
        {!recording ? (
          <button className="button button--coral" type="button" onClick={startRecording} disabled={requesting}>
            {requesting ? "Opening microphone…" : audioUrl ? "🎙️ Record again" : "🎙️ Record my word"}
          </button>
        ) : (
          <button className="button button--coral" type="button" onClick={stopRecording}>■ Stop recording</button>
        )}
        {audioUrl && !recording && <audio className="word-recorder__playback" src={audioUrl} controls onPlay={narrator.stop} aria-label={`Play your recording of ${word}`} />}
        {audioUrl && !recording && <button className="text-button" type="button" onClick={deleteRecording}>Delete my recording</button>}
      </div>
      {recording && <p className="word-recorder__status" role="status">Listening… say “{word}”. Recording stops after 10 seconds.</p>}
      {message && <p className="word-recorder__status" role="status">{message}</p>}
    </aside>
  );
}

function normaliseSpelling(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en");
}

function shuffledLetters(word: string): Array<{ letter: string; originalIndex: number }> {
  const letters = Array.from(normaliseSpelling(word)).map((letter, originalIndex) => ({ letter, originalIndex }));
  if (letters.length < 2) return letters;
  const shift = Math.max(1, word.length % letters.length);
  const rotated = [...letters.slice(shift), ...letters.slice(0, shift)];
  return word.length % 2 ? rotated.reverse() : rotated;
}

function SpellWord({
  bookSlug,
  word,
  position,
  total,
  narrator,
  onMiss,
  onDone,
}: {
  bookSlug: string;
  word: VocabularyWord;
  position: number;
  total: number;
  narrator: NarratorLike;
  onMiss: () => void;
  onDone: (result: Exclude<SpellingResult, "new">, attempts: number) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [usedTiles, setUsedTiles] = useState<number[]>([]);
  const [tries, setTries] = useState(0);
  const [supportMode, setSupportMode] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [solved, setSolved] = useState<Exclude<SpellingResult, "new"> | null>(null);
  const [heard, setHeard] = useState(false);
  const voiceKey = `spell-${bookSlug}-${word.id}`;
  const isSpeaking = narrator.activeKey === voiceKey;
  const tiles = useMemo(() => shuffledLetters(word.word), [word]);
  const expected = normaliseSpelling(word.word);

  const playWord = () => {
    if (isSpeaking) narrator.stop();
    else {
      setHeard(true);
      narrator.speak(word.word, {
        purpose: "practice",
        activeKey: voiceKey,
        audioSrc: wordAudioSource(bookSlug, word.id),
      });
    }
  };

  const updateTypedAnswer = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value.replace(/[^A-Za-z'-]/g, "").slice(0, expected.length);
    setAnswer(next);
    setUsedTiles([]);
    setFeedback("");
  };

  const addTile = (tileIndex: number) => {
    if (usedTiles.includes(tileIndex) || answer.length >= expected.length || solved) return;
    setUsedTiles((current) => [...current, tileIndex]);
    setAnswer((current) => `${current}${tiles[tileIndex].letter}`);
    setFeedback("");
  };

  const removeLetter = () => {
    setAnswer((current) => current.slice(0, -1));
    setUsedTiles((current) => current.slice(0, -1));
    setFeedback("");
  };

  const check = () => {
    if (normaliseSpelling(answer) === expected) {
      const result = supportMode ? "supported" : "correct";
      setSolved(result);
      setFeedback(result === "correct" ? "You heard it and built it!" : "You used the clue and rebuilt it — that is learning!");
      return;
    }
    const nextTries = tries + 1;
    onMiss();
    setTries(nextTries);
    setAnswer("");
    setUsedTiles([]);
    if (nextTries >= 2) {
      setSupportMode(true);
      setFeedback("Look at the word, say its parts, then build it once more.");
    } else {
      setFeedback(`Good try! It has ${expected.length} letters and starts with “${expected[0]}”. Listen again.`);
    }
  };

  return (
    <section className="spell-word" aria-labelledby="spell-word-title">
      <div className="word-screen-heading">
        <div><p className="eyebrow">Spelling {position} of {total}</p><h1 id="spell-word-title">Listen and build the word</h1></div>
        <div className="word-progress-dots" aria-hidden="true">
          {Array.from({ length: total }, (_, index) => <i key={index} className={index < position ? "is-on" : ""} />)}
        </div>
      </div>

      <div className={`dictation-card ${solved ? "is-solved" : ""}`}>
        <span className="dictation-card__icon" aria-hidden="true">{solved ? "🌼" : word.icon}</span>
        <p className="dictation-card__instruction">The word is hiding. Play it as many times as you need.</p>
        <button className={`dictation-sound ${isSpeaking ? "is-speaking" : ""}`} type="button" onClick={playWord}>
          <span aria-hidden="true">{isSpeaking ? "■" : "🔊"}</span>
          <strong>{isSpeaking ? "Stop" : "Hear the word"}</strong>
        </button>
        {!heard && <p className="dictation-hear-first" role="status">Hear the hidden word before you check your spelling.</p>}

        {supportMode && !solved && (
          <div className="guided-word" role="status">
            <small>Read the clue, then copy it:</small>
            <strong>{word.word}</strong>
            <span>{word.soundParts.join(" · ")}</span>
          </div>
        )}

        <label className="spelling-input" htmlFor={`spell-${bookSlug}-${word.id}`}>
          <span>My spelling</span>
          <input
            id={`spell-${bookSlug}-${word.id}`}
            value={answer}
            onChange={updateTypedAnswer}
            disabled={Boolean(solved)}
            maxLength={expected.length}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="text"
            aria-describedby={`spell-feedback-${bookSlug}-${word.id}`}
          />
          <b aria-hidden="true">{Array.from({ length: expected.length }, (_, index) => <i key={index} className={index < answer.length ? "has-letter" : ""} />)}</b>
        </label>

        {!solved && (
          <div className="letter-builder" aria-label="Letter tiles">
            <p>Tap the letters or type on the keyboard.</p>
            <div>
              {tiles.map((tile, index) => (
                <button key={`${tile.letter}-${tile.originalIndex}`} type="button" onClick={() => addTile(index)} disabled={usedTiles.includes(index)}>
                  {tile.letter}
                </button>
              ))}
              <button className="letter-builder__back" type="button" onClick={removeLetter} disabled={!answer} aria-label="Remove the last letter">⌫</button>
            </div>
          </div>
        )}

        <p id={`spell-feedback-${bookSlug}-${word.id}`} className={`dictation-feedback ${solved ? "is-success" : ""}`} aria-live="polite">{feedback}</p>
        {!solved ? (
          <button className="button button--green" type="button" onClick={check} disabled={!answer || !heard}>Check my word</button>
        ) : (
          <button className="button button--sun" type="button" onClick={() => onDone(solved, tries + 1)}>
            Grow the next seed <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </section>
  );
}

function WordGardenComplete({
  words,
  progress,
  reviewMode,
  onReview,
  onContinue,
}: {
  words: VocabularyWord[];
  progress: WordPracticeProgress;
  reviewMode: boolean;
  onReview: () => void;
  onContinue: () => void;
}) {
  const independentCount = words.filter((word) => wordIsMastered(progress.words[word.id])).length;
  const needsReview = words.length - independentCount;
  const complete = needsReview === 0;
  return (
    <section className="word-complete" aria-labelledby="word-complete-title">
      <div className={`word-complete__bloom ${complete ? "is-complete" : "needs-review"}`} aria-hidden="true"><span>{complete ? "🌼" : "🌱"}</span><i /><i /><i /></div>
      <p className="eyebrow">{complete ? "Word Garden complete" : "Practice round complete"}</p>
      <h1 id="word-complete-title">{complete ? "Your five word flowers bloomed!" : `${needsReview} ${needsReview === 1 ? "word needs" : "words need"} one more try.`}</h1>
      <p>{complete
        ? reviewMode ? "Every time you practise, your word roots grow stronger." : "You listened, spoke, read and spelled every story word without a clue."
        : "Using a clue is good learning. Try those words again with the answer hidden to make their flowers bloom."}</p>
      <div className="word-complete__words">
        {words.map((word) => {
          const result = progress.words[word.id] ?? emptyResult();
          return (
            <span key={word.id} className={result.spelling === "correct" ? "is-grown" : "needs-review"}>
              <b aria-hidden="true">{result.spelling === "correct" ? "🌼" : word.icon}</b>
              <strong>{word.word}</strong>
              <small>{result.spelling === "correct" ? "✓ grown" : "↻ try without clue"}</small>
            </span>
          );
        })}
      </div>
      <div className="word-complete__actions">
        <button className="button button--light" type="button" onClick={onReview}>↻ {complete ? "Practise again" : "Review clue words"}</button>
        <button className="button button--green" type="button" onClick={onContinue}>Continue to story missions →</button>
      </div>
    </section>
  );
}
