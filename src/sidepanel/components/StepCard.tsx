import React, { useState, useEffect } from 'react';
import { Step } from '../../shared/types';
import { getScreenshotBlob } from '../../shared/idb';
import { Trash2, ChevronUp, ChevronDown, MousePointer, Image as ImageIcon, AlertTriangle } from 'lucide-react';

interface StepCardProps {
  step: Step;
  totalSteps: number;
  onUpdate: (stepId: string, patch: Partial<Step>) => void;
  onDelete: (stepId: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const StepCard: React.FC<StepCardProps> = ({
  step,
  totalSteps,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const [viewMode, setViewMode] = useState<'pre' | 'post'>('pre');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isImageMissing, setIsImageMissing] = useState<boolean>(false);
  const [title, setTitle] = useState(step.title);
  const [annotation, setAnnotation] = useState(step.annotation);

  const activeScreenshotId =
    viewMode === 'post' && step.nextScreenshotId && step.nextScreenshotId !== step.screenshotId
      ? step.nextScreenshotId
      : step.screenshotId;

  const hasDistinctPostImage = Boolean(
    step.nextScreenshotId && step.nextScreenshotId.trim() !== '' && step.nextScreenshotId !== step.screenshotId
  );

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    if (!activeScreenshotId || activeScreenshotId.trim() === '') {
      setIsImageMissing(true);
      return;
    }

    getScreenshotBlob(activeScreenshotId)
      .then((blob) => {
        if (!active) return;
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setImageUrl(objectUrl);
          setIsImageMissing(false);
        } else {
          setIsImageMissing(true);
        }
      })
      .catch((err) => {
        if (!active) return;
        console.warn(`[FlowTour] Screenshot load error for step ${step.id}:`, err);
        setIsImageMissing(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activeScreenshotId, step.id]);

  const handleTitleBlur = () => {
    if (title !== step.title) {
      onUpdate(step.id, { title });
    }
  };

  const handleAnnotationBlur = () => {
    if (annotation !== step.annotation) {
      onUpdate(step.id, { annotation });
    }
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 rounded-lg overflow-hidden transition-colors">
      {/* Header bar */}
      <div className="px-2.5 py-1.5 bg-zinc-950/60 border-b border-zinc-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[10px] text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded shrink-0">
            #{step.index}
          </span>
          <span className="font-mono text-xs text-zinc-400 truncate max-w-[160px]" title={step.selector || step.elementTagName}>
            {step.selector || step.elementTagName || step.actionType}
          </span>
          {isImageMissing && (
            <span className="text-[10px] font-mono text-amber-400/90 bg-amber-950/50 border border-amber-800/40 px-1.5 py-0.5 rounded">
              no img
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {onMoveUp && (
            <button
              onClick={onMoveUp}
              disabled={step.index === 1}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
              title="Move Up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={onMoveDown}
              disabled={step.index === totalSteps}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
              title="Move Down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onDelete(step.id)}
            className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-0.5"
            title="Delete step"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Screenshot Thumbnail Preview */}
      <div className="relative w-full bg-black aspect-video overflow-hidden border-b border-zinc-800/60">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={step.title} className="w-full h-full object-cover select-none" />

            {/* Clean minimalist target ring */}
            {viewMode === 'pre' && (
              <div
                style={{
                  left: `${(step.coordinates?.xPercent ?? 0.5) * 100}%`,
                  top: `${(step.coordinates?.yPercent ?? 0.5) * 100}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              >
                <div className="w-5 h-5 rounded-full border border-zinc-100 bg-white/20 backdrop-blur-[1px] flex items-center justify-center shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>
            )}

            {/* Toggle Click / Result */}
            {hasDistinctPostImage && (
              <div className="absolute top-1.5 right-1.5 flex items-center bg-black/80 backdrop-blur-md rounded border border-zinc-800 p-0.5 text-[9px] font-mono">
                <button
                  type="button"
                  onClick={() => setViewMode('pre')}
                  className={`px-1.5 py-0.5 rounded transition ${
                    viewMode === 'pre' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Target
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('post')}
                  className={`px-1.5 py-0.5 rounded transition ${
                    viewMode === 'post' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Result
                </button>
              </div>
            )}
          </>
        ) : isImageMissing ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-1 text-[11px] bg-zinc-950/80 p-2 text-center">
            <AlertTriangle className="w-4 h-4 text-amber-500/80" />
            <span>Screenshot not captured</span>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 gap-1 text-xs">
            <ImageIcon className="w-4 h-4 animate-pulse" />
          </div>
        )}
      </div>

      {/* Inline editable text fields */}
      <div className="p-2.5 space-y-2">
        <div>
          <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-0.5">
            Step Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="w-full bg-transparent border-b border-transparent focus:border-zinc-700 text-xs text-zinc-200 focus:outline-none transition py-0.5 font-medium placeholder:text-zinc-600"
            placeholder="Step title..."
          />
        </div>

        <div>
          <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-0.5">
            Instruction
          </label>
          <input
            type="text"
            value={annotation}
            onChange={(e) => setAnnotation(e.target.value)}
            onBlur={handleAnnotationBlur}
            className="w-full bg-transparent border-b border-transparent focus:border-zinc-700 text-xs text-zinc-400 focus:outline-none transition py-0.5 placeholder:text-zinc-600"
            placeholder="Instruction details..."
          />
        </div>
      </div>
    </div>
  );
};
