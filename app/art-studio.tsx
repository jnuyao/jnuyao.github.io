"use client";

/* eslint-disable @next/next/no-img-element -- the studio deliberately reuses the book's pre-sized story scans */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import { ArtDrawingGuide } from "./art-drawing-guide";
import type { Book } from "./book-data";
import {
  ART_STEPS,
  artMissionById,
  type ArtMissionId,
  type ArtStep,
  type ArtStudioBook,
} from "./art-studio-data";
import {
  loadArtPhoto,
  removeArtPhoto,
  saveArtPhoto,
} from "./art-photo-store";
import {
  emptyArtStudioProgress,
  type ArtMissionDraft,
  type ArtStudioProgress,
} from "./progress";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const SKETCH_SECONDS = 45;

const STEP_META: Record<ArtStep, { icon: string; label: string; short: string }> = {
  observe: { icon: "👀", label: "Look closely", short: "Observe" },
  sketch: { icon: "✍️", label: "Draw the action", short: "Sketch" },
  create: { icon: "🎨", label: "Make your artwork", short: "Create" },
  tell: { icon: "💬", label: "Tell your art story", short: "Tell" },
};

const EMPTY_DRAFT: ArtMissionDraft = {
  title: "",
  englishLine: "",
  checkedItems: [],
};

type ArtStudioProps = {
  book: Book;
  studio: ArtStudioBook;
  step: ArtStep;
  missionId: ArtMissionId;
  progress?: ArtStudioProgress;
  onBack: () => void;
  onOpenPage: (pageIndex: number) => void;
  onStepChange: (step: ArtStep) => void;
  onMissionChange: (missionId: ArtMissionId) => void;
  onProgressChange: (updater: (current: ArtStudioProgress) => ArtStudioProgress) => void;
};

