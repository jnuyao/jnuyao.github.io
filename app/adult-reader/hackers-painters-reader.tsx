"use client";

/* eslint-disable @next/next/no-img-element -- original PDF pages are local, pre-sized reading assets */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  HACKERS_PAINTERS_UNITS,
  type HackersPaintersUnit,
  type HackersPaintersUnitId,
} from "./hackers-painters-data";
import {
  HACKERS_PAINTERS_PROGRESS_KEY,
  emptyHackersPaintersProgress,
  emptyHackersPaintersUnitProgress,
  hackersPaintersCompletedCount,
  normaliseHackersPaintersProgress,
  type HackersPaintersProgress,
  type HackersPaintersUnitProgress,
} from "./hackers-painters-progress";
import "./hackers-painters-reader.css";

type HackersPaintersReaderProps = {
  unitId: HackersPaintersUnitId | null;
  onBack: () => void;
  onHome: () => void;
  onOpenUnit: (id: HackersPaintersUnitId) => void;
};

type LessonSection = "read" | "words" | "sentence" | "check" | "speak" | "write";
type ReadingView = "focus" | "original";
type ReadingRate = 0.8 | 1 | 1.15;

const LESSON_SECTIONS: Array<{
  id: LessonSection;
  number: string;
  label: string;
  labelZh: string;
}> = [
  { id: "read", number: "01", label: "Read", labelZh: "精读" },
  { id: "words", number: "02", label: "Words", labelZh: "词汇" },
  { id: "sentence", number: "03", label: "Sentence", labelZh: "长句" },
  { id: "check", number: "04", label: "Check", labelZh: "理解" },
  { id: "speak", number: "05", label: "Speak", labelZh: "表达" },
  { id: "write", number: "06", label: "Write", labelZh: "写作" },
];

function unitProgressFor(
  progress: HackersPaintersProgress,
  unitId: HackersPaintersUnitId,
): HackersPaintersUnitProgress {
  return progress.units[unitId] ?? emptyHackersPaintersUnitProgress();
}

function loadProgress(): HackersPaintersProgress {
  if (typeof window === "undefined") return emptyHackersPaintersProgress();
  try {
    const stored = window.localStorage.getItem(HACKERS_PAINTERS_PROGRESS_KEY);
    return stored
      ? normaliseHackersPaintersProgress(JSON.parse(stored))
      : emptyHackersPaintersProgress();
  } catch {
    return emptyHackersPaintersProgress();
  }
}

export function HackersPaintersReader({
  unitId,
  onBack,
  onHome,
  onOpenUnit,
}: HackersPaintersReaderProps) {
  const [progress, setProgress] = useState<HackersPaintersProgress>(
    emptyHackersPaintersProgress,
  );
  const [progressReady, setProgressReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setProgress(loadProgress());
      setProgressReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!progressReady) return;
    try {
      window.localStorage.setItem(
        HACKERS_PAINTERS_PROGRESS_KEY,
        JSON.stringify(progress),
      );
    } catch {
      // Reading remains available if a browser blocks device-local storage.
    }
  }, [progress, progressReady]);

  const updateUnit = useCallback((
    id: HackersPaintersUnitId,
    patch: Partial<HackersPaintersUnitProgress>,
  ) => {
    setProgress((current) => {
      const existing = unitProgressFor(current, id);
      return {
        ...current,
        lastUnitId: id,
        units: {
          ...current.units,
          [id]: {
            ...existing,
            ...patch,
            updatedAt: Date.now(),
          },
        },
      };
    });
  }, []);

  const unit = unitId
    ? HACKERS_PAINTERS_UNITS.find((candidate) => candidate.id === unitId)
    : undefined;

  if (!progressReady) {
    return (
      <main className="hp-reader hp-reader--loading" aria-busy="true">
        <div className="hp-reader__loading">
          <span>CHAPTER 02</span>
          <strong>Preparing your reading desk…</strong>
        </div>
      </main>
    );
  }

  if (!unit) {
    return (
      <ChapterHome
        progress={progress}
        onBack={onBack}
        onOpenUnit={onOpenUnit}
      />
    );
  }

  return (
    <UnitReader
      key={unit.id}
      unit={unit}
      progress={unitProgressFor(progress, unit.id)}
      onHome={onHome}
      onOpenUnit={onOpenUnit}
      onUpdate={(patch) => updateUnit(unit.id, patch)}
    />
  );
}

