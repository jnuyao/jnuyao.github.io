"use client";

/* eslint-disable @next/next/no-img-element -- lesson photographs are local, credited and pre-sized */

import { useMemo, useState, type CSSProperties } from "react";
import {
  EVERYDAY_DISCOVERY_ITEMS,
  EVERYDAY_DISCOVERY_SCENES,
  everydayDiscoveryItemById,
  everydayDiscoveryItemsForScene,
  everydayDiscoverySceneById,
  type EverydayDiscoveryId,
  type EverydayDiscoveryItem,
  type EverydayDiscoverySceneId,
} from "./everyday-discovery-data";
import type { NarrationPace, NarrationPurpose } from "./narration";

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

type EverydayDiscoveryLabProps = {
  sceneId: EverydayDiscoverySceneId | null;
  itemId: EverydayDiscoveryId | null;
  exploredIds: EverydayDiscoveryId[];
  completedChallengeIds: EverydayDiscoverySceneId[];
  lastSceneId?: EverydayDiscoverySceneId;
  lastItemId?: EverydayDiscoveryId;
  narrator: NarratorLike;
  onBack: () => void;
  onHome: () => void;
  onOpenScene: (sceneId: EverydayDiscoverySceneId) => void;
  onOpenItem: (itemId: EverydayDiscoveryId) => void;
  onCompleteItem: (itemId: EverydayDiscoveryId, spellingAttempts: number) => void;
  onCompleteChallenge: (sceneId: EverydayDiscoverySceneId) => void;
};

type PracticeStage = "whole" | "chunks" | "blend" | "say" | "spell";

const STAGES: Array<{
  id: PracticeStage;
  label: string;
  labelZh: string;
  icon: string;
}> = [
  { id: "whole", label: "Hear it", labelZh: "听整词", icon: "👂" },
  { id: "chunks", label: "Tap sounds", labelZh: "点声音", icon: "👆" },
  { id: "blend", label: "Blend it", labelZh: "连起来", icon: "🧩" },
  { id: "say", label: "Say it", labelZh: "我来读", icon: "🗣️" },
  { id: "spell", label: "Spell it", labelZh: "拼出来", icon: "🔤" },
];

function sceneProgress(sceneId: EverydayDiscoverySceneId, explored: Set<EverydayDiscoveryId>) {
  return everydayDiscoveryItemsForScene(sceneId).filter((item) => explored.has(item.id)).length;
}

function spellingLettersFor(word: string) {
  return word.toLowerCase().replace(/[^a-z]/g, "").split("");
}