export function ArtStudio({
  book,
  studio,
  step,
  missionId,
  progress = emptyArtStudioProgress(),
  onBack,
  onOpenPage,
  onStepChange,
  onMissionChange,
  onProgressChange,
}: ArtStudioProps) {
  const mission = artMissionById(missionId);
  const draft = progress.drafts[missionId] ?? EMPTY_DRAFT;
  const [activePose, setActivePose] = useState(0);
  const [poseGuideStep, setPoseGuideStep] = useState(0);
  const [missionGuide, setMissionGuide] = useState({ missionId, step: 0 });
  const [secondsLeft, setSecondsLeft] = useState(SKETCH_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoStatus, setPhotoStatus] = useState("正在查看这台设备上的作品…");
  const photoUrlRef = useRef("");
  const pose = studio.sketchPoses[activePose] ?? studio.sketchPoses[0];
  const missionGuideStep = missionGuide.missionId === missionId ? missionGuide.step : 0;
  const setMissionGuideStep = (nextStep: number) => setMissionGuide({ missionId, step: nextStep });

  const replacePhotoUrl = useCallback((nextUrl: string) => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = nextUrl;
    setPhotoUrl(nextUrl);
  }, []);

  useEffect(() => () => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadArtPhoto(book.slug, missionId)
      .then((photo) => {
        if (cancelled) return;
        if (photo) {
          replacePhotoUrl(URL.createObjectURL(photo));
          setPhotoStatus("作品照片已保存在这台设备上。");
        } else {
          setPhotoStatus("");
        }
      })
      .catch(() => {
        if (!cancelled) setPhotoStatus("这次无法读取本地作品照片，但仍然可以继续创作。");
      });
    return () => {
      cancelled = true;
    };
  }, [book.slug, missionId, replacePhotoUrl]);

  useEffect(() => {
    if (!timerRunning) return;
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => {
      if (secondsLeft <= 1) {
        setSecondsLeft(0);
        setTimerRunning(false);
      } else {
        setSecondsLeft(secondsLeft - 1);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft, timerRunning]);

  const goToStep = (nextStep: ArtStep) => {
    onProgressChange((current) => ({
      ...current,
      lastStep: nextStep,
      updatedAt: Date.now(),
    }));
    onStepChange(nextStep);
  };

  const finishStep = (nextStep?: ArtStep) => {
    const now = new Date().toISOString();
    onProgressChange((current) => ({
      ...current,
      lastStep: nextStep ?? step,
      steps: { ...current.steps, [step]: true },
      completedAt: step === "tell" ? current.completedAt ?? now : current.completedAt,
      updatedAt: Date.now(),
    }));
    if (nextStep) onStepChange(nextStep);
  };

  const selectMission = (nextMission: ArtMissionId) => {
    setMissionGuide({ missionId: nextMission, step: 0 });
    onProgressChange((current) => ({
      ...current,
      selectedMission: nextMission,
      updatedAt: Date.now(),
    }));
    onMissionChange(nextMission);
  };

  const updateDraft = (patch: Partial<ArtMissionDraft>) => {
    onProgressChange((current) => {
      const currentDraft = current.drafts[missionId] ?? EMPTY_DRAFT;
      return {
        ...current,
        selectedMission: missionId,
        drafts: {
          ...current.drafts,
          [missionId]: { ...currentDraft, ...patch },
        },
        updatedAt: Date.now(),
      };
    });
  };

  const toggleRequirement = (requirementId: string) => {
    const checkedItems = draft.checkedItems.includes(requirementId)
      ? draft.checkedItems.filter((item) => item !== requirementId)
      : [...draft.checkedItems, requirementId];
    updateDraft({ checkedItems });
  };

  const startSketchTimer = () => {
    setSecondsLeft(SKETCH_SECONDS);
    setTimerRunning(true);
  };

  const choosePose = (index: number) => {
    setActivePose(index);
    setPoseGuideStep(0);
    setSecondsLeft(SKETCH_SECONDS);
    setTimerRunning(false);
  };

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoStatus("请选择照片文件。");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoStatus("照片太大了，请选择小于 8 MB 的图片。");
      return;
    }
    setPhotoStatus("正在保存到这台设备…");
    try {
      await saveArtPhoto(book.slug, missionId, file);
      replacePhotoUrl(URL.createObjectURL(file));
      setPhotoStatus("保存好了！照片只在这台设备上，不会上传。");
    } catch {
      setPhotoStatus("这次没有保存成功。你仍然可以完成并介绍作品。");
    }
  };

  const deletePhoto = async () => {
    try {
      await removeArtPhoto(book.slug, missionId);
      replacePhotoUrl("");
      setPhotoStatus("已从这台设备移除照片。");
    } catch {
      setPhotoStatus("暂时无法移除照片，请稍后再试。");
    }
  };

  const stepIndex = ART_STEPS.indexOf(step);
  const completedCount = ART_STEPS.filter((item) => progress.steps[item]).length;

  return (
    <main
      className="art-studio"
      style={{ "--book-colour": book.colour } as CSSProperties}
      aria-labelledby="art-studio-title"
    >
      <header className="art-studio__header">
        <button className="round-button" type="button" onClick={onBack} aria-label="Back to the story">←</button>
        <div className="art-studio__book">
          <img src={book.cover} alt="" />
          <div><small>Art Studio · 美术工作室</small><strong>{book.title}</strong></div>
        </div>
        <span className="art-studio__privacy">Paper first · No scores</span>
      </header>

      <section className="art-studio__hero">
        <div>
          <p className="eyebrow">Illustration adventure</p>
          <h1 id="art-studio-title">{studio.title}</h1>
          <p>{studio.subtitle}</p>
        </div>
        <div className="art-studio__count"><strong>{completedCount}</strong><span>of 4 steps</span></div>
      </section>

      <nav className="art-path" aria-label="Art Studio steps">
        {ART_STEPS.map((item, index) => {
          const meta = STEP_META[item];
          const done = progress.steps[item];
          return (
            <button
              key={item}
              type="button"
              className={`${item === step ? "is-current" : ""} ${done ? "is-done" : ""}`}
              aria-current={item === step ? "step" : undefined}
              onClick={() => goToStep(item)}
            >
              <span aria-hidden="true">{done ? "✓" : meta.icon}</span>
              <small>Step {index + 1}</small>
              <strong>{meta.short}</strong>
            </button>
          );
        })}
      </nav>

      <section className="art-workspace">
        {step === "observe" && (
          <div className="art-observe">
            <ArtHeading icon="👀" title="Look like an illustrator" subtitle="先看画家怎样让静止的画面产生动作和故事。" />
            <div className="art-observation-grid">
              {studio.observations.map((observation) => (
                <article key={observation.pageIndex} className="art-observation-card">
                  <button type="button" onClick={() => onOpenPage(observation.pageIndex)} aria-label={`Open ${observation.label} in the story`}>
                    <img
                      src={book.pages[observation.pageIndex].src}
                      alt={`${observation.title}, ${observation.label} of ${book.title}`}
                    />
                    <span>Open page ↗</span>
                  </button>
                  <div>
                    <small>{observation.label} · {observation.focus}</small>
                    <h2>{observation.title}</h2>
                    <p>{observation.question}</p>
                    <ul>{observation.lookFor.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                </article>
              ))}
            </div>
            <ArtNext label="I looked closely · 开始动态速写" onClick={() => finishStep("sketch")} />
          </div>
        )}

        {step === "sketch" && (
          <div className="art-sketch">
            <ArtHeading icon="✍️" title="Draw with me · 跟我画" subtitle="先跟着四个小步骤画清楚一个动作；会画以后，再试可选的 45 秒挑战。" />
            <div className="pose-picker" role="group" aria-label="Choose a sketch pose">
              {studio.sketchPoses.map((pose, index) => (
                <button
                  key={pose.id}
                  type="button"
                  className={activePose === index ? "is-selected" : ""}
                  aria-pressed={activePose === index}
                  onClick={() => choosePose(index)}
                >
                  <span>{index + 1}</span><strong>{pose.label}</strong>
                </button>
              ))}
            </div>
            <ArtDrawingGuide
              eyebrow={`Pose ${activePose + 1} · ${pose.label}`}
              title={pose.hint}
              imageSrc={pose.guideSrc}
              imageAlt={pose.guideAlt}
              steps={pose.guideSteps}
              activeStep={poseGuideStep}
              onStepChange={setPoseGuideStep}
              celebration={pose.celebration}
            />

            {poseGuideStep === pose.guideSteps.length - 1 && (
              <details className="sketch-challenge">
                <summary>
                  <span aria-hidden="true">⚡</span>
                  <span><strong>Optional 45-second challenge</strong><small>想挑战吗？不看示范，再画一次。</small></span>
                </summary>
                <div className={`sketch-timer ${timerRunning ? "is-running" : ""} ${secondsLeft === 0 ? "is-finished" : ""}`}>
                  <div className="sketch-timer__clock" aria-live="polite">
                    <strong>{secondsLeft}</strong><span>seconds</span>
                  </div>
                  <div>
                    <p className="eyebrow">Bonus · {pose.label}</p>
                    <h2>从动作线开始，记住大形状就好。</h2>
                    <p>{secondsLeft === 0 ? "Time! 保留这张有生命力的速写，不需要改得很完美。" : "这次可以把示范图遮住。动作清楚比细节漂亮更重要。"}</p>
                    <button className="button button--coral" type="button" onClick={startSketchTimer}>
                      {timerRunning ? "Restart 45 seconds" : secondsLeft === 0 ? "Try once more" : "Start 45 seconds"}
                    </button>
                  </div>
                </div>
              </details>
            )}
            <ArtNext label="I can draw the action · 选择正式作品" onClick={() => finishStep("create")} />
          </div>
        )}

        {step === "create" && (
          <div className="art-create">
            <ArtHeading icon="🎨" title="Choose one art adventure" subtitle="选一个任务，跟着四个小步骤开始；最后再加入你自己的想法。" />
            <div className="art-mission-picker" role="group" aria-label="Choose an art mission">
              {studio.missions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={missionId === item.id ? "is-selected" : ""}
                  aria-pressed={missionId === item.id}
                  onClick={() => selectMission(item.id)}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span><strong>{item.title}</strong><small>{item.subtitle}</small></span>
                </button>
              ))}
            </div>
            <ArtDrawingGuide
              eyebrow={`${mission.icon} ${mission.title}`}
              title={mission.brief}
              imageSrc={mission.guideSrc}
              imageAlt={mission.guideAlt}
              steps={mission.guideSteps}
              activeStep={missionGuideStep}
              onStepChange={setMissionGuideStep}
              celebration={mission.celebration}
            />

            <details className="art-finishing-tools">
              <summary>
                <span aria-hidden="true">🧰</span>
                <span><strong>Finishing tools · 画完后再打开</strong><small>材料、英语句子和最后检查</small></span>
              </summary>
              <div className="art-brief">
                <div className="art-brief__main">
                  <p className="eyebrow">Make it yours</p>
                  <h2>{mission.icon} {mission.title}</h2>
                  <p>{mission.brief}</p>
                  <h3>Materials · 材料</h3>
                  <div className="material-chips">{mission.materials.map((item) => <span key={item}>{item}</span>)}</div>
                  <h3>English toolbox</h3>
                  <div className="english-toolbox">
                    {mission.englishFrames.map((frame) => <button key={frame} type="button" onClick={() => updateDraft({ englishLine: frame })}>{frame}</button>)}
                  </div>
                  <div className="word-bank">{mission.wordBank.map((word) => <span key={word}>{word}</span>)}</div>
                </div>
                <div className="art-checklist">
                  <p className="eyebrow">Artist checklist</p>
                  <h3>完成一项，就轻轻勾一下</h3>
                  {mission.requirements.map((requirement) => (
                    <label key={requirement.id}>
                      <input
                        type="checkbox"
                        checked={draft.checkedItems.includes(requirement.id)}
                        onChange={() => toggleRequirement(requirement.id)}
                      />
                      <span>{requirement.label}</span>
                    </label>
                  ))}
                  <p>{draft.checkedItems.length} / {mission.requirements.length} ideas included</p>
                </div>
              </div>
            </details>
            <ArtNext label="My artwork is ready · 介绍作品" onClick={() => finishStep("tell")} />
          </div>
        )}

        {step === "tell" && (
          <div className="art-tell">
            <ArtHeading icon="💬" title="Tell the story of your art" subtitle="作品没有分数。我们关注观察、尝试、设计和表达。" />
            <div className="art-share-grid">
              <div className="art-share-form">
                <label>
                  <span>Artwork title · 作品名字</span>
                  <input
                    type="text"
                    value={draft.title}
                    maxLength={80}
                    placeholder="My Brave Ride"
                    onChange={(event) => updateDraft({ title: event.target.value })}
                  />
                </label>
                <fieldset>
                  <legend>Tap a sentence starter</legend>
                  {mission.englishFrames.map((frame) => (
                    <button key={frame} type="button" onClick={() => updateDraft({ englishLine: frame })}>{frame}</button>
                  ))}
                </fieldset>
                <label>
                  <span>My English art story</span>
                  <textarea
                    value={draft.englishLine}
                    maxLength={240}
                    rows={4}
                    placeholder="This bike is for a dinosaur. It has three big wheels…"
                    onChange={(event) => updateDraft({ englishLine: event.target.value })}
                  />
                </label>
                <p className="art-speaking-tip"><span aria-hidden="true">🗣️</span> 先慢慢读一遍，再不看文字介绍给家人听。</p>
              </div>

              <div className="art-photo-card">
                <div className="art-photo-card__heading"><span aria-hidden="true">📷</span><div><strong>My Art Garden</strong><small>照片只保存在这台设备上</small></div></div>
                {photoUrl ? (
                  <div className="art-photo-preview">
                    <img src={photoUrl} alt={draft.title ? `Artwork: ${draft.title}` : "The child's saved artwork"} />
                    <button type="button" onClick={deletePhoto}>Remove photo</button>
                  </div>
                ) : (
                  <div className="art-photo-empty"><span aria-hidden="true">🖼️</span><p>完成纸上作品后，可以拍照收藏在这里。</p></div>
                )}
                <label className="art-photo-upload" htmlFor="artwork-photo">Take or choose a photo</label>
                <input
                  id="artwork-photo"
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  aria-describedby="art-photo-privacy art-photo-status"
                  onChange={handlePhoto}
                />
                <p id="art-photo-privacy">不会上传、不会分析，也不会给作品打分。最大 8 MB。</p>
                <p id="art-photo-status" role="status" aria-live="polite">{photoStatus}</p>
              </div>
            </div>

            {progress.steps.tell ? (
              <div className="art-complete">
                <span aria-hidden="true">🎨</span>
                <div><small>Art Studio complete</small><strong>You made the story move!</strong><p>把作品挂起来，明天再用英文讲一次。</p></div>
                <button className="button button--green" type="button" onClick={onBack}>Back to the story</button>
              </div>
            ) : (
              <ArtNext label="I shared my artwork · 完成美术任务" onClick={() => finishStep()} />
            )}
          </div>
        )}
      </section>

      <p className="sr-only" aria-live="polite">Art Studio step {stepIndex + 1} of {ART_STEPS.length}: {STEP_META[step].label}</p>
    </main>
  );
}

function ArtHeading({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="art-heading">
      <span aria-hidden="true">{icon}</span>
      <div><p className="eyebrow">Art mission</p><h2>{title}</h2><p>{subtitle}</p></div>
    </div>
  );
}

function ArtNext({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="art-next">
      <span>完成比完美更重要。</span>
      <button className="button button--green" type="button" onClick={onClick}>{label} <span aria-hidden="true">→</span></button>
    </div>
  );
}