function ChapterHome({
  progress,
  onBack,
  onOpenUnit,
}: {
  progress: HackersPaintersProgress;
  onBack: () => void;
  onOpenUnit: (id: HackersPaintersUnitId) => void;
}) {
  const completedCount = hackersPaintersCompletedCount(progress);
  const lastUnit = progress.lastUnitId
    ? HACKERS_PAINTERS_UNITS.find((unit) => unit.id === progress.lastUnitId)
    : undefined;
  const continueUnit = lastUnit ?? HACKERS_PAINTERS_UNITS[0];

  return (
    <main className="hp-reader hp-reader--home" aria-labelledby="hp-chapter-title">
      <header className="hp-reader__topbar">
        <button className="hp-icon-button" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span> Library
        </button>
        <div className="hp-reader__brand" aria-label="My English Studio">
          <span>MY ENGLISH STUDIO</span>
          <strong>Deep Reading</strong>
        </div>
        <div className="hp-reader__saved-state">Saved on this device</div>
      </header>

      <section className="hp-chapter-hero">
        <div className="hp-chapter-hero__number" aria-hidden="true">
          <span>CHAPTER</span>
          <strong>02</strong>
        </div>
        <div className="hp-chapter-hero__copy">
          <p className="hp-kicker">PAUL GRAHAM · HACKERS &amp; PAINTERS</p>
          <h1 id="hp-chapter-title">Hackers and Painters</h1>
          <p className="hp-chapter-hero__title-zh">黑客与画家</p>
          <p className="hp-chapter-hero__intro">
            Read the original essay in six focused sessions. Listen deliberately,
            unpack difficult sentences, and turn the author&apos;s ideas into your own English.
          </p>
          <div className="hp-chapter-hero__actions">
            <button
              className="hp-primary-button"
              type="button"
              onClick={() => onOpenUnit(continueUnit.id)}
            >
              {lastUnit ? "Continue reading" : "Begin chapter"}
              <span aria-hidden="true">→</span>
            </button>
            <span>{completedCount} of {HACKERS_PAINTERS_UNITS.length} units complete</span>
          </div>
        </div>
        <div className="hp-chapter-progress" aria-label={`${completedCount} of ${HACKERS_PAINTERS_UNITS.length} units complete`}>
          <strong>{Math.round((completedCount / HACKERS_PAINTERS_UNITS.length) * 100)}%</strong>
          <span>CHAPTER PROGRESS</span>
          <div aria-hidden="true"><i style={{ width: `${(completedCount / HACKERS_PAINTERS_UNITS.length) * 100}%` }} /></div>
        </div>
      </section>

      <section className="hp-unit-index" aria-labelledby="hp-unit-index-title">
        <div className="hp-section-heading">
          <div>
            <p className="hp-kicker">SIX READING SESSIONS</p>
            <h2 id="hp-unit-index-title">A chapter, one idea at a time</h2>
          </div>
          <p>每个单元约 20–25 分钟。建议先用英文理解，再在必要时查看中文提示。</p>
        </div>

        <div className="hp-unit-grid">
          {HACKERS_PAINTERS_UNITS.map((unit, index) => {
            const unitProgress = unitProgressFor(progress, unit.id);
            const answered = Object.keys(unitProgress.comprehensionAnswers).length;
            return (
              <article
                className={`hp-unit-card${unitProgress.completed ? " is-complete" : ""}`}
                key={unit.id}
              >
                <button type="button" onClick={() => onOpenUnit(unit.id)}>
                  <div className="hp-unit-card__meta">
                    <span>UNIT {String(index + 1).padStart(2, "0")}</span>
                    <span>PDF {unit.pdfPages.join("–")}</span>
                  </div>
                  <h3>{unit.title}</h3>
                  <p className="hp-unit-card__zh">{unit.titleZh}</p>
                  <p className="hp-unit-card__question">{unit.guidingQuestion}</p>
                  <div className="hp-unit-card__signals" aria-label="Unit activity progress">
                    <span className={unitProgress.heardParagraphIds.length ? "is-done" : ""}>Read</span>
                    <span className={unitProgress.savedWords.length ? "is-done" : ""}>Words</span>
                    <span className={answered === unit.comprehension.length ? "is-done" : ""}>Check</span>
                    <span className={unitProgress.writingDraft.trim() ? "is-done" : ""}>Write</span>
                  </div>
                  <div className="hp-unit-card__open">
                    <span>{unitProgress.completed ? "Completed" : "Open session"}</span>
                    <strong aria-hidden="true">→</strong>
                  </div>
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="hp-study-note">
        <span aria-hidden="true">Aa</span>
        <div>
          <strong>How to use this chapter</strong>
          <p>Read for meaning first. Listen only when you choose. Save useful words—not every unfamiliar word—and finish by speaking or writing one idea in your own words.</p>
        </div>
      </section>
    </main>
  );
}

function UnitReader({
  unit,
  progress,
  onHome,
  onOpenUnit,
  onUpdate,
}: {
  unit: HackersPaintersUnit;
  progress: HackersPaintersUnitProgress;
  onHome: () => void;
  onOpenUnit: (id: HackersPaintersUnitId) => void;
  onUpdate: (patch: Partial<HackersPaintersUnitProgress>) => void;
}) {
  const startingParagraph = unit.paragraphs.find(
    (paragraph) => paragraph.id === progress.lastParagraphId,
  ) ?? unit.paragraphs[0];
  const [section, setSection] = useState<LessonSection>("read");
  const [readingView, setReadingView] = useState<ReadingView>("focus");
  const [paragraphId, setParagraphId] = useState(startingParagraph.id);
  const [pageIndex, setPageIndex] = useState(0);
  const [rate, setRate] = useState<ReadingRate>(1);
  const [activeSpeechKey, setActiveSpeechKey] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const unitIndex = HACKERS_PAINTERS_UNITS.findIndex((candidate) => candidate.id === unit.id);
  const paragraph = unit.paragraphs.find((candidate) => candidate.id === paragraphId)
    ?? unit.paragraphs[0];

  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setActiveSpeechKey(null);
  }, []);

  useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const speak = useCallback((text: string, key: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (activeSpeechKey === key) {
      stopSpeech();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.onend = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setActiveSpeechKey(null);
      }
    };
    utterance.onerror = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setActiveSpeechKey(null);
      }
    };
    utteranceRef.current = utterance;
    setActiveSpeechKey(key);
    window.speechSynthesis.speak(utterance);
  }, [activeSpeechKey, rate, stopSpeech]);

  const selectParagraph = (nextId: string) => {
    stopSpeech();
    setParagraphId(nextId);
    onUpdate({ lastParagraphId: nextId });
  };

  const selectSection = (next: LessonSection) => {
    stopSpeech();
    setSection(next);
  };

  const selectReadingView = (next: ReadingView) => {
    stopSpeech();
    setReadingView(next);
  };

  const hearParagraph = () => {
    const heardParagraphIds = progress.heardParagraphIds.includes(paragraph.id)
      ? progress.heardParagraphIds
      : [...progress.heardParagraphIds, paragraph.id];
    onUpdate({
      lastParagraphId: paragraph.id,
      heardParagraphIds,
    });
    speak(paragraph.text, `paragraph-${paragraph.id}`);
  };

  const changeOriginalPage = (nextIndex: number) => {
    stopSpeech();
    setPageIndex(Math.max(0, Math.min(unit.pageImages.length - 1, nextIndex)));
  };

  const goToUnit = (nextIndex: number) => {
    const nextUnit = HACKERS_PAINTERS_UNITS[nextIndex];
    if (!nextUnit) return;
    stopSpeech();
    onOpenUnit(nextUnit.id);
  };

  const toggleComplete = () => {
    const completed = !progress.completed;
    onUpdate({
      completed,
      completedAt: completed ? new Date().toISOString() : undefined,
    });
  };

  return (
    <main className="hp-reader hp-reader--unit" aria-labelledby="hp-unit-title">
      <header className="hp-reader__topbar hp-reader__topbar--unit">
        <button className="hp-icon-button" type="button" onClick={() => { stopSpeech(); onHome(); }}>
          <span aria-hidden="true">←</span> Chapter 02
        </button>
        <div className="hp-reader__brand">
          <span>HACKERS AND PAINTERS</span>
          <strong>Unit {String(unitIndex + 1).padStart(2, "0")}</strong>
        </div>
        <div className="hp-reader__page-reference">PDF pages {unit.pdfPages.join("–")}</div>
      </header>

      <section className="hp-unit-hero">
        <div>
          <p className="hp-kicker">UNIT {String(unitIndex + 1).padStart(2, "0")} · GUIDING QUESTION</p>
          <h1 id="hp-unit-title">{unit.title}</h1>
          <p className="hp-unit-hero__zh">{unit.titleZh}</p>
        </div>
        <blockquote>
          <p>{unit.guidingQuestion}</p>
          <footer>{unit.guidingQuestionZh}</footer>
        </blockquote>
      </section>

      <nav className="hp-lesson-nav" aria-label="Learning stages">
        {LESSON_SECTIONS.map((item) => (
          <button
            className={section === item.id ? "is-active" : ""}
            type="button"
            key={item.id}
            onClick={() => selectSection(item.id)}
            aria-current={section === item.id ? "step" : undefined}
          >
            <small>{item.number}</small>
            <span>{item.label}</span>
            <em>{item.labelZh}</em>
          </button>
        ))}
      </nav>

      <div className="hp-lesson-stage">
        {section === "read" && (
          <ReadingSection
            unit={unit}
            paragraph={paragraph}
            paragraphId={paragraphId}
            readingView={readingView}
            pageIndex={pageIndex}
            rate={rate}
            activeSpeechKey={activeSpeechKey}
            heardParagraphIds={progress.heardParagraphIds}
            onSelectParagraph={selectParagraph}
            onSelectView={selectReadingView}
            onChangePage={changeOriginalPage}
            onHearParagraph={hearParagraph}
            onChangeRate={(nextRate) => { stopSpeech(); setRate(nextRate); }}
          />
        )}
        {section === "words" && (
          <WordsSection
            unit={unit}
            savedWords={progress.savedWords}
            activeSpeechKey={activeSpeechKey}
            onSpeak={speak}
            onToggleWord={(word) => {
              const savedWords = progress.savedWords.includes(word)
                ? progress.savedWords.filter((saved) => saved !== word)
                : [...progress.savedWords, word];
              onUpdate({ savedWords });
            }}
          />
        )}
        {section === "sentence" && (
          <SentenceSection
            unit={unit}
            active={activeSpeechKey === "sentence-lab"}
            onHear={() => speak(unit.sentenceLab.sentence, "sentence-lab")}
          />
        )}
        {section === "check" && (
          <ComprehensionSection
            unit={unit}
            answers={progress.comprehensionAnswers}
            onAnswer={(questionIndex, answerIndex) => onUpdate({
              comprehensionAnswers: {
                ...progress.comprehensionAnswers,
                [String(questionIndex)]: answerIndex,
              },
            })}
          />
        )}
        {section === "speak" && (
          <SpeakingSection
            unit={unit}
            practised={progress.speakingPractised}
            activeSpeechKey={activeSpeechKey}
            onSpeak={speak}
            onMarkPractised={() => onUpdate({ speakingPractised: true })}
          />
        )}
        {section === "write" && (
          <WritingSection
            unit={unit}
            draft={progress.writingDraft}
            onChange={(writingDraft) => onUpdate({ writingDraft })}
          />
        )}
      </div>

      <footer className="hp-unit-footer">
        <button type="button" disabled={unitIndex === 0} onClick={() => goToUnit(unitIndex - 1)}>
          <span aria-hidden="true">←</span> Previous unit
        </button>
        <button
          className={`hp-complete-button${progress.completed ? " is-complete" : ""}`}
          type="button"
          onClick={toggleComplete}
        >
          {progress.completed ? "✓ Unit complete" : "Mark unit complete"}
        </button>
        <button type="button" disabled={unitIndex === HACKERS_PAINTERS_UNITS.length - 1} onClick={() => goToUnit(unitIndex + 1)}>
          Next unit <span aria-hidden="true">→</span>
        </button>
      </footer>
    </main>
  );
}

