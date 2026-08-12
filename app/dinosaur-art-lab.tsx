"use client";

/* eslint-disable @next/next/no-img-element -- project-authored teaching plates are already sized for the lesson */

import type { CSSProperties } from "react";
import { ArtDrawingGuide } from "./art-drawing-guide";
import {
  DINOSAUR_ART_LESSONS,
  dinosaurArtLessonById,
  type DinosaurArtLessonId,
  type DinosaurArtStep,
} from "./dinosaur-art-data";
import type { DinosaurArtProgress } from "./dinosaur-art-progress";

type DinosaurArtLabProps = {
  lessonId: DinosaurArtLessonId | null;
  step: DinosaurArtStep;
  progress: DinosaurArtProgress;
  fromBookTitle?: string;
  activeSpeechKey: string | null;
  onBack: () => void;
  onHome: () => void;
  onOpenLesson: (lessonId: DinosaurArtLessonId) => void;
  onStepChange: (step: DinosaurArtStep) => void;
  onCompleteLesson: (lessonId: DinosaurArtLessonId) => void;
  onSpeak: (text: string, key: string) => void;
};

export function DinosaurArtLab({
  lessonId,
  step,
  progress,
  fromBookTitle,
  activeSpeechKey,
  onBack,
  onHome,
  onOpenLesson,
  onStepChange,
  onCompleteLesson,
  onSpeak,
}: DinosaurArtLabProps) {
  const completedCount = DINOSAUR_ART_LESSONS.filter((lesson) => progress.lessons[lesson.id]?.completedAt).length;

  if (!lessonId) {
    const lastLesson = progress.lastLessonId ? dinosaurArtLessonById(progress.lastLessonId) : null;
    return (
      <main className="dino-lab dino-lab--home" aria-labelledby="dino-lab-title">
        <DinoHeader onBack={onBack} backLabel={fromBookTitle ? `Back to ${fromBookTitle}` : "Back to my bookshelf"} />

        <section className="dino-lab__hero">
          <div>
            <p className="eyebrow">Draw · Discover · Speak</p>
            <h1 id="dino-lab-title">Dinosaur Art Lab</h1>
            <p>恐龙美术实验室：从动态线和身体体块开始，画出六种真正不同的恐龙结构。</p>
            {lastLesson && (
              <button className="button button--sun" type="button" onClick={() => onOpenLesson(lastLesson.id)}>
                Continue {lastLesson.name} <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
          <div className="dino-lab__progress" aria-label={`${completedCount} of ${DINOSAUR_ART_LESSONS.length} dinosaur lessons complete`}>
            <span aria-hidden="true">🦴</span>
            <strong>{completedCount}</strong>
            <small>of {DINOSAUR_ART_LESSONS.length} explored</small>
          </div>
        </section>

        <section className="dino-lab__level-note" aria-label="How the dinosaur lessons work">
          <span aria-hidden="true">✏️</span>
          <div>
            <strong>你已经会画完整的恐龙了，现在来升级它的结构和动作。</strong>
            <p>这不是描线练习。每课都走过四个阶段：动态线 → 大体块 → 恐龙特征 → 自己的场景。示范告诉你怎样开始，最后一步由你来决定。</p>
          </div>
        </section>

        <section className="dino-lesson-grid" aria-labelledby="dino-lessons-title">
          <div className="section-heading dino-lesson-grid__heading">
            <div><p className="eyebrow">Six body plans</p><h2 id="dino-lessons-title">Choose a dinosaur</h2></div>
            <p>选最想画的，不需要按顺序完成</p>
          </div>
          <div className="dino-lesson-grid__cards">
            {DINOSAUR_ART_LESSONS.map((lesson, index) => {
              const complete = Boolean(progress.lessons[lesson.id]?.completedAt);
              return (
                <article key={lesson.id} className="dino-lesson-card" style={{ "--dino-colour": lesson.colour } as CSSProperties}>
                  <button type="button" onClick={() => onOpenLesson(lesson.id)} aria-label={`Open ${lesson.name} drawing lesson`}>
                    <div className="dino-lesson-card__image">
                      <img src={lesson.guideSrc} alt="" loading="lazy" decoding="async" />
                      <span>{complete ? "✓ Explored" : `Lesson ${index + 1}`}</span>
                    </div>
                    <div className="dino-lesson-card__body">
                      <span aria-hidden="true">{lesson.icon}</span>
                      <div><h3>{lesson.name}</h3><strong>{lesson.nameZh} · {lesson.skill}</strong><p>{lesson.fact}</p></div>
                    </div>
                    <span className="dino-lesson-card__open">Start drawing →</span>
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <p className="dino-lab__science-note">外形重点依据博物馆恐龙资料整理；对于仍有争议的复原，课程会明确告诉孩子“科学家还在研究”。</p>
      </main>
    );
  }

  const lesson = dinosaurArtLessonById(lessonId);
  const complete = Boolean(progress.lessons[lesson.id]?.completedAt);

  return (
    <main
      className="dino-lab dino-lab--lesson"
      style={{ "--dino-colour": lesson.colour } as CSSProperties}
      aria-labelledby="dino-lesson-title"
    >
      <DinoHeader onBack={onHome} backLabel="Back to all dinosaurs" />

      <nav className="dino-lesson-tabs" aria-label="Dinosaur drawing lessons">
        {DINOSAUR_ART_LESSONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${item.id === lesson.id ? "is-current" : ""} ${progress.lessons[item.id]?.completedAt ? "is-done" : ""}`}
            aria-current={item.id === lesson.id ? "page" : undefined}
            onClick={() => onOpenLesson(item.id)}
          >
            <span aria-hidden="true">{progress.lessons[item.id]?.completedAt ? "✓" : item.icon}</span>
            <strong>{item.nameZh}</strong>
          </button>
        ))}
      </nav>

      <section className="dino-lesson-hero">
        <div>
          <p className="eyebrow">Structure challenge · 结构挑战</p>
          <h1 id="dino-lesson-title">{lesson.name} <span>{lesson.nameZh}</span></h1>
          <strong>{lesson.skill}</strong>
          <p>{lesson.fact}</p>
          {lesson.scienceNote && <small><span aria-hidden="true">🔬</span> {lesson.scienceNote}</small>}
        </div>
        <span className="dino-lesson-hero__icon" aria-hidden="true">{lesson.icon}</span>
      </section>

      <section className="dino-lesson-workspace">
        <ArtDrawingGuide
          eyebrow={`${lesson.name} · ${lesson.nameZh}`}
          title={lesson.skill}
          imageSrc={lesson.guideSrc}
          imageAlt={lesson.guideAlt}
          steps={lesson.guideSteps}
          activeStep={step}
          onStepChange={(nextStep) => onStepChange(nextStep as DinosaurArtStep)}
          celebration={lesson.celebration}
          introLabel="Dinosaur structure challenge · 恐龙结构挑战"
          badge={`Step ${step + 1} of 4`}
          caption="彩色边框是现在这一步。看结构，不必把颜色和细节画得一模一样。"
        />

        <div className="dino-learning-grid">
          <section className="dino-word-tools" aria-labelledby="dino-words-title">
            <p className="eyebrow">Dino English</p>
            <h2 id="dino-words-title">Tap, hear and label · 点一点，给画做英文标注</h2>
            <div className="dino-word-tools__words">
              {lesson.vocabulary.map(({ word, zh }) => {
                const key = `dino-word-${lesson.id}-${word}`;
                return (
                  <button key={word} type="button" className={activeSpeechKey === key ? "is-speaking" : ""} onClick={() => onSpeak(word, key)}>
                    <span aria-hidden="true">{activeSpeechKey === key ? "■" : "🔊"}</span>
                    <strong>{word}</strong><small>{zh}</small>
                  </button>
                );
              })}
            </div>
            <button
              className={`dino-sentence ${activeSpeechKey === `dino-sentence-${lesson.id}` ? "is-speaking" : ""}`}
              type="button"
              onClick={() => onSpeak(lesson.sentence, `dino-sentence-${lesson.id}`)}
            >
              <span aria-hidden="true">{activeSpeechKey === `dino-sentence-${lesson.id}` ? "■" : "🗣️"}</span>
              <span><small>Say one sentence</small><strong>{lesson.sentence}</strong></span>
            </button>
          </section>

          <aside className="dino-artist-challenge">
            <p className="eyebrow">Make it yours</p>
            <h2>Artist challenge · 自己来设计</h2>
            <p>{lesson.challenge}</p>
            <h3>Materials</h3>
            <div>{lesson.materials.map((item) => <span key={item}>{item}</span>)}</div>
          </aside>
        </div>

        {step === 3 && (
          <section className={`dino-finish ${complete ? "is-complete" : ""}`}>
            <span aria-hidden="true">{complete ? "🏅" : "🦖"}</span>
            <div>
              <small>{complete ? "Lesson explored" : "Your dinosaur is ready"}</small>
              <strong>{complete ? `${lesson.name} explorer!` : "说一句英语，再签上你的名字。"}</strong>
              <p>没有分数，也不比较像不像。我们记录的是观察、结构和你自己的想法。</p>
            </div>
            {complete ? (
              <button className="button button--light" type="button" onClick={onHome}>Choose another dinosaur</button>
            ) : (
              <button className="button button--green" type="button" onClick={() => onCompleteLesson(lesson.id)}>I finished this dinosaur →</button>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

function DinoHeader({ onBack, backLabel }: { onBack: () => void; backLabel: string }) {
  return (
    <header className="dino-lab__header">
      <button className="round-button" type="button" onClick={onBack} aria-label={backLabel}>←</button>
      <div><span aria-hidden="true">🦕</span><span><small>Story Garden</small><strong>Dinosaur Art Lab</strong></span></div>
      <span>Paper first · No scores</span>
    </header>
  );
}
