"use client";

/* eslint-disable @next/next/no-img-element -- story spreads and project-authored teaching plates need natural responsive sizing */

import {
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { ArtDrawingGuide } from "./art-drawing-guide";
import type { Book } from "./book-data";
import {
  DINOSAUR_LANTERN_DESIGNS,
  FIND_LEE_LING_CELEBRATION,
  FIND_LEE_LING_SCENES,
  MARKET_ITEMS,
  MARKET_ROLEPLAY_STEPS,
  MID_AUTUMN_DISCOVERIES,
  MID_AUTUMN_MISSIONS,
  marketRequestForItem,
  midAutumnLanternById,
  midAutumnMissionById,
  type MarketItemId,
  type MidAutumnAdventureStep,
  type MidAutumnLanternId,
  type MidAutumnMissionId,
} from "./mid-autumn-adventure-data";
import type { MidAutumnAdventureProgress } from "./mid-autumn-adventure-progress";

type MoonlightMarketAdventureProps = {
  book: Book;
  missionId: MidAutumnMissionId | null;
  step: MidAutumnAdventureStep;
  progress: MidAutumnAdventureProgress;
  activeSpeechKey: string | null;
  onBack: () => void;
  onHome: () => void;
  onOpenMission: (id: MidAutumnMissionId) => void;
  onStepChange: (step: MidAutumnAdventureStep) => void;
  onLanternChange: (id: MidAutumnLanternId) => void;
  onCompleteMission: (id: MidAutumnMissionId) => void;
  onSpeak: (text: string, key: string) => void;
};

const GLOW_COLOURS = [
  { id: "gold", label: "gold", labelZh: "金黄色", colour: "#f0a928" },
  { id: "red", label: "red", labelZh: "红色", colour: "#d85a47" },
  { id: "green", label: "green", labelZh: "绿色", colour: "#4a9a74" },
  { id: "blue", label: "blue", labelZh: "蓝色", colour: "#4f75b8" },
] as const;

type GlowColourId = (typeof GLOW_COLOURS)[number]["id"];

export function MoonlightMarketAdventure({
  book,
  missionId,
  step,
  progress,
  activeSpeechKey,
  onBack,
  onHome,
  onOpenMission,
  onStepChange,
  onLanternChange,
  onCompleteMission,
  onSpeak,
}: MoonlightMarketAdventureProps) {
  if (!missionId) {
    return (
      <AdventureHome
        book={book}
        progress={progress}
        onBack={onBack}
        onOpenMission={onOpenMission}
      />
    );
  }

  const mission = midAutumnMissionById(missionId);

  return (
    <main
      className={`moonlight-adventure moonlight-adventure--mission moonlight-adventure--${missionId}`}
      aria-labelledby="moonlight-mission-title"
    >
      <AdventureHeader onBack={onHome} backLabel="Back to Moonlight Market Adventure" />

      <nav className="moonlight-mission-tabs" aria-label="Moonlight Market missions">
        {MID_AUTUMN_MISSIONS.map((item) => {
          const isCurrent = item.id === missionId;
          const isComplete = Boolean(progress.missions[item.id]?.completedAt);
          return (
            <button
              key={item.id}
              type="button"
              className={`${isCurrent ? "is-current" : ""} ${isComplete ? "is-complete" : ""}`}
              aria-current={isCurrent ? "page" : undefined}
              onClick={() => onOpenMission(item.id)}
            >
              <span aria-hidden="true">{isComplete ? "✓" : item.icon}</span>
              <strong>{item.titleZh}</strong>
            </button>
          );
        })}
      </nav>

      <section className="moonlight-mission-heading">
        <div>
          <p className="eyebrow">Mission {MID_AUTUMN_MISSIONS.findIndex((item) => item.id === missionId) + 1} · 任务</p>
          <h1 id="moonlight-mission-title">
            {mission.title} <span>{mission.titleZh}</span>
          </h1>
          <p>{mission.invitation}</p>
        </div>
        <span className="moonlight-mission-heading__icon" aria-hidden="true">{mission.icon}</span>
      </section>

      <MissionSteps
        labels={mission.stepLabels}
        activeStep={step}
        onStepChange={onStepChange}
      />

      {missionId === "find-lee-ling" && (
        <FindLeeLingMission
          key={`find-${step}`}
          book={book}
          step={step}
          complete={Boolean(progress.missions[missionId]?.completedAt)}
          activeSpeechKey={activeSpeechKey}
          onStepChange={onStepChange}
          onComplete={() => onCompleteMission(missionId)}
          onHome={onHome}
          onSpeak={onSpeak}
        />
      )}

      {missionId === "market-roleplay" && (
        <MarketRoleplayMission
          key={`market-${step}`}
          step={step}
          complete={Boolean(progress.missions[missionId]?.completedAt)}
          activeSpeechKey={activeSpeechKey}
          onStepChange={onStepChange}
          onComplete={() => onCompleteMission(missionId)}
          onHome={onHome}
          onSpeak={onSpeak}
        />
      )}

      {missionId === "dinosaur-lantern" && (
        <DinosaurLanternMission
          step={step}
          complete={Boolean(progress.missions[missionId]?.completedAt)}
          initialLanternId={progress.selectedLanternId}
          activeSpeechKey={activeSpeechKey}
          onStepChange={onStepChange}
          onLanternChange={onLanternChange}
          onComplete={() => onCompleteMission(missionId)}
          onHome={onHome}
          onSpeak={onSpeak}
        />
      )}
    </main>
  );
}

function AdventureHome({
  book,
  progress,
  onBack,
  onOpenMission,
}: Pick<MoonlightMarketAdventureProps, "book" | "progress" | "onBack" | "onOpenMission">) {
  const completedCount = MID_AUTUMN_MISSIONS.filter(
    (mission) => progress.missions[mission.id]?.completedAt,
  ).length;
  const lastMission = progress.lastMissionId
    ? midAutumnMissionById(progress.lastMissionId)
    : null;

  return (
    <main className="moonlight-adventure moonlight-adventure--home" aria-labelledby="moonlight-adventure-title">
      <AdventureHeader onBack={onBack} backLabel={`Back to ${book.title}`} />

      <section className="moonlight-hero">
        <div className="moonlight-hero__copy">
          <p className="eyebrow">Read · Search · Speak · Create</p>
          <h1 id="moonlight-adventure-title">
            Moonlight Market Adventure
            <span>中秋夜市大冒险</span>
          </h1>
          <p>跟着兔子灯笼的线索找人，用英语逛夜市，再设计一盏会发光的恐龙灯笼。</p>
          {lastMission && (
            <button
              className="button button--sun"
              type="button"
              onClick={() => onOpenMission(lastMission.id)}
            >
              Continue {lastMission.title} <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
        <div className="moonlight-hero__moon" aria-hidden="true">
          <span>🌕</span>
          <i>🏮</i>
        </div>
        <div
          className="moonlight-hero__progress"
          aria-label={`${completedCount} of ${MID_AUTUMN_MISSIONS.length} missions explored`}
        >
          <strong>{completedCount}</strong>
          <span>of {MID_AUTUMN_MISSIONS.length}</span>
          <small>missions explored</small>
        </div>
      </section>

      <section className="moonlight-mission-grid" aria-labelledby="moonlight-missions-title">
        <div className="section-heading moonlight-mission-grid__heading">
          <div>
            <p className="eyebrow">Choose your path</p>
            <h2 id="moonlight-missions-title">Tonight&apos;s three missions</h2>
          </div>
          <p>可以任意选择，不需要按顺序，也没有分数。</p>
        </div>

        <div className="moonlight-mission-grid__cards">
          {MID_AUTUMN_MISSIONS.map((mission, index) => {
            const missionProgress = progress.missions[mission.id];
            const isComplete = Boolean(missionProgress?.completedAt);
            return (
              <article key={mission.id} className="moonlight-mission-card">
                <button type="button" onClick={() => onOpenMission(mission.id)}>
                  <span className="moonlight-mission-card__number">
                    {isComplete ? "✓" : index + 1}
                  </span>
                  <span className="moonlight-mission-card__icon" aria-hidden="true">{mission.icon}</span>
                  <span className="moonlight-mission-card__copy">
                    <small>{isComplete ? "Explored · 已探索" : `Mission ${index + 1}`}</small>
                    <strong>{mission.title}</strong>
                    <b>{mission.titleZh}</b>
                    <span>{mission.invitation}</span>
                  </span>
                  <span className="moonlight-mission-card__open" aria-hidden="true">→</span>
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <DiscoveryShelf />
    </main>
  );
}

function AdventureHeader({ onBack, backLabel }: { onBack: () => void; backLabel: string }) {
  return (
    <header className="moonlight-adventure__header">
      <button className="round-button" type="button" onClick={onBack} aria-label={backLabel}>←</button>
      <div>
        <span aria-hidden="true">🏮</span>
        <span><small>Story Garden</small><strong>Moonlight Market</strong></span>
      </div>
      <span>Explore · No scores</span>
    </header>
  );
}

function MissionSteps({
  labels,
  activeStep,
  onStepChange,
}: {
  labels: readonly [string, string, string, string];
  activeStep: MidAutumnAdventureStep;
  onStepChange: (step: MidAutumnAdventureStep) => void;
}) {
  return (
    <nav className="moonlight-step-track" aria-label="Four mission steps">
      {labels.map((label, index) => (
        <button
          key={label}
          type="button"
          className={index === activeStep ? "is-current" : index < activeStep ? "is-visited" : ""}
          aria-current={index === activeStep ? "step" : undefined}
          onClick={() => onStepChange(index as MidAutumnAdventureStep)}
        >
          <span>{index < activeStep ? "✓" : index + 1}</span>
          <strong>{label}</strong>
        </button>
      ))}
    </nav>
  );
}

function FindLeeLingMission({
  book,
  step,
  complete,
  activeSpeechKey,
  onStepChange,
  onComplete,
  onHome,
  onSpeak,
}: {
  book: Book;
  step: MidAutumnAdventureStep;
  complete: boolean;
  activeSpeechKey: string | null;
  onStepChange: (step: MidAutumnAdventureStep) => void;
  onComplete: () => void;
  onHome: () => void;
  onSpeak: (text: string, key: string) => void;
}) {
  if (step === 3) {
    const speechKey = "moonlight-find-celebration";
    return (
      <section className="moonlight-find moonlight-find--celebration">
        <div className="moonlight-found-card">
          <span aria-hidden="true">✨🔎✨</span>
          <p className="eyebrow">{FIND_LEE_LING_CELEBRATION.title}</p>
          <h2>{FIND_LEE_LING_CELEBRATION.titleZh}</h2>
          <button
            className={`moonlight-speech-line ${activeSpeechKey === speechKey ? "is-speaking" : ""}`}
            type="button"
            onClick={() => onSpeak(FIND_LEE_LING_CELEBRATION.line, speechKey)}
          >
            <span aria-hidden="true">{activeSpeechKey === speechKey ? "■" : "🔊"}</span>
            <strong>{FIND_LEE_LING_CELEBRATION.line}</strong>
          </button>
          <p>{FIND_LEE_LING_CELEBRATION.lineZh}</p>
          <blockquote>
            <strong>{FIND_LEE_LING_CELEBRATION.storyTwist}</strong>
            <span>{FIND_LEE_LING_CELEBRATION.storyTwistZh}</span>
          </blockquote>
          <div className="moonlight-finish-actions">
            {complete ? (
              <button className="button button--light" type="button" onClick={onHome}>Choose another mission</button>
            ) : (
              <button className="button button--green" type="button" onClick={onComplete}>I solved the case · 完成任务</button>
            )}
          </div>
        </div>
        <DiscoveryCard discovery={MID_AUTUMN_DISCOVERIES[0]} />
      </section>
    );
  }

  return (
    <FindScene
      key={step}
      book={book}
      sceneIndex={step}
      activeSpeechKey={activeSpeechKey}
      onNext={() => onStepChange((step + 1) as MidAutumnAdventureStep)}
      onSpeak={onSpeak}
    />
  );
}

function FindScene({
  book,
  sceneIndex,
  activeSpeechKey,
  onNext,
  onSpeak,
}: {
  book: Book;
  sceneIndex: 0 | 1 | 2;
  activeSpeechKey: string | null;
  onNext: () => void;
  onSpeak: (text: string, key: string) => void;
}) {
  const scene = FIND_LEE_LING_SCENES[sceneIndex];
  const [solved, setSolved] = useState(false);
  const [showClue, setShowClue] = useState(false);
  const [gentleHint, setGentleHint] = useState(false);
  const speechKey = `moonlight-find-${scene.id}`;
  const imageSrc = book.pages[scene.pageIndex]?.src ?? scene.imageSrc;

  function solveScene() {
    setSolved(true);
    setGentleHint(false);
    setShowClue(false);
  }

  function handlePictureClick(event: MouseEvent<HTMLDivElement>) {
    if (solved) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    const target = scene.hotspot;
    const hit = (
      x >= target.x
      && x <= target.x + target.width
      && y >= target.y
      && y <= target.y + target.height
    );
    if (hit) {
      solveScene();
    } else {
      setGentleHint(true);
      setShowClue(true);
    }
  }

  return (
    <section className="moonlight-find" aria-labelledby={`moonlight-find-title-${scene.id}`}>
      <div className="moonlight-find__prompt">
        <p className="eyebrow">Look closely · 仔细观察</p>
        <h2 id={`moonlight-find-title-${scene.id}`}>{scene.prompt}</h2>
        <p>{scene.promptZh}</p>
      </div>

      <div
        className={`moonlight-find__picture ${showClue ? "is-hinting" : ""} ${solved ? "is-solved" : ""}`}
        onClick={handlePictureClick}
      >
        <img src={imageSrc} alt={`Story spread for clue ${sceneIndex + 1}: ${scene.prompt}`} draggable={false} />
        <button
          className="moonlight-find__hotspot"
          type="button"
          style={{
            left: `${scene.hotspot.x}%`,
            top: `${scene.hotspot.y}%`,
            width: `${scene.hotspot.width}%`,
            height: `${scene.hotspot.height}%`,
          }}
          aria-label={`Choose this picture clue: ${scene.prompt}`}
          onClick={(event) => {
            event.stopPropagation();
            solveScene();
          }}
        >
          <span aria-hidden="true">{solved ? "✓" : "?"}</span>
        </button>
      </div>

      <div className="moonlight-find__feedback" aria-live="polite">
        {solved ? (
          <>
            <span aria-hidden="true">✨</span>
            <div>
              <small>Clue found!</small>
              <strong>{scene.successLine}</strong>
              <p>{scene.successLineZh}</p>
            </div>
          </>
        ) : gentleHint ? (
          <>
            <span aria-hidden="true">👀</span>
            <div>
              <small>Good looking. Try once more.</small>
              <strong>再仔细看看，发光的圈圈正在帮你。</strong>
            </div>
          </>
        ) : (
          <>
            <span aria-hidden="true">🔎</span>
            <div><strong>用手指点一点图片里的线索。</strong><small>Take your time. This is not a race.</small></div>
          </>
        )}
      </div>

      <div className="moonlight-find__actions">
        {!solved && (
          <button className="button button--light" type="button" onClick={() => setShowClue((value) => !value)}>
            {showClue ? "Hide the glowing clue" : "Show me a small clue"}
          </button>
        )}
        {solved && (
          <>
            <button
              className={`button button--light ${activeSpeechKey === speechKey ? "is-speaking" : ""}`}
              type="button"
              onClick={() => onSpeak(scene.successLine, speechKey)}
            >
              {activeSpeechKey === speechKey ? "■ Stop" : "🔊 Hear the whole sentence"}
            </button>
            <button className="button button--green" type="button" onClick={onNext}>
              Follow the next clue <span aria-hidden="true">→</span>
            </button>
          </>
        )}
      </div>

      {showClue && !solved && (
        <p className="moonlight-find__clue" role="status">
          <span aria-hidden="true">💡</span>
          <strong>{scene.clue}</strong>
          <span>{scene.clueZh}</span>
        </p>
      )}
    </section>
  );
}

function MarketRoleplayMission({
  step,
  complete,
  activeSpeechKey,
  onStepChange,
  onComplete,
  onHome,
  onSpeak,
}: {
  step: MidAutumnAdventureStep;
  complete: boolean;
  activeSpeechKey: string | null;
  onStepChange: (step: MidAutumnAdventureStep) => void;
  onComplete: () => void;
  onHome: () => void;
  onSpeak: (text: string, key: string) => void;
}) {
  const [selectedItemId, setSelectedItemId] = useState<MarketItemId>("tiger-lantern");
  const activity = MARKET_ROLEPLAY_STEPS[step];
  const line = step === 0 ? marketRequestForItem(selectedItemId) : activity.modelLine;
  const speechKey = `moonlight-market-${step}-${selectedItemId}`;

  function finishTurn() {
    if (step < 3) {
      onStepChange((step + 1) as MidAutumnAdventureStep);
    } else if (!complete) {
      onComplete();
    }
  }

  return (
    <section className="moonlight-market" aria-labelledby="moonlight-market-turn-title">
      <div className="moonlight-market__scene" aria-hidden="true">
        <span>🏮</span><span>🥮</span><span>🐇</span><span>🏮</span>
      </div>

      <div className="moonlight-market__turn">
        <div className="moonlight-market__speaker" aria-hidden="true">
          <span>{activity.speaker === "helper" ? "👩‍🍳" : "🧒"}</span>
          <strong>{activity.speaker === "helper" ? "Stall helper" : "You"}</strong>
        </div>
        <div>
          <p className="eyebrow">Listen, then speak · 先听，再开口</p>
          <h2 id="moonlight-market-turn-title">{activity.title} <span>{activity.titleZh}</span></h2>
          <p>{activity.instructionZh}</p>
        </div>
      </div>

      {step === 0 && (
        <fieldset className="moonlight-market__items">
          <legend>What would you like? · 你想买什么？</legend>
          <div>
            {MARKET_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={selectedItemId === item.id ? "is-selected" : ""}
                aria-pressed={selectedItemId === item.id}
                onClick={() => setSelectedItemId(item.id)}
              >
                <span aria-hidden="true">{item.icon}</span>
                <strong>{item.label}</strong>
                <small>{item.labelZh}</small>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="moonlight-market__speech">
        <small>Your whole English sentence</small>
        <blockquote>{line}</blockquote>
        <p>{activity.storyAnchor}</p>
        <button
          className={activeSpeechKey === speechKey ? "is-speaking" : ""}
          type="button"
          onClick={() => onSpeak(line, speechKey)}
        >
          <span aria-hidden="true">{activeSpeechKey === speechKey ? "■" : "🔊"}</span>
          <strong>{activeSpeechKey === speechKey ? "Stop" : "Hear it"}</strong>
          <small>听一遍，再自己说</small>
        </button>
      </div>

      <div className="moonlight-market__say-check">
        <span aria-hidden="true">🗣️</span>
        <div>
          <strong>Now say it to your grown-up.</strong>
          <p>现在抬起头，把整句说给爸爸妈妈听。这里不录音，也不打分。</p>
        </div>
        {complete && step === 3 ? (
          <button className="button button--light" type="button" onClick={onHome}>Choose another mission</button>
        ) : (
          <button className="button button--green" type="button" onClick={finishTurn}>
            {step === 3 ? "I said it · Finish mission" : "I said it · Next turn"}
          </button>
        )}
      </div>

      {step === 3 && <DiscoveryCard discovery={MID_AUTUMN_DISCOVERIES[0]} />}
    </section>
  );
}

function DinosaurLanternMission({
  step,
  complete,
  initialLanternId,
  activeSpeechKey,
  onStepChange,
  onLanternChange,
  onComplete,
  onHome,
  onSpeak,
}: {
  step: MidAutumnAdventureStep;
  complete: boolean;
  initialLanternId?: MidAutumnLanternId;
  activeSpeechKey: string | null;
  onStepChange: (step: MidAutumnAdventureStep) => void;
  onLanternChange: (id: MidAutumnLanternId) => void;
  onComplete: () => void;
  onHome: () => void;
  onSpeak: (text: string, key: string) => void;
}) {
  const [lanternId, setLanternId] = useState<MidAutumnLanternId>(
    initialLanternId ?? DINOSAUR_LANTERN_DESIGNS[0].id,
  );
  const [glowColourId, setGlowColourId] = useState<GlowColourId>("gold");
  const design = midAutumnLanternById(lanternId);
  const glowColour = GLOW_COLOURS.find((colour) => colour.id === glowColourId) ?? GLOW_COLOURS[0];
  const spokenSentence = useMemo(
    () => `My ${design.name} lantern glows ${glowColour.label}. ${design.featureFrame}`,
    [design, glowColour.label],
  );
  const speechKey = `moonlight-lantern-sentence-${design.id}-${glowColour.id}`;

  return (
    <section
      className="moonlight-lantern"
      style={{ "--lantern-colour": design.colour } as CSSProperties}
      aria-labelledby="moonlight-lantern-title"
    >
      <div className="moonlight-lantern__choice">
        <div>
          <p className="eyebrow">Choose your lantern dinosaur</p>
          <h2 id="moonlight-lantern-title">你今天想设计哪一盏？</h2>
        </div>
        <div role="group" aria-label="Choose a dinosaur lantern">
          {DINOSAUR_LANTERN_DESIGNS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === design.id ? "is-selected" : ""}
              aria-pressed={item.id === design.id}
              onClick={() => {
                setLanternId(item.id);
                onLanternChange(item.id);
                onStepChange(0);
              }}
            >
              <span aria-hidden="true">{item.icon}</span>
              <strong>{item.name}</strong>
              <small>{item.nameZh}</small>
            </button>
          ))}
        </div>
      </div>

      <ArtDrawingGuide
        eyebrow={`${design.name} lantern · ${design.nameZh}灯笼`}
        title="从恐龙结构开始，把它变成一盏有自己设计的纸灯笼。"
        imageSrc={design.guideSrc}
        imageAlt={design.guideAlt}
        steps={design.guideSteps}
        activeStep={step}
        onStepChange={(nextStep) => onStepChange(nextStep as MidAutumnAdventureStep)}
        celebration={design.celebration}
        introLabel="Dinosaur lantern studio · 恐龙灯笼设计室"
        badge={`Step ${step + 1} of 4`}
        caption="彩色边框是现在这一步。先看结构，再加入你自己的花纹和颜色。"
      />

      {step === 3 && (
        <div className="moonlight-lantern__finish">
          <section className="moonlight-lantern__colours" aria-labelledby="lantern-glow-title">
            <p className="eyebrow">Choose the glow</p>
            <h2 id="lantern-glow-title">你的灯笼发出什么颜色的光？</h2>
            <div role="group" aria-label="Choose the lantern glow colour">
              {GLOW_COLOURS.map((colour) => (
                <button
                  key={colour.id}
                  type="button"
                  className={colour.id === glowColour.id ? "is-selected" : ""}
                  aria-pressed={colour.id === glowColour.id}
                  onClick={() => setGlowColourId(colour.id)}
                >
                  <span style={{ backgroundColor: colour.colour }} aria-hidden="true" />
                  <strong>{colour.label}</strong>
                  <small>{colour.labelZh}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="moonlight-lantern__english" aria-labelledby="lantern-english-title">
            <p className="eyebrow">Artist English · 小艺术家英语</p>
            <h2 id="lantern-english-title">介绍你的灯笼</h2>
            <button
              className={`moonlight-speech-line ${activeSpeechKey === speechKey ? "is-speaking" : ""}`}
              type="button"
              onClick={() => onSpeak(spokenSentence, speechKey)}
            >
              <span aria-hidden="true">{activeSpeechKey === speechKey ? "■" : "🔊"}</span>
              <strong>{spokenSentence}</strong>
            </button>
            <p>先听一次，再指着自己的作品说出两句完整的英语。</p>
            <div className="moonlight-finish-actions">
              {complete ? (
                <button className="button button--light" type="button" onClick={onHome}>Choose another mission</button>
              ) : (
                <button className="button button--green" type="button" onClick={onComplete}>
                  I shared my lantern · 完成任务
                </button>
              )}
            </div>
          </section>

          <DiscoveryCard discovery={MID_AUTUMN_DISCOVERIES[1]} />
        </div>
      )}
    </section>
  );
}

type Discovery = (typeof MID_AUTUMN_DISCOVERIES)[number];

function DiscoveryShelf() {
  return (
    <section className="moonlight-discoveries" aria-labelledby="moonlight-discoveries-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Open when curious</p>
          <h2 id="moonlight-discoveries-title">Story discoveries · 故事外的小发现</h2>
        </div>
        <p>这是可以自由打开的小知识，不是测验。</p>
      </div>
      <div className="moonlight-discoveries__grid">
        {MID_AUTUMN_DISCOVERIES.map((discovery) => (
          <DiscoveryCard key={discovery.id} discovery={discovery} />
        ))}
      </div>
    </section>
  );
}

function DiscoveryCard({ discovery }: { discovery: Discovery }) {
  return (
    <details className="moonlight-discovery">
      <summary>
        <span aria-hidden="true">{discovery.icon}</span>
        <span><small>{discovery.label}</small><strong>{discovery.title}</strong></span>
        <span className="moonlight-discovery__open" aria-hidden="true">＋</span>
      </summary>
      <div>
        <p lang="en">{discovery.text}</p>
        <p lang="zh-CN">{discovery.textZh}</p>
      </div>
    </details>
  );
}
