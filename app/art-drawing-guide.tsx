"use client";

/* eslint-disable @next/next/no-img-element -- project-authored teaching plates are already sized for the lesson */

import type { CSSProperties } from "react";
import type { ArtGuideSteps } from "./art-guide-types";

type ArtDrawingGuideProps = {
  eyebrow: string;
  title: string;
  imageSrc: string;
  imageAlt: string;
  steps: ArtGuideSteps;
  activeStep: number;
  onStepChange: (step: number) => void;
  celebration: string;
  introLabel?: string;
  badge?: string;
  caption?: string;
};

export function ArtDrawingGuide({
  eyebrow,
  title,
  imageSrc,
  imageAlt,
  steps,
  activeStep,
  onStepChange,
  celebration,
  introLabel = "Draw with me · 跟我画",
  badge = "一次只画一步",
  caption = "彩色边框是现在这一步；右边的步骤可以先不画。",
}: ArtDrawingGuideProps) {
  const currentStep = steps[activeStep] ?? steps[0];
  const isLastStep = activeStep === steps.length - 1;

  return (
    <section className="art-drawing-guide" aria-label={`${eyebrow} drawing guide`}>
      <div className="art-drawing-guide__intro">
        <div>
          <p className="eyebrow">{introLabel}</p>
          <h2>{eyebrow}</h2>
          <p>{title}</p>
        </div>
        <span>{badge}</span>
      </div>

      <figure
        className="art-drawing-guide__visual"
        style={{ "--guide-step": activeStep } as CSSProperties}
      >
        <img src={imageSrc} alt={imageAlt} draggable={false} />
        <span className="art-drawing-guide__focus" aria-hidden="true" />
        <figcaption>{caption}</figcaption>
      </figure>

      <div className="art-drawing-guide__track" role="group" aria-label="Four small drawing steps">
        {steps.map((guideStep, index) => (
          <button
            key={guideStep.title}
            type="button"
            className={index === activeStep ? "is-current" : index < activeStep ? "is-done" : ""}
            aria-current={index === activeStep ? "step" : undefined}
            onClick={() => onStepChange(index)}
          >
            <span>{index < activeStep ? "✓" : index + 1}</span>
            <strong>{guideStep.title}</strong>
          </button>
        ))}
      </div>

      <div className="art-drawing-guide__instruction" aria-live="polite">
        <span>现在只画第 {activeStep + 1} 步</span>
        <h3>{currentStep.title}</h3>
        <p>{currentStep.instruction}</p>
        {currentStep.tip && <small><span aria-hidden="true">💡</span> {currentStep.tip}</small>}
      </div>

      <div className="art-drawing-guide__actions">
        <button
          className="button art-guide-back"
          type="button"
          disabled={activeStep === 0}
          onClick={() => onStepChange(Math.max(0, activeStep - 1))}
        >
          ← 上一小步
        </button>
        {isLastStep ? (
          <div className="art-guide-celebration" role="status"><span aria-hidden="true">🎉</span><strong>{celebration}</strong></div>
        ) : (
          <button
            className="button button--green"
            type="button"
            onClick={() => onStepChange(Math.min(steps.length - 1, activeStep + 1))}
          >
            我画好了 · 下一小步 →
          </button>
        )}
      </div>
    </section>
  );
}