function LessonPanel({
  kicker,
  title,
  intro,
  children,
}: {
  kicker: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section className="hp-panel">
      <header className="hp-panel__heading">
        <p className="hp-kicker">{kicker}</p>
        <h2>{title}</h2>
        <p>{intro}</p>
      </header>
      {children}
    </section>
  );
}

function ReadingSection({
  unit,
  paragraph,
  paragraphId,
  readingView,
  pageIndex,
  rate,
  activeSpeechKey,
  heardParagraphIds,
  onSelectParagraph,
  onSelectView,
  onChangePage,
  onHearParagraph,
  onChangeRate,
}: {
  unit: HackersPaintersUnit;
  paragraph: HackersPaintersUnit["paragraphs"][number];
  paragraphId: string;
  readingView: ReadingView;
  pageIndex: number;
  rate: ReadingRate;
  activeSpeechKey: string | null;
  heardParagraphIds: string[];
  onSelectParagraph: (id: string) => void;
  onSelectView: (view: ReadingView) => void;
  onChangePage: (index: number) => void;
  onHearParagraph: () => void;
  onChangeRate: (rate: ReadingRate) => void;
}) {
  return (
    <LessonPanel
      kicker="FOCUS READING"
      title="Read for the author’s idea"
      intro="Choose one paragraph. Read it silently first, then play it only when you want to listen. Moving between paragraphs never starts audio."
    >
      <div className="hp-reading-toolbar">
        <div className="hp-segmented-control" aria-label="Reading view">
          <button className={readingView === "focus" ? "is-active" : ""} type="button" onClick={() => onSelectView("focus")}>Focus text</button>
          <button className={readingView === "original" ? "is-active" : ""} type="button" onClick={() => onSelectView("original")}>Original page</button>
        </div>
        <div className="hp-rate-control" aria-label="Listening speed">
          <span>Listening speed</span>
          {([0.8, 1, 1.15] as const).map((choice) => (
            <button className={rate === choice ? "is-active" : ""} type="button" key={choice} onClick={() => onChangeRate(choice)}>
              {choice === 0.8 ? "Slow" : choice === 1 ? "Natural" : "Brisk"}
            </button>
          ))}
        </div>
      </div>

      {readingView === "focus" ? (
        <div className="hp-focus-reader">
          <aside className="hp-paragraph-index" aria-label="Paragraphs">
            <p>{unit.paragraphs.length} paragraphs</p>
            {unit.paragraphs.map((item, index) => (
              <button
                className={paragraphId === item.id ? "is-active" : ""}
                type="button"
                key={item.id}
                onClick={() => onSelectParagraph(item.id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <small>Page {item.page}</small>
                {heardParagraphIds.includes(item.id) && <i aria-label="Listened">•</i>}
              </button>
            ))}
          </aside>
          <article className="hp-focus-text">
            <div className="hp-focus-text__meta">
              <span>ORIGINAL TEXT · PAGE {paragraph.page}</span>
              <button
                className={activeSpeechKey === `paragraph-${paragraph.id}` ? "is-speaking" : ""}
                type="button"
                onClick={onHearParagraph}
              >
                <span aria-hidden="true">{activeSpeechKey === `paragraph-${paragraph.id}` ? "■" : "▶"}</span>
                {activeSpeechKey === `paragraph-${paragraph.id}` ? "Stop" : "Hear this paragraph"}
              </button>
            </div>
            <p>{paragraph.text}</p>
            <div className="hp-focus-text__hint">Read once without stopping. On the second pass, notice how each sentence advances the argument.</div>
          </article>
        </div>
      ) : (
        <div className="hp-original-page">
          <div className="hp-original-page__frame">
            <img
              src={unit.pageImages[pageIndex]}
              alt={`Original PDF page ${unit.pdfPages[pageIndex]}`}
            />
          </div>
          <div className="hp-original-page__controls">
            <button type="button" disabled={pageIndex === 0} onClick={() => onChangePage(pageIndex - 1)}>← Previous</button>
            <span>PDF page {unit.pdfPages[pageIndex]} · {pageIndex + 1} of {unit.pageImages.length}</span>
            <button type="button" disabled={pageIndex === unit.pageImages.length - 1} onClick={() => onChangePage(pageIndex + 1)}>Next →</button>
          </div>
          <p>Original view is for checking layout and context. Page changes remain silent.</p>
        </div>
      )}
    </LessonPanel>
  );
}

function WordsSection({
  unit,
  savedWords,
  activeSpeechKey,
  onSpeak,
  onToggleWord,
}: {
  unit: HackersPaintersUnit;
  savedWords: string[];
  activeSpeechKey: string | null;
  onSpeak: (text: string, key: string) => void;
  onToggleWord: (word: string) => void;
}) {
  return (
    <LessonPanel kicker="TARGET LANGUAGE" title="Keep the words you can use" intro="Learn each word in the author’s context. Save only the expressions you want to meet again.">
      <div className="hp-word-grid">
        {unit.targetWords.map((item, index) => {
          const saved = savedWords.includes(item.word);
          const speechKey = `word-${index}`;
          return (
            <article className={saved ? "is-saved" : ""} key={item.word}>
              <div className="hp-word-card__topline">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <button type="button" onClick={() => onSpeak(item.word, speechKey)} aria-label={`Hear ${item.word}`}>
                  {activeSpeechKey === speechKey ? "■ Stop" : "▶ Hear"}
                </button>
              </div>
              <h3>{item.word}</h3>
              <p className="hp-word-card__ipa">{item.ipa}</p>
              <p>{item.definition}</p>
              <p className="hp-word-card__zh">{item.definitionZh}</p>
              <div className="hp-word-card__collocation"><small>USE IT WITH</small>{item.collocation}</div>
              <button className="hp-save-word" type="button" onClick={() => onToggleWord(item.word)}>
                {saved ? "✓ Saved for review" : "+ Save this word"}
              </button>
            </article>
          );
        })}
      </div>
    </LessonPanel>
  );
}

function SentenceSection({ unit, active, onHear }: { unit: HackersPaintersUnit; active: boolean; onHear: () => void }) {
  return (
    <LessonPanel kicker="SENTENCE LAB" title="See the structure before translating" intro="This sentence carries more than one idea. Read the coloured chunks in order, then rebuild the whole meaning.">
      <div className="hp-sentence-lab">
        <div className="hp-sentence-lab__quote">
          <span aria-hidden="true">“</span>
          <p>{unit.sentenceLab.sentence}</p>
          <button type="button" onClick={onHear}>{active ? "■ Stop" : "▶ Hear the whole sentence"}</button>
        </div>
        <div className="hp-sentence-chunks">
          {unit.sentenceLab.chunks.map((chunk, index) => (
            <div key={`${chunk.text}-${index}`}>
              <small>{String(index + 1).padStart(2, "0")}</small>
              <p>{chunk.text}</p>
              <span>{chunk.role}</span>
              <em>{chunk.roleZh}</em>
            </div>
          ))}
        </div>
        <aside className="hp-sentence-explanation"><strong>中文理解提示</strong><p>{unit.sentenceLab.explanationZh}</p></aside>
      </div>
    </LessonPanel>
  );
}

function ComprehensionSection({
  unit,
  answers,
  onAnswer,
}: {
  unit: HackersPaintersUnit;
  answers: Record<string, number>;
  onAnswer: (questionIndex: number, answerIndex: number) => void;
}) {
  const answeredCount = Object.keys(answers).length;
  return (
    <LessonPanel kicker="UNDERSTANDING CHECK" title="Follow the argument" intro="Choose the answer supported by the passage—not simply the statement that sounds reasonable.">
      <div className="hp-check-summary"><strong>{answeredCount}/{unit.comprehension.length}</strong><span>questions answered</span></div>
      <div className="hp-question-list">
        {unit.comprehension.map((question, questionIndex) => {
          const answer = answers[String(questionIndex)];
          const hasAnswer = typeof answer === "number";
          const correct = answer === question.answerIndex;
          return (
            <article key={question.prompt}>
              <div className="hp-question-number">{String(questionIndex + 1).padStart(2, "0")}</div>
              <div className="hp-question-body">
                <h3>{question.prompt}</h3>
                {question.promptZh && <p className="hp-question-zh">{question.promptZh}</p>}
                <div className="hp-answer-list">
                  {question.options.map((option, answerIndex) => {
                    const selected = answer === answerIndex;
                    const revealCorrect = hasAnswer && answerIndex === question.answerIndex;
                    return (
                      <button
                        className={`${selected ? "is-selected" : ""}${revealCorrect ? " is-correct" : ""}`}
                        type="button"
                        key={option}
                        onClick={() => onAnswer(questionIndex, answerIndex)}
                      >
                        <span>{String.fromCharCode(65 + answerIndex)}</span>{option}
                      </button>
                    );
                  })}
                </div>
                {hasAnswer && (
                  <div className={`hp-answer-feedback ${correct ? "is-correct" : "is-review"}`}>
                    <strong>{correct ? "Well reasoned." : "Look back at the passage."}</strong>
                    <p>{question.explanation}</p>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </LessonPanel>
  );
}

function SpeakingSection({
  unit,
  practised,
  activeSpeechKey,
  onSpeak,
  onMarkPractised,
}: {
  unit: HackersPaintersUnit;
  practised: boolean;
  activeSpeechKey: string | null;
  onSpeak: (text: string, key: string) => void;
  onMarkPractised: () => void;
}) {
  return (
    <LessonPanel kicker="SPEAK FROM THE IDEA" title="Explain it without reading" intro="Take thirty seconds to plan, then speak for about one minute. Clear thinking matters more than a perfect accent.">
      <div className="hp-speaking-card">
        <p className="hp-speaking-card__prompt">{unit.speakingPrompt.prompt}</p>
        <p className="hp-speaking-card__zh">{unit.speakingPrompt.promptZh}</p>
        <button type="button" onClick={() => onSpeak(unit.speakingPrompt.prompt, "speaking-prompt")}>
          {activeSpeechKey === "speaking-prompt" ? "■ Stop prompt" : "▶ Hear the prompt"}
        </button>
      </div>
      <div className="hp-speaking-starters">
        <p>USE ONE STARTER IF YOU NEED IT</p>
        {unit.speakingPrompt.starters.map((starter, index) => (
          <button type="button" key={starter} onClick={() => onSpeak(starter, `starter-${index}`)}>
            <span>{String(index + 1).padStart(2, "0")}</span>{starter}<i aria-hidden="true">▶</i>
          </button>
        ))}
      </div>
      <div className="hp-speaking-action">
        <div><strong>Ready?</strong><p>Put the screen down, look away, and explain the idea aloud.</p></div>
        <button className={practised ? "is-complete" : ""} type="button" onClick={onMarkPractised}>
          {practised ? "✓ I practised this" : "I spoke for one minute"}
        </button>
      </div>
    </LessonPanel>
  );
}

function WritingSection({
  unit,
  draft,
  onChange,
}: {
  unit: HackersPaintersUnit;
  draft: string;
  onChange: (draft: string) => void;
}) {
  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  return (
    <LessonPanel kicker="SHORT RESPONSE" title="Make the idea yours" intro="Write 80–120 words. Use the passage as evidence, but express the connection in your own English.">
      <div className="hp-writing-prompt">
        <small>YOUR QUESTION</small>
        <h3>{unit.writingPrompt.prompt}</h3>
        <p>{unit.writingPrompt.promptZh}</p>
      </div>
      <div className="hp-writing-editor">
        <div className="hp-writing-editor__toolbar">
          <span>Your response</span>
          <span>{wordCount} words · saved on this device</span>
        </div>
        <textarea
          value={draft}
          onChange={(event) => onChange(event.target.value.slice(0, 8_000))}
          placeholder={unit.writingPrompt.starter}
          rows={12}
          aria-label="Your written response"
        />
        <p><strong>Optional opening:</strong> {unit.writingPrompt.starter}</p>
      </div>
    </LessonPanel>
  );
}
