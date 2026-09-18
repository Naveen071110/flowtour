import { Demo } from '../shared/types';
import { getScreenshotDataUrl } from '../shared/idb';

/**
 * Generates copy-pasteable React + Tailwind component code
 */
export async function generateReactComponentCode(demo: Demo): Promise<string> {
  const stepsWithImages = [];

  for (let i = 0; i < demo.steps.length; i++) {
    const step = demo.steps[i];
    let dataUrl = '';
    if (step.screenshotId) {
      dataUrl = (await getScreenshotDataUrl(step.screenshotId)) || '';
    }
    stepsWithImages.push({
      index: i + 1,
      title: step.title,
      annotation: step.annotation,
      image: dataUrl,
      xPercent: step.coordinates?.xPercent ?? 0.5,
      yPercent: step.coordinates?.yPercent ?? 0.5,
      elementRect: step.coordinates?.elementRect,
      scrollX: step.coordinates?.scrollX ?? 0,
      scrollY: step.coordinates?.scrollY ?? 0,
    });
  }

  const stepsConst = JSON.stringify(stepsWithImages, null, 2);

  return `import React, { useState } from 'react';

interface ElementBoundingBox {
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

interface Step {
  index: number;
  title: string;
  annotation: string;
  image: string;
  xPercent: number;
  yPercent: number;
  elementRect?: ElementBoundingBox;
  scrollX?: number;
  scrollY?: number;
}

const STEPS: Step[] = ${stepsConst};

export function InteractiveDemoPlayer() {
  const [currentStep, setCurrentStep] = useState(0);
  const total = STEPS.length;
  const activeStep = STEPS[currentStep];

  const handleNext = () => {
    setCurrentStep((prev) => (prev + 1) % total);
  };

  const handlePrev = () => {
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : 0));
  };

  if (!activeStep) return null;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 font-sans antialiased text-slate-100">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border border-slate-800 rounded-xl shadow-sm">
        <div>
          <h2 className="font-semibold text-slate-100 text-lg">${demo.demoTitle.replace(/"/g, '\\"')}</h2>
          <span className="text-xs text-slate-400 font-medium">
            Step {currentStep + 1} of {total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="px-3.5 py-1.5 text-sm font-medium rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ‹ Prev
          </button>
          <button
            onClick={handleNext}
            className="px-4 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
          >
            {currentStep === total - 1 ? 'Restart ↺' : 'Next ›'}
          </button>
        </div>
      </div>

      {/* Main Viewport Stage */}
      <div className="relative w-full overflow-hidden rounded-xl bg-black border border-slate-800 shadow-2xl">
        <img
          src={activeStep.image}
          alt={activeStep.title}
          className="w-full h-auto block select-none"
        />

        {/* Pulsing Interactive Pin */}
        <button
          onClick={handleNext}
          title="Click to proceed"
          style={{
            left: \`\${activeStep.xPercent * 100}%\`,
            top: \`\${activeStep.yPercent * 100}%\`,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 group focus:outline-none"
        >
          <span className="absolute inset-0 rounded-full border-2 border-pink-500 animate-ping opacity-75" />
          <span className="relative flex items-center justify-center w-8 h-8">
            <span className="w-3.5 h-3.5 rounded-full bg-pink-500 border-2 border-white shadow-lg group-hover:scale-125 transition-transform" />
          </span>
        </button>

        {/* Bottom Annotation Drawer */}
        <div className="px-6 py-4 bg-slate-950/90 backdrop-blur border-t border-slate-800/80 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">{activeStep.title}</h3>
            <p className="text-sm text-slate-400 mt-0.5">{activeStep.annotation}</p>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={\`w-2.5 h-2.5 rounded-full transition-all \${
                  idx === currentStep ? 'bg-indigo-500 scale-110' : 'bg-slate-700 hover:bg-slate-600'
                }\`}
                aria-label={\`Go to step \${idx + 1}\`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InteractiveDemoPlayer;
`;
}
