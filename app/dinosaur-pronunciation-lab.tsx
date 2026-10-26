"use client";

/* eslint-disable @next/next/no-img-element -- dinosaur source images are local, pre-sized lesson assets */

import { useMemo, useState, type CSSProperties } from "react";
import {
  DINOSAUR_PRONUNCIATION_LESSONS,
  dinosaurPronunciationImageCreditById,
} from "./dinosaur-pronunciation-data";
import type { NarrationPace, NarrationPurpose } from "./narration";

export type DinosaurPronunciationId = (typeof DINOSAUR_PRONUNCIATION_LESSONS)[number]["id"];

type NarratorLike = {
  speak: (
    text: string,
    options?: {
      purpose?: NarrationPurpose;
      activeKey?: string;
      audioSrc?: string;
      preparedOnly?: boolean;
    },
  ) => void;
  stop: () => void;
  activeKey: string | null;
  supported: boolean;
  pace: NarrationPace;
  setPace: (pace: NarrationPace) => void;
};

type DinosaurPronunciationLabProps = {
  dinosaurId: DinosaurPronunciationId | null;
  exploredIds: DinosaurPronunciationId[];
  lastDinosaurId?: DinosaurPronunciationId;
  narrator: NarratorLike;
  onBack: () => void;
  onHome: () => void;
  onOpenDinosaur: (dinosaurId: DinosaurPronunciationId) => void;
  onMarkExplored: (dinosaurId: DinosaurPronunciationId) => void;
};

type PracticeStage = "whole" | "chunks" | "blend" | "say";

const DIFFICULTY = {
  1: { label: "Easy start", labelZh: "热身", icon: "🌱", colour: "#2f8166" },
  2: { label: "Big bite", labelZh: "进阶", icon: "🦴", colour: "#d47846" },
  3: { label: "Expert roar", labelZh: "挑战", icon: "🦖", colour: "#78589a" },
} as const;

const STAGES: Array<{ id: PracticeStage; label: string; labelZh: string; icon: string }> = [
  { id: "whole", label: "Hear it", labelZh: "听整词", icon: "👂" },
  { id: "chunks", label: "Tap chunks", labelZh: "点音节", icon: "👆" },
  { id: "blend", label: "Blend it", labelZh: "连起来", icon: "🧩" },
  { id: "say", label: "Say it", labelZh: "我来读", icon: "🗣️" },
];