function letterTilesFor(item: EverydayDiscoveryItem) {
  const tiles = spellingLettersFor(item.word).map((letter, index) => ({
    id: `${item.id}-${index}-${letter}`,
    letter,
  }));
  let seed = [...item.id].reduce((total, character) => total + character.charCodeAt(0), 17);
  const shuffled = [...tiles];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    seed = (seed * 9301 + 49297) % 233280;
    const swapIndex = Math.floor((seed / 233280) * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  if (
    shuffled.length > 2
    && shuffled.map((tile) => tile.id).join("|") === tiles.map((tile) => tile.id).join("|")
  ) {
    shuffled.push(shuffled.shift()!);
  }
  return shuffled;
}

export function EverydayDiscoveryLab({
  sceneId,
  itemId,
  exploredIds,
  completedChallengeIds,
  lastSceneId,
  lastItemId,
  narrator,
  onBack,
  onHome,
  onOpenScene,
  onOpenItem,
  onCompleteItem,
  onCompleteChallenge,
}: EverydayDiscoveryLabProps) {
  const exploredSet = useMemo(() => new Set(exploredIds), [exploredIds]);
  const challengeSet = useMemo(
    () => new Set(completedChallengeIds),
    [completedChallengeIds],
  );

  if (itemId) {
    const lesson = everydayDiscoveryItemById(itemId);
    if (!lesson) return null;
    return (
      <EverydayDiscoveryLesson
        key={lesson.id}
        item={lesson}
        explored={exploredSet.has(lesson.id)}
        exploredSet={exploredSet}
        narrator={narrator}
        onHome={() => onOpenScene(lesson.sceneId)}
        onOpenItem={onOpenItem}
        onCompleteItem={onCompleteItem}
      />
    );
  }

  if (sceneId) {
    const scene = everydayDiscoverySceneById(sceneId);
    if (!scene) return null;
    const items = everydayDiscoveryItemsForScene(scene.id);
    const completedCount = sceneProgress(scene.id, exploredSet);
    const lastItem = lastItemId
      ? items.find((candidate) => candidate.id === lastItemId)
      : undefined;

    return (
      <main
        className="dino-pronunciation-lab dino-pronunciation-lab--home everyday-discovery-lab everyday-discovery-lab--scene"
        style={{ "--pronunciation-accent": scene.accent } as CSSProperties}
        aria-labelledby="everyday-scene-title"
      >
        <EverydayHeader
          completedCount={exploredIds.length}
          backLabel="Back to all everyday scenes"
          onBack={onHome}
        />

        <section className="dino-pronunciation-hero everyday-discovery-scene-hero">
          <div className="dino-pronunciation-hero__copy">
            <p className="eyebrow">{scene.icon} {scene.eyebrow}</p>
            <h1 id="everyday-scene-title">{scene.title}</h1>
            <p><strong>{scene.titleZh}</strong><br />{scene.descriptionZh}</p>
            {lastItem && !exploredSet.has(lastItem.id) && (
              <button className="button button--sun" type="button" onClick={() => onOpenItem(lastItem.id)}>
                Continue {lastItem.word} <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
          <div className="dino-pronunciation-hero__meter" aria-label={`${completedCount} of ${items.length} words explored`}>
            <span aria-hidden="true">{scene.icon}</span>
            <strong>{completedCount}<small>/{items.length}</small></strong>
            <p>words explored</p>
          </div>
        </section>

        <section className="dino-pronunciation-picker everyday-discovery-picker" aria-labelledby="everyday-word-picker-title">
          <div className="dino-pronunciation-picker__heading">
            <div>
              <p className="eyebrow">See · Hear · Say · Spell</p>
              <h2 id="everyday-word-picker-title">Choose a word</h2>
            </div>
            <p>每次学一个，先看图和听声音，再把字母拼起来。</p>
          </div>

          <div className="dino-pronunciation-grid everyday-discovery-word-grid">
            {items.map((item, index) => (
              <EverydayWordCard
                item={item}
                index={index + 1}
                explored={exploredSet.has(item.id)}
                accent={scene.accent}
                key={item.id}
                onOpen={() => onOpenItem(item.id)}
              />
            ))}
          </div>
        </section>

        <SceneChallenge
          sceneId={scene.id}
          completed={challengeSet.has(scene.id)}
          accent={scene.accent}
          onComplete={onCompleteChallenge}
        />
        <EverydaySourceNote />
      </main>
    );
  }

  const lastScene = lastSceneId
    ? everydayDiscoverySceneById(lastSceneId)
    : undefined;

  return (
    <main className="dino-pronunciation-lab dino-pronunciation-lab--home everyday-discovery-lab" aria-labelledby="everyday-discovery-title">
      <EverydayHeader
        completedCount={exploredIds.length}
        backLabel="Back to my bookshelf"
        onBack={onBack}
      />

      <section className="dino-pronunciation-hero everyday-discovery-hero">
        <div className="dino-pronunciation-hero__copy">
          <p className="eyebrow">See · Hear · Say · Spell</p>
          <h1 id="everyday-discovery-title">Everyday Discovery Lab</h1>
          <p>生活探索实验室：走进厨房、超市、学校和更多日常场景，把身边的英文变成看得见、听得懂、说得出、拼得成的词。</p>
          {lastScene && (
            <button className="button button--sun" type="button" onClick={() => onOpenScene(lastScene.id)}>
              Continue {lastScene.title} <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
        <div className="dino-pronunciation-hero__meter" aria-label={`${exploredIds.length} of ${EVERYDAY_DISCOVERY_ITEMS.length} words explored`}>
          <span aria-hidden="true">🔎</span>
          <strong>{exploredIds.length}<small>/{EVERYDAY_DISCOVERY_ITEMS.length}</small></strong>
          <p>words explored</p>
        </div>
      </section>

      <section className="dino-pronunciation-how everyday-discovery-how" aria-label="How to use the everyday discovery lab">
        {[
          { icon: "👀", label: "See it", labelZh: "看真实图片" },
          { icon: "🔊", label: "Hear it", labelZh: "听清发音" },
          { icon: "📖", label: "Meet it", labelZh: "懂三句英文" },
          { icon: "🔤", label: "Spell it", labelZh: "拼出单词" },
        ].map((stage, index) => (
          <div key={stage.label}>
            <span aria-hidden="true">{stage.icon}</span>
            <small>Step {index + 1}</small>
            <strong>{stage.label}</strong>
            <p>{stage.labelZh}</p>
          </div>
        ))}
      </section>

      <section className="dino-pronunciation-picker everyday-discovery-scene-picker" aria-labelledby="everyday-scene-picker-title">
        <div className="dino-pronunciation-picker__heading">
          <div>
            <p className="eyebrow">{EVERYDAY_DISCOVERY_SCENES.length} places to explore</p>
            <h2 id="everyday-scene-picker-title">Where shall we explore?</h2>
          </div>
          <p>先选一个孩子感兴趣的场景，不必按顺序完成。</p>
        </div>

        <div className="everyday-discovery-scene-grid">
          {EVERYDAY_DISCOVERY_SCENES.map((scene) => {
            const items = everydayDiscoveryItemsForScene(scene.id);
            const completed = sceneProgress(scene.id, exploredSet);
            return (
              <article
                className="everyday-discovery-scene-card"
                key={scene.id}
                style={{ "--pronunciation-accent": scene.accent } as CSSProperties}
              >
                <button type="button" onClick={() => onOpenScene(scene.id)}>
                  <div className="everyday-discovery-scene-card__pictures" aria-hidden="true">
                    {items.slice(0, 3).map((item) => <img src={item.imageSrc} alt="" key={item.id} />)}
                    <span>{scene.icon}</span>
                  </div>
                  <div className="everyday-discovery-scene-card__copy">
                    <p className="eyebrow">{scene.eyebrow}</p>
                    <h2>{scene.title}</h2>
                    <strong>{scene.titleZh}</strong>
                    <p>{scene.descriptionZh}</p>
                    <div>
                      <span>{completed}/{items.length} words</span>
                      <span>{challengeSet.has(scene.id) ? "✓ Mission done" : "1 mini mission"}</span>
                    </div>
                  </div>
                  <span className="everyday-discovery-scene-card__open">Explore this scene <span aria-hidden="true">→</span></span>
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <EverydaySourceNote />
    </main>
  );
}

function EverydayWordCard({
  item,
  index,
  explored,
  accent,
  onOpen,
}: {
  item: EverydayDiscoveryItem;
  index: number;
  explored: boolean;
  accent: string;
  onOpen: () => void;
}) {
  return (
    <article
      className="dino-pronunciation-card everyday-discovery-word-card"
      style={{ "--pronunciation-accent": accent } as CSSProperties}
    >
      <button type="button" onClick={onOpen} aria-label={`Learn ${item.word}`}>
        <div className="dino-pronunciation-card__picture">
          <img src={item.imageSrc} alt="" loading="lazy" decoding="async" />
          <span>{explored ? "✓ Explored" : `Word ${index}`}</span>
        </div>
        <div className="dino-pronunciation-card__body">
          <div className="dino-pronunciation-card__level">
            <span aria-hidden="true">{explored ? "✓" : "🔎"}</span>
            <strong>{item.chunks.length === 1 ? "Quick word" : `${item.chunks.length} sound parts`}</strong>
            <small>{item.wordZh}</small>
          </div>
          <h3>{item.word}</h3>
          <p>{item.wordZh}</p>
          <div className="dino-pronunciation-card__chunks" aria-label={`${item.chunks.length} sound chunks`}>
            {item.chunks.map((chunk) => <span key={chunk.id}>{chunk.text}</span>)}
          </div>
        </div>
        <span className="dino-pronunciation-card__open">See and hear it <span aria-hidden="true">→</span></span>
      </button>
    </article>
  );
}

function EverydayDiscoveryLesson({
  item,
  explored,
  exploredSet,
  narrator,
  onHome,
  onOpenItem,
  onCompleteItem,
}: {
  item: EverydayDiscoveryItem;
  explored: boolean;
  exploredSet: Set<EverydayDiscoveryId>;
  narrator: NarratorLike;
  onHome: () => void;
  onOpenItem: (itemId: EverydayDiscoveryId) => void;
  onCompleteItem: (itemId: EverydayDiscoveryId, spellingAttempts: number) => void;
}) {
  const [heardWhole, setHeardWhole] = useState(explored);
  const [tappedChunks, setTappedChunks] = useState<string[]>(explored ? item.chunks.map((chunk) => chunk.id) : []);
  const [heardBlend, setHeardBlend] = useState(explored);
  const [saidIt, setSaidIt] = useState(explored);
  const [spellingSolved, setSpellingSolved] = useState(explored);
  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [spellingAttempts, setSpellingAttempts] = useState(0);
  const [spellingMessage, setSpellingMessage] = useState("");
  const scene = everydayDiscoverySceneById(item.sceneId)!;
  const sceneItems = everydayDiscoveryItemsForScene(item.sceneId);
  const allChunksTapped = item.chunks.every((chunk) => tappedChunks.includes(chunk.id));
  const tiles = useMemo(() => letterTilesFor(item), [item]);
  const selectedTiles = selectedTileIds.map((id) => tiles.find((tile) => tile.id === id)!).filter(Boolean);
  const builtWord = selectedTiles.map((tile) => tile.letter).join("");
  const wholeKey = `everyday-discovery-${item.id}-whole`;
  const coachKey = `everyday-discovery-${item.id}-coach`;
  const descriptionKey = `everyday-discovery-${item.id}-description`;

  const playWhole = () => {
    setHeardWhole(true);
    if (narrator.activeKey === wholeKey) narrator.stop();
    else narrator.speak(item.word, {
      purpose: "practice",
      activeKey: wholeKey,
      audioSrc: item.wordAudioSrc,
      preparedOnly: true,
    });
  };

  const playChunk = (chunk: (typeof item.chunks)[number]) => {
    setTappedChunks((current) => current.includes(chunk.id) ? current : [...current, chunk.id]);
    const key = `everyday-discovery-${item.id}-chunk-${chunk.id}`;
    if (narrator.activeKey === key) narrator.stop();
    else narrator.speak(chunk.cue, {
      purpose: "practice",
      activeKey: key,
      audioSrc: `/everyday-discovery-audio/${item.sceneId}/${item.id}/chunk-${chunk.id}.mp3`,
      preparedOnly: true,
    });
  };

  const playCoach = () => {
    setHeardBlend(true);
    if (narrator.activeKey === coachKey) narrator.stop();
    else narrator.speak(item.coachScript, {
      purpose: "practice",
      activeKey: coachKey,
      audioSrc: item.coachAudioSrc,
      preparedOnly: true,
    });
  };

  const playDescription = () => {
    if (narrator.activeKey === descriptionKey) narrator.stop();
    else narrator.speak(item.description.join(" "), {
      purpose: "practice",
      activeKey: descriptionKey,
      audioSrc: item.descriptionAudioSrc,
      preparedOnly: true,
    });
  };

  const addLetter = (tileId: string) => {
    if (!saidIt || selectedTileIds.includes(tileId) || spellingSolved) return;
    setSelectedTileIds((current) => [...current, tileId]);
    setSpellingMessage("");
  };

  const removeLetter = () => {
    if (spellingSolved) return;
    setSelectedTileIds((current) => current.slice(0, -1));
    setSpellingMessage("");
  };

  const resetLetters = () => {
    if (spellingSolved) return;
    setSelectedTileIds([]);
    setSpellingMessage("");
  };

  const checkSpelling = () => {
    const nextAttempts = spellingAttempts + 1;
    setSpellingAttempts(nextAttempts);
    if (builtWord.toLowerCase() === spellingLettersFor(item.word).join("")) {
      setSpellingSolved(true);
      setSpellingMessage(`Brilliant! You built ${item.word}.`);
      onCompleteItem(item.id, nextAttempts);
    } else {
      setSpellingMessage("Almost! Look at the sound chunks, then move back one letter and try again.");
    }
  };

  const currentStage: PracticeStage = !heardWhole
    ? "whole"
    : !allChunksTapped
      ? "chunks"
      : !heardBlend
        ? "blend"
        : !saidIt
          ? "say"
          : "spell";

  return (
    <main
      className="dino-pronunciation-lab dino-pronunciation-lab--lesson everyday-discovery-lab everyday-discovery-lab--lesson"
      style={{ "--pronunciation-accent": scene.accent } as CSSProperties}
      aria-labelledby="everyday-lesson-title"
    >
      <EverydayHeader
        completedCount={exploredSet.size}
        backLabel={`Back to ${scene.title}`}
        onBack={onHome}
      />

      <nav className="dino-pronunciation-tabs" aria-label={`${scene.title} word lessons`}>
        {sceneItems.map((candidate) => (
          <button
            className={`${candidate.id === item.id ? "is-current" : ""} ${exploredSet.has(candidate.id) ? "is-done" : ""}`}
            key={candidate.id}
            type="button"
            aria-current={candidate.id === item.id ? "page" : undefined}
            aria-label={`Learn ${candidate.word}${exploredSet.has(candidate.id) ? ", explored" : ""}`}
            onClick={() => onOpenItem(candidate.id)}
          >
            <span aria-hidden="true">{exploredSet.has(candidate.id) ? "✓" : scene.icon}</span>
            <strong>{candidate.word}</strong>
          </button>
        ))}
      </nav>

      <section className="dino-pronunciation-lesson-hero">
        <div>
          <p className="eyebrow">{scene.icon} {scene.title} · {scene.titleZh}</p>
          <h1 id="everyday-lesson-title">{item.word}</h1>
          <p>{item.wordZh}</p>
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

      <section className="dino-pronunciation-workspace everyday-discovery-workspace">
        <aside className="dino-pronunciation-profile">
          <div
            className="dino-pronunciation-profile__picture"
            data-image-fit={["root", "germination"].includes(item.id) ? "contain" : "cover"}
          >
            <img src={item.imageSrc} alt={`${item.word}, ${item.wordZh}`} />
          </div>
          {item.imageCredit && (
            <p className="dino-pronunciation-profile__credit">
              Image: <a href={item.imageCredit.sourceUrl} target="_blank" rel="noreferrer">{item.imageCredit.author}</a>
              {" · "}<a href={item.imageCredit.licenseUrl} target="_blank" rel="noreferrer">{item.imageCredit.license}</a>
              {item.imageCredit.adaptation ? ` · ${item.imageCredit.adaptation}` : ""}
            </p>
          )}
          <section className={`dino-pronunciation-profile__pronunciation ${heardWhole ? "is-done" : ""}`} aria-labelledby="everyday-whole-title">
            <div className="dino-pronunciation-profile__pronunciation-heading">
              <span aria-hidden="true">{heardWhole ? "✓" : "1"}</span>
              <div>
                <small>Word sound · 单词发音</small>
                <h2 id="everyday-whole-title">Listen, then say it</h2>
              </div>
            </div>
            <button
              className={`dino-pronunciation-play dino-pronunciation-play--primary ${narrator.activeKey === wholeKey ? "is-speaking" : ""}`}
              type="button"
              disabled={!narrator.supported}
              onClick={playWhole}
            >
              <span aria-hidden="true">{narrator.activeKey === wholeKey ? "■" : "🔊"}</span>
              <strong>{narrator.activeKey === wholeKey ? "Stop" : item.word}</strong>
              <small>{narrator.activeKey === wholeKey ? "停止" : "听完整发音"}</small>
            </button>
            <p className="dino-pronunciation-profile__pronunciation-guide">
              <strong>{item.pronunciation}</strong>
              <span>{item.ipa}</span>
            </p>
          </section>
        </aside>

        <div className="dino-pronunciation-overview">
          <section className="dino-pronunciation-description" aria-labelledby="everyday-description-title">
            <div className="dino-pronunciation-description__heading">
              <span aria-hidden="true">📖</span>
              <div>
                <small>Simple English · 简单英文</small>
                <h2 id="everyday-description-title">Meet this word · 认识它</h2>
                <p>听三句简单英文，再找出三个关键词。</p>
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
              {item.description.map((sentence, index) => (
                <li key={`${item.id}-description-${index}`}>
                  <span aria-hidden="true">{index + 1}</span>
                  <div>
                    <strong>{sentence}</strong>
                    <p>{item.descriptionZh[index]}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="dino-pronunciation-description__keywords" aria-label="Three English keywords">
              <small>3 key words · 三个关键词</small>
              <div>
                {item.descriptionKeywords.map((keyword) => (
                  <span key={keyword.word}><strong>{keyword.word}</strong><small>{keyword.zh}</small></span>
                ))}
              </div>
            </div>
          </section>

          <div className="dino-pronunciation-insights">
            <div className="dino-pronunciation-profile__fact">
              <span aria-hidden="true">🔎</span>
              <div>
                <small>Try and notice · 观察一下</small>
                <strong>{item.discovery}</strong>
                <p>{item.discoveryZh}</p>
                <a className="everyday-discovery-fact-link" href={item.factSourceUrl} target="_blank" rel="noreferrer">Check the science source ↗</a>
              </div>
            </div>
            <div className="dino-pronunciation-profile__tip">
              <span aria-hidden="true">💡</span>
              <div><strong>{item.soundTip}</strong><p>{item.soundTipZh}</p></div>
            </div>
          </div>
        </div>

        <div className="dino-pronunciation-practice">
          <ol className="dino-pronunciation-steps everyday-discovery-steps" aria-label="Word practice steps">
            {STAGES.map((stage, index) => {
              const done = stage.id === "whole" ? heardWhole
                : stage.id === "chunks" ? allChunksTapped
                  : stage.id === "blend" ? heardBlend
                    : stage.id === "say" ? saidIt
                      : spellingSolved;
              return (
                <li className={`${stage.id === currentStage ? "is-current" : ""} ${done ? "is-done" : ""}`} key={stage.id}>
                  <span>{done ? "✓" : index + 1}</span>
                  <strong>{stage.label}</strong>
                  <small>{stage.labelZh}</small>
                </li>
              );
            })}
          </ol>

          <section className={`dino-pronunciation-task ${allChunksTapped ? "is-done" : ""}`} aria-labelledby="everyday-chunks-title">
            <div className="dino-pronunciation-task__number">2</div>
            <div className="dino-pronunciation-task__copy">
              <small>Build the sound · 拆开练</small>
              <h2 id="everyday-chunks-title">Tap every sound part</h2>
              <p>从左到右点一点。橙色、标着 strong 的部分要读得更有力。</p>
            </div>
            <div className="dino-pronunciation-chunks">
              {item.chunks.map((chunk) => {
                const key = `everyday-discovery-${item.id}-chunk-${chunk.id}`;
                const tapped = tappedChunks.includes(chunk.id);
                return (
                  <button
                    className={`${chunk.stressed ? "is-stressed" : ""} ${tapped ? "is-tapped" : ""} ${narrator.activeKey === key ? "is-speaking" : ""}`}
                    key={chunk.id}
                    type="button"
                    disabled={!heardWhole || !narrator.supported}
                    onClick={() => playChunk(chunk)}
                  >
                    <span aria-hidden="true">{narrator.activeKey === key ? "■" : tapped ? "✓" : "🔊"}</span>
                    <strong>{chunk.text}</strong>
                    <small>{chunk.cue}{chunk.stressed ? " · strong" : ""}</small>
                  </button>
                );
              })}
            </div>
            {!heardWhole && <p className="dino-pronunciation-lock">先听一次完整单词，就能打开声音积木。</p>}
          </section>

          <section className={`dino-pronunciation-task ${heardBlend ? "is-done" : ""}`} aria-labelledby="everyday-blend-title">
            <div className="dino-pronunciation-task__number">3</div>
            <div className="dino-pronunciation-task__copy">
              <small>Slow, then smooth · 慢慢连</small>
              <h2 id="everyday-blend-title">Hear the parts join together</h2>
              <p>老师会先分开读，再把整个单词连起来。</p>
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

          <section className={`dino-pronunciation-task dino-pronunciation-task--say ${saidIt ? "is-done" : ""}`} aria-labelledby="everyday-say-title">
            <div className="dino-pronunciation-task__number">4</div>
            <div className="dino-pronunciation-task__copy">
              <small>Your turn · 轮到你</small>
              <h2 id="everyday-say-title">Take a breath. Say the word!</h2>
              <p>看着声音积木，自己大声读。这里不录音，也不打分。</p>
            </div>
            <div className="dino-pronunciation-say-line" aria-label={`${item.word} split into sound chunks`}>
              {item.chunks.map((chunk) => (
                <span className={chunk.stressed ? "is-stressed" : ""} key={chunk.id}>{chunk.text}</span>
              ))}
            </div>
            {heardBlend ? (
              <button className={`button ${saidIt ? "button--light" : "button--green"}`} type="button" onClick={() => setSaidIt(true)}>
                {saidIt ? "✓ I said it" : "I said it! · 我读出来了"}
              </button>
            ) : (
              <p className="dino-pronunciation-lock">完成前面三步，再自信地读一次！</p>
            )}
          </section>

          <section className={`dino-pronunciation-task everyday-discovery-spelling ${spellingSolved ? "is-done" : ""}`} aria-labelledby="everyday-spell-title">
            <div className="dino-pronunciation-task__number">5</div>
            <div className="dino-pronunciation-task__copy">
              <small>Letter builder · 字母工坊</small>
              <h2 id="everyday-spell-title">Build the word from letters</h2>
              <p>先听单词，再按顺序点字母。拼错也没关系，可以退回一步。</p>
            </div>
            <button className="everyday-discovery-spelling__hear" type="button" disabled={!saidIt || !narrator.supported} onClick={playWhole}>
              <span aria-hidden="true">🔊</span> Hear {item.word}
            </button>

            <div className="everyday-discovery-spelling__answer" aria-label={`Your spelling: ${builtWord || "empty"}`}>
              {spellingLettersFor(item.word).map((_, index) => (
                <span className={selectedTiles[index] ? "is-filled" : ""} key={`${item.id}-slot-${index}`}>
                  {selectedTiles[index]?.letter ?? ""}
                </span>
              ))}
            </div>

            {item.word.includes(" ") && (
              <p className="everyday-discovery-spelling__word-gap">This word has two parts. Build it without the gap. · 这是两个词组成的词组，拼写时不用空格。</p>
            )}

            <div className="everyday-discovery-spelling__tiles" aria-label="Letter tiles">
              {tiles.map((tile) => (
                <button
                  className={selectedTileIds.includes(tile.id) ? "is-used" : ""}
                  type="button"
                  key={tile.id}
                  disabled={!saidIt || selectedTileIds.includes(tile.id) || spellingSolved}
                  onClick={() => addLetter(tile.id)}
                >
                  {tile.letter}
                </button>
              ))}
            </div>

            <div className="everyday-discovery-spelling__actions">
              <button type="button" disabled={!selectedTileIds.length || spellingSolved} onClick={removeLetter}>← One back</button>
              <button type="button" disabled={!selectedTileIds.length || spellingSolved} onClick={resetLetters}>Start again</button>
              <button className="is-check" type="button" disabled={selectedTileIds.length !== tiles.length || spellingSolved} onClick={checkSpelling}>
                Check my word
              </button>
            </div>

            {!saidIt && <p className="dino-pronunciation-lock">先完成“自己读”，字母工坊就会打开。</p>}
            {spellingMessage && (
              <p className={`everyday-discovery-spelling__message ${spellingSolved ? "is-success" : "is-try-again"}`} aria-live="polite">
                {spellingSolved ? "🌟" : "💛"} {spellingMessage}
              </p>
            )}
            {spellingSolved && (
              <button className="button button--green everyday-discovery-spelling__next" type="button" onClick={onHome}>
                ✓ Choose another word <span aria-hidden="true">→</span>
              </button>
            )}
          </section>

          <p className="dino-pronunciation-live" aria-live="polite">
            {spellingSolved
              ? `Wonderful! You can hear, say and spell ${item.word}.`
              : currentStage === "whole"
                ? "Ready? Tap the speaker and listen."
                : currentStage === "chunks"
                  ? "Now tap each sound part from left to right."
                  : currentStage === "blend"
                    ? "Great listening. Hear the parts blend together."
                    : currentStage === "say"
                      ? "Your turn: say the whole word."
                      : "Now build the word, one letter at a time."}
          </p>
        </div>
      </section>

      <EverydaySourceNote />
    </main>
  );
}

function SceneChallenge({
  sceneId,
  completed,
  accent,
  onComplete,
}: {
  sceneId: EverydayDiscoverySceneId;
  completed: boolean;
  accent: string;
  onComplete: (sceneId: EverydayDiscoverySceneId) => void;
}) {
  const scene = everydayDiscoverySceneById(sceneId)!;
  const [selected, setSelected] = useState<string | null>(completed ? scene.challenge.answerId : null);
  const correct = selected === scene.challenge.answerId;

  const choose = (optionId: string) => {
    setSelected(optionId);
    if (optionId === scene.challenge.answerId) onComplete(sceneId);
  };

  return (
    <section
      className="everyday-discovery-challenge"
      style={{ "--pronunciation-accent": accent } as CSSProperties}
      aria-labelledby={`everyday-challenge-${scene.id}`}
    >
      <div className="everyday-discovery-challenge__heading">
        <span aria-hidden="true">🕵️</span>
        <div>
          <p className="eyebrow">Tiny scene mission · 场景小任务</p>
          <h2 id={`everyday-challenge-${scene.id}`}>Can you solve it?</h2>
          <strong>{scene.challenge.prompt}</strong>
          <p>{scene.challenge.promptZh}</p>
        </div>
      </div>
      <div className="everyday-discovery-challenge__options">
        {scene.challenge.options.map((option) => {
          const isSelected = selected === option.id;
          const isCorrect = option.id === scene.challenge.answerId;
          return (
            <button
              className={`${isSelected ? "is-selected" : ""} ${correct && isCorrect ? "is-correct" : ""}`}
              type="button"
              key={option.id}
              disabled={correct}
              onClick={() => choose(option.id)}
            >
              <span aria-hidden="true">{option.icon}</span>
              <strong>{option.label}</strong>
              <small>{option.labelZh}</small>
            </button>
          );
        })}
      </div>
      {selected && (
        <p className={`everyday-discovery-challenge__message ${correct ? "is-correct" : ""}`} aria-live="polite">
          {correct
            ? `🌟 ${scene.challenge.success} ${scene.challenge.successZh}`
            : "💛 Not this one yet. Look at the clue and try another choice. 再看看线索，换一个试试。"}
        </p>
      )}
    </section>
  );
}

function EverydayHeader({
  onBack,
  backLabel,
  completedCount,
}: {
  onBack: () => void;
  backLabel: string;
  completedCount: number;
}) {
  return (
    <header className="dino-pronunciation-header">
      <button className="round-button" type="button" onClick={onBack} aria-label={backLabel}>←</button>
      <div className="dino-pronunciation-header__brand">
        <span aria-hidden="true">🔎</span>
        <span><small>Story Garden</small><strong>Everyday Discovery Lab</strong></span>
      </div>
      <span className="dino-pronunciation-header__score"><b>{completedCount}</b> words explored</span>
    </header>
  );
}

function EverydaySourceNote() {
  return (
    <footer className="dino-pronunciation-sources">
      <span aria-hidden="true">🌍</span>
      <p>
        Real-world photographs are used under the licences shown on each lesson. Facts are checked with established reference and science-learning sources linked from the lesson data. English accents can sound a little different; the prepared classroom voice uses clear Aoede English.
      </p>
    </footer>
  );
}