export function DinosaurPronunciationLab({
  dinosaurId,
  exploredIds,
  lastDinosaurId,
  narrator,
  onBack,
  onHome,
  onOpenDinosaur,
  onMarkExplored,
}: DinosaurPronunciationLabProps) {
  const exploredSet = useMemo(() => new Set(exploredIds), [exploredIds]);
  const completedCount = DINOSAUR_PRONUNCIATION_LESSONS.filter((item) => exploredSet.has(item.id)).length;

  if (!dinosaurId) {
    const lastDinosaur = lastDinosaurId
      ? DINOSAUR_PRONUNCIATION_LESSONS.find((item) => item.id === lastDinosaurId)
      : undefined;

    return (
      <main className="dino-pronunciation-lab dino-pronunciation-lab--home" aria-labelledby="dino-pronunciation-title">
        <PronunciationHeader
          backLabel="Back to my bookshelf"
          completedCount={completedCount}
          onBack={onBack}
        />

        <section className="dino-pronunciation-hero">
          <div className="dino-pronunciation-hero__copy">
            <p className="eyebrow">Hear · Break · Blend · Roar</p>
            <h1 id="dino-pronunciation-title">Dinosaur Name Lab</h1>
            <p>恐龙名字发音实验室：把长长的英文名字拆开，再像拼积木一样连起来。</p>
            {lastDinosaur && (
              <button className="button button--sun" type="button" onClick={() => onOpenDinosaur(lastDinosaur.id)}>
                Continue {lastDinosaur.name} <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
          <div className="dino-pronunciation-hero__meter" aria-label={`${completedCount} of ${DINOSAUR_PRONUNCIATION_LESSONS.length} dinosaur names explored`}>
            <span aria-hidden="true">🦕</span>
            <strong>{completedCount}<small>/{DINOSAUR_PRONUNCIATION_LESSONS.length}</small></strong>
            <p>names explored</p>
          </div>
        </section>

        <section className="dino-pronunciation-how" aria-label="How to use the pronunciation lab">
          {STAGES.map((stage, index) => (
            <div key={stage.id}>
              <span aria-hidden="true">{stage.icon}</span>
              <small>Step {index + 1}</small>
              <strong>{stage.label}</strong>
              <p>{stage.labelZh}</p>
            </div>
          ))}
        </section>

        <section className="dino-pronunciation-picker" aria-labelledby="dino-pronunciation-picker-title">
          <div className="dino-pronunciation-picker__heading">
            <div>
              <p className="eyebrow">{DINOSAUR_PRONUNCIATION_LESSONS.length} magnificent names</p>
              <h2 id="dino-pronunciation-picker-title">Choose your dinosaur</h2>
            </div>
            <p>先从热身开始，也可以直接选最喜欢的。</p>
          </div>

          {([1, 2, 3] as const).map((level) => {
            const levelMeta = DIFFICULTY[level];
            const levelDinosaurs = DINOSAUR_PRONUNCIATION_LESSONS.filter((item) => item.difficulty === level);
            if (!levelDinosaurs.length) return null;

            return (
              <section
                className="dino-pronunciation-level"
                key={level}
                style={{ "--pronunciation-accent": levelMeta.colour } as CSSProperties}
                aria-labelledby={`dino-pronunciation-level-${level}`}
              >
                <div className="dino-pronunciation-level__heading">
                  <span aria-hidden="true">{levelMeta.icon}</span>
                  <div>
                    <h3 id={`dino-pronunciation-level-${level}`}>{levelMeta.label} · {levelMeta.labelZh}</h3>
                    <p>{level === 1 ? "Start with friendly sound patterns." : level === 2 ? "Take on longer names one chunk at a time." : "Ready for a mighty pronunciation challenge?"}</p>
                  </div>
                  <strong>{levelDinosaurs.length} names</strong>
                </div>

                <div className="dino-pronunciation-grid">
                  {levelDinosaurs.map((dinosaur) => {
                    const explored = exploredSet.has(dinosaur.id);
                    const nameNumber = DINOSAUR_PRONUNCIATION_LESSONS.findIndex((item) => item.id === dinosaur.id) + 1;
                    return (
                      <article
                        className="dino-pronunciation-card"
                        data-difficulty={dinosaur.difficulty}
                        key={dinosaur.id}
                        style={{ "--pronunciation-accent": levelMeta.colour } as CSSProperties}
                      >
                        <button type="button" onClick={() => onOpenDinosaur(dinosaur.id)} aria-label={`Practise pronouncing ${dinosaur.name}`}>
                          <div className="dino-pronunciation-card__picture">
                            <img src={dinosaur.imageSrc} alt="" loading="lazy" decoding="async" />
                            <span>{explored ? "✓ Explored" : `Name ${nameNumber}`}</span>
                          </div>
                          <div className="dino-pronunciation-card__body">
                            <div className="dino-pronunciation-card__level">
                              <span aria-hidden="true">{levelMeta.icon}</span>
                              <strong>{levelMeta.label}</strong>
                              <small>{levelMeta.labelZh}</small>
                            </div>
                            <h3>{dinosaur.name}</h3>
                            <p>{dinosaur.nameZh}</p>
                            <div className="dino-pronunciation-card__chunks" aria-label={`${dinosaur.chunks.length} sound chunks`}>
                              {dinosaur.chunks.map((chunk) => <span key={chunk.id}>{chunk.text}</span>)}
                            </div>
                          </div>
                          <span className="dino-pronunciation-card__open">Hear this name <span aria-hidden="true">→</span></span>
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </section>

        <SourceNote />
      </main>
    );
  }

  const dinosaur = DINOSAUR_PRONUNCIATION_LESSONS.find((item) => item.id === dinosaurId);
  if (!dinosaur) return null;

  return (
    <PronunciationLesson
      key={dinosaur.id}
      dinosaur={dinosaur}
      completedCount={completedCount}
      explored={exploredSet.has(dinosaur.id)}
      exploredSet={exploredSet}
      narrator={narrator}
      onHome={onHome}
      onOpenDinosaur={onOpenDinosaur}
      onMarkExplored={onMarkExplored}
    />
  );
}

type PronunciationLessonProps = {
  dinosaur: (typeof DINOSAUR_PRONUNCIATION_LESSONS)[number];
  completedCount: number;
  explored: boolean;
  exploredSet: Set<DinosaurPronunciationId>;
  narrator: NarratorLike;
  onHome: () => void;
  onOpenDinosaur: (dinosaurId: DinosaurPronunciationId) => void;
  onMarkExplored: (dinosaurId: DinosaurPronunciationId) => void;
};

function PronunciationLesson({
  dinosaur,
  completedCount,
  explored,
  exploredSet,
  narrator,
  onHome,
  onOpenDinosaur,
  onMarkExplored,
}: PronunciationLessonProps) {
  const [heardWhole, setHeardWhole] = useState(false);
  const [tappedChunks, setTappedChunks] = useState<string[]>([]);
  const [heardBlend, setHeardBlend] = useState(false);
  const [saidIt, setSaidIt] = useState(explored);
  const difficulty = DIFFICULTY[dinosaur.difficulty];
  const allChunksTapped = dinosaur.chunks.every((chunk) => tappedChunks.includes(chunk.id));
  const wholeKey = `dino-pronunciation-${dinosaur.id}-whole`;
  const coachKey = `dino-pronunciation-${dinosaur.id}-coach`;
  const descriptionKey = `dino-pronunciation-${dinosaur.id}-description`;
  const imageCredit = dinosaurPronunciationImageCreditById(dinosaur.id);
  const currentDifficultyLessons = DINOSAUR_PRONUNCIATION_LESSONS.filter(
    (item) => item.difficulty === dinosaur.difficulty,
  );

  const playWhole = () => {
    setHeardWhole(true);
    if (narrator.activeKey === wholeKey) narrator.stop();
    else narrator.speak(dinosaur.name, {
      purpose: "practice",
      activeKey: wholeKey,
      audioSrc: dinosaur.nameAudioSrc,
      preparedOnly: true,
    });
  };

  const playChunk = (chunk: (typeof dinosaur.chunks)[number]) => {
    setTappedChunks((current) => current.includes(chunk.id) ? current : [...current, chunk.id]);
    const key = `dino-pronunciation-${dinosaur.id}-chunk-${chunk.id}`;
    if (narrator.activeKey === key) narrator.stop();
    else narrator.speak(chunk.cue, {
      purpose: "practice",
      activeKey: key,
      audioSrc: `/dinosaur-pronunciation-audio/${dinosaur.id}/chunk-${chunk.id}.mp3`,
      preparedOnly: true,
    });
  };

  const playCoach = () => {
    setHeardBlend(true);
    if (narrator.activeKey === coachKey) narrator.stop();
    else narrator.speak(`${dinosaur.chunks.map((chunk) => chunk.cue).join(". ")}. ${dinosaur.name}.`, {
      purpose: "practice",
      activeKey: coachKey,
      audioSrc: dinosaur.coachAudioSrc,
      preparedOnly: true,
    });
  };

  const playDescription = () => {
    if (narrator.activeKey === descriptionKey) narrator.stop();
    else narrator.speak(dinosaur.description.join(" "), {
      purpose: "practice",
      activeKey: descriptionKey,
      audioSrc: dinosaur.descriptionAudioSrc,
      preparedOnly: true,
    });
  };

  const confirmSaidIt = () => {
    setSaidIt(true);
    onMarkExplored(dinosaur.id);
  };

  const currentStage = !heardWhole
    ? "whole"
    : !allChunksTapped
      ? "chunks"
      : !heardBlend
        ? "blend"
        : "say";

  return (
    <main
      className="dino-pronunciation-lab dino-pronunciation-lab--lesson"
      data-difficulty={dinosaur.difficulty}
      style={{ "--pronunciation-accent": difficulty.colour } as CSSProperties}
      aria-labelledby="dino-pronunciation-lesson-title"
    >
      <PronunciationHeader
        backLabel="Back to all dinosaur names"
        completedCount={completedCount}
        onBack={onHome}
      />

      <nav className="dino-pronunciation-tabs" aria-label="Dinosaur pronunciation lessons">
        {currentDifficultyLessons.map((item) => (
          <button
            className={`${item.id === dinosaur.id ? "is-current" : ""} ${exploredSet.has(item.id) ? "is-done" : ""}`}
            key={item.id}
            type="button"
            aria-current={item.id === dinosaur.id ? "page" : undefined}
            aria-label={`Practise ${item.name}${exploredSet.has(item.id) ? ", explored" : ""}`}
            onClick={() => onOpenDinosaur(item.id)}
          >
            <span aria-hidden="true">{exploredSet.has(item.id) ? "✓" : "🦖"}</span>
            <strong>{item.name}</strong>
          </button>
        ))}
      </nav>

      <section className="dino-pronunciation-lesson-hero">
        <div>
          <p className="eyebrow">{difficulty.icon} {difficulty.label} · {difficulty.labelZh}</p>
          <h1 id="dino-pronunciation-lesson-title">{dinosaur.name}</h1>
          <p>{dinosaur.nameZh}</p>
        </div>
        <div className="dino-pronunciation-pace" aria-label="Reading speed">
          <small>Voice speed · 语速</small>
          <div>
            <button
              className={narrator.pace === "child" ? "is-current" : ""}
              type="button"
              aria-pressed={narrator.pace === "child"}
              onClick={() => {
                narrator.stop();
                narrator.setPace("child");
              }}
            >
              🐢 Child slow
            </button>
            <button
              className={narrator.pace === "standard" ? "is-current" : ""}
              type="button"
              aria-pressed={narrator.pace === "standard"}
              onClick={() => {
                narrator.stop();
                narrator.setPace("standard");
              }}
            >
              ▶ Standard
            </button>
          </div>
        </div>
      </section>

      <section className="dino-pronunciation-workspace">
        <aside className="dino-pronunciation-profile">
          <div className="dino-pronunciation-profile__picture">
            <img src={dinosaur.imageSrc} alt={`${dinosaur.name}, ${dinosaur.nameZh}`} />
          </div>
          {imageCredit && (
            <p className="dino-pronunciation-profile__credit">
              Image: <a href={imageCredit.sourceUrl} target="_blank" rel="noreferrer">{imageCredit.author}</a>
              {" · "}<a href={imageCredit.licenseUrl} target="_blank" rel="noreferrer">{imageCredit.license}</a>
              {" · adapted: resized and placed on white"}
            </p>
          )}
          <section
            className={`dino-pronunciation-profile__pronunciation ${heardWhole ? "is-done" : ""}`}
            aria-labelledby="dino-whole-title"
          >
            <div className="dino-pronunciation-profile__pronunciation-heading">
              <span aria-hidden="true">{heardWhole ? "✓" : "1"}</span>
              <div>
                <small>Dinosaur name · 恐龙名字</small>
                <h2 id="dino-whole-title">Listen, then say it</h2>
              </div>
            </div>
            <button
              className={`dino-pronunciation-play dino-pronunciation-play--primary ${narrator.activeKey === wholeKey ? "is-speaking" : ""}`}
              type="button"
              disabled={!narrator.supported}
              onClick={playWhole}
            >
              <span aria-hidden="true">{narrator.activeKey === wholeKey ? "■" : "🔊"}</span>
              <strong>{narrator.activeKey === wholeKey ? "Stop" : dinosaur.name}</strong>
              <small>{narrator.activeKey === wholeKey ? "停止" : "听完整发音"}</small>
            </button>
            <p className="dino-pronunciation-profile__pronunciation-guide">
              <strong>{dinosaur.pronunciation}</strong>
              <span>{dinosaur.ipa}</span>
            </p>
          </section>
        </aside>

        <div className="dino-pronunciation-overview">
          <section className="dino-pronunciation-description" aria-labelledby="dino-description-title">
            <div className="dino-pronunciation-description__heading">
              <span aria-hidden="true">📖</span>
              <div>
                <small>Simple English · 简单英文</small>
                <h2 id="dino-description-title">Meet this dinosaur · 认识它</h2>
                <p>听三句简单英文。先听懂大意，再找出三个关键词。</p>
              </div>
              <button
                className={narrator.activeKey === descriptionKey ? "is-speaking" : ""}
                type="button"
                disabled={!narrator.supported}
                onClick={playDescription}
              >
                <span aria-hidden="true">{narrator.activeKey === descriptionKey ? "■" : "🔊"}</span>
                <strong>{narrator.activeKey === descriptionKey ? "Stop" : "Hear all 3 sentences"}</strong>
                <small>{narrator.activeKey === descriptionKey ? "停止" : "听完整介绍"}</small>
              </button>
            </div>

            <ol className="dino-pronunciation-description__sentences">
              {dinosaur.description.map((sentence, index) => (
                <li key={`${dinosaur.id}-description-${index}`}>
                  <span aria-hidden="true">{index + 1}</span>
                  <div>
                    <strong>{sentence}</strong>
                    <p>{dinosaur.descriptionZh[index]}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="dino-pronunciation-description__keywords" aria-label="Three English keywords">
              <small>3 key words · 三个关键词</small>
              <div>
                {dinosaur.descriptionKeywords.map((keyword) => (
                  <span key={keyword.word}><strong>{keyword.word}</strong><small>{keyword.zh}</small></span>
                ))}
              </div>
            </div>
          </section>

          <div className="dino-pronunciation-insights">
            <div className="dino-pronunciation-profile__fact">
              <span aria-hidden="true">🔎</span>
              <div>
                <small>Dino discovery · 恐龙发现</small>
                <strong>{dinosaur.fact}</strong>
                <p>{dinosaur.factZh}</p>
              </div>
            </div>
            <div className="dino-pronunciation-profile__tip">
              <span aria-hidden="true">💡</span>
              <div><strong>{dinosaur.soundTip}</strong><p>{dinosaur.soundTipZh}</p></div>
            </div>
          </div>
        </div>

        <div className="dino-pronunciation-practice">
          <ol className="dino-pronunciation-steps" aria-label="Pronunciation practice steps">
            {STAGES.map((stage, index) => {
              const done = stage.id === "whole" ? heardWhole
                : stage.id === "chunks" ? allChunksTapped
                  : stage.id === "blend" ? heardBlend
                    : saidIt;
              return (
                <li className={`${stage.id === currentStage ? "is-current" : ""} ${done ? "is-done" : ""}`} key={stage.id}>
                  <span>{done ? "✓" : index + 1}</span>
                  <strong>{stage.label}</strong>
                  <small>{stage.labelZh}</small>
                </li>
              );
            })}
          </ol>

          <section className={`dino-pronunciation-task ${allChunksTapped ? "is-done" : ""}`} aria-labelledby="dino-chunks-title">
            <div className="dino-pronunciation-task__number">2</div>
            <div className="dino-pronunciation-task__copy">
              <small>Build the name · 拆开练</small>
              <h2 id="dino-chunks-title">Tap every sound chunk</h2>
              <p>从左到右点一点。橙色、标着 strong 的音节要读得更有力。</p>
            </div>
            <div className="dino-pronunciation-chunks">
              {dinosaur.chunks.map((chunk) => {
                const key = `dino-pronunciation-${dinosaur.id}-chunk-${chunk.id}`;
                const tapped = tappedChunks.includes(chunk.id);
                return (
                  <button
                    className={`${chunk.stressed ? "is-stressed" : ""} ${tapped ? "is-tapped" : ""} ${narrator.activeKey === key ? "is-speaking" : ""}`}
                    key={chunk.id}
                    type="button"
                    disabled={!heardWhole || !narrator.supported}
                    aria-label={`Hear ${chunk.cue}${chunk.stressed ? ", stressed sound" : ""}`}
                    onClick={() => playChunk(chunk)}
                  >
                    <span aria-hidden="true">{narrator.activeKey === key ? "■" : tapped ? "✓" : "🔊"}</span>
                    <strong>{chunk.text}</strong>
                    <small>{chunk.cue}{chunk.stressed ? " · strong" : ""}</small>
                  </button>
                );
              })}
            </div>
            {!heardWhole && <p className="dino-pronunciation-lock">先听一次完整名字，就能打开声音积木。</p>}
          </section>

          <section className={`dino-pronunciation-task ${heardBlend ? "is-done" : ""}`} aria-labelledby="dino-blend-title">
            <div className="dino-pronunciation-task__number">3</div>
            <div className="dino-pronunciation-task__copy">
              <small>Slow, then smooth · 慢慢连</small>
              <h2 id="dino-blend-title">Hear the chunks join together</h2>
              <p>老师会先分开读，再把名字完整地连起来。</p>
            </div>
            <button
              className={`dino-pronunciation-play ${narrator.activeKey === coachKey ? "is-speaking" : ""}`}
              type="button"
              disabled={!allChunksTapped || !narrator.supported}
              onClick={playCoach}
            >
              <span aria-hidden="true">{narrator.activeKey === coachKey ? "■" : "🧩"}</span>
              <strong>{narrator.activeKey === coachKey ? "Stop" : "Hear the blend"}</strong>
              <small>{narrator.activeKey === coachKey ? "停止" : "听合并示范"}</small>
            </button>
          </section>

          <section className={`dino-pronunciation-task dino-pronunciation-task--say ${saidIt ? "is-done" : ""}`} aria-labelledby="dino-say-title">
            <div className="dino-pronunciation-task__number">4</div>
            <div className="dino-pronunciation-task__copy">
              <small>Your turn · 轮到你</small>
              <h2 id="dino-say-title">Take a breath. Say the whole name!</h2>
              <p>看着音节，自己大声读。我们不录音，也不打分。</p>
            </div>
            <div className="dino-pronunciation-say-line" aria-label={`${dinosaur.name} split into sound chunks`}>
              {dinosaur.chunks.map((chunk) => (
                <span className={chunk.stressed ? "is-stressed" : ""} key={chunk.id}>{chunk.text}</span>
              ))}
            </div>
            {heardBlend ? (
              <button className={`button ${saidIt ? "button--light" : "button--green"}`} type="button" onClick={saidIt ? onHome : confirmSaidIt}>
                {saidIt ? "✓ Choose another dinosaur" : "I said it! · 我读出来了"}
              </button>
            ) : (
              <p className="dino-pronunciation-lock">完成前面三步，再来一次自信的恐龙吼！</p>
            )}
          </section>

          <p className="dino-pronunciation-live" aria-live="polite">
            {saidIt
              ? `Great roar! You explored ${dinosaur.name}.`
              : currentStage === "whole"
                ? "Ready? Tap the big speaker and listen."
                : currentStage === "chunks"
                  ? "Now tap each sound chunk from left to right."
                  : currentStage === "blend"
                    ? "Wonderful. Hear how the chunks blend together."
                    : "Your turn: say the whole dinosaur name!"}
          </p>

        </div>
      </section>

      <SourceNote />
    </main>
  );
}

function PronunciationHeader({ onBack, backLabel, completedCount }: { onBack: () => void; backLabel: string; completedCount: number }) {
  return (
    <header className="dino-pronunciation-header">
      <button className="round-button" type="button" onClick={onBack} aria-label={backLabel}>←</button>
      <div className="dino-pronunciation-header__brand">
        <span aria-hidden="true">🦖</span>
        <span><small>Story Garden</small><strong>Dinosaur Name Lab</strong></span>
      </div>
      <span className="dino-pronunciation-header__score"><b>{completedCount}</b> names explored</span>
    </header>
  );
}

function SourceNote() {
  return (
    <footer className="dino-pronunciation-sources">
      <span aria-hidden="true">🔬</span>
      <p>
        Dinosaur images used for this personal learning activity from{" "}
        <a href="https://www.abcmouse.com/learn/printables-and-worksheets/dinosaur-names-and-facts-for-kids/80307" target="_blank" rel="noreferrer">ABCmouse</a>
        {" and "}<a href="https://commons.wikimedia.org/" target="_blank" rel="noreferrer">Wikimedia Commons</a>; Commons credits appear on each new dinosaur lesson.
        Pronunciation guides and facts checked with the{" "}
        <a href="https://www.nhm.ac.uk/discover/dino-directory/index.html" target="_blank" rel="noreferrer">Natural History Museum Dino Directory</a>.
        English accents can sound a little different.
      </p>
    </footer>
  );
}
