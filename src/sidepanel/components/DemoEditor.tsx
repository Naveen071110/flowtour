import React, { useState } from 'react';
import { Demo, Step } from '../../shared/types';
import { StepCard } from './StepCard';
import { ExportModal } from './ExportModal';
import { VideoExportModal } from './VideoExportModal';
import { ArrowLeft, Plus, Video, Code2, Sparkles } from 'lucide-react';

interface DemoEditorProps {
  demo: Demo;
  onBack: () => void;
  onUpdateTitle: (demoId: string, title: string) => void;
  onUpdateStep: (stepId: string, patch: Partial<Step>) => void;
  onDeleteStep: (stepId: string) => void;
  onReorderSteps: (orderedStepIds: string[]) => void;
  onResumeRecording: (demoId: string, demoTitle: string) => void;
  isProLicense?: boolean;
  onOpenUpgrade?: () => void;
}

export const DemoEditor: React.FC<DemoEditorProps> = ({
  demo,
  onBack,
  onUpdateTitle,
  onUpdateStep,
  onDeleteStep,
  onReorderSteps,
  onResumeRecording,
  isProLicense = false,
  onOpenUpgrade,
}) => {
  const [title, setTitle] = useState(demo.demoTitle);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isVideoExportOpen, setIsVideoExportOpen] = useState(false);

  const handleTitleBlur = () => {
    if (title.trim() && title !== demo.demoTitle) {
      onUpdateTitle(demo.demoId, title.trim());
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newSteps = [...demo.steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index - 1];
    newSteps[index - 1] = temp;
    onReorderSteps(newSteps.map((s) => s.id));
  };

  const handleMoveDown = (index: number) => {
    if (index >= demo.steps.length - 1) return;
    const newSteps = [...demo.steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index + 1];
    newSteps[index + 1] = temp;
    onReorderSteps(newSteps.map((s) => s.id));
  };

  const validScreenshotCount = demo.steps.filter(
    (s) => Boolean(s.screenshotId && s.screenshotId.trim() !== '')
  ).length;
  const canExportVideo = demo.steps.length > 0 && validScreenshotCount > 0;

  return (
    <div className="flex flex-col min-h-[calc(100vh-48px)] relative">
      {/* Sub-Header Toolbar */}
      <div className="h-10 px-3 bg-[#09090b]/90 border-b border-zinc-800/80 flex items-center justify-between sticky top-12 z-20 backdrop-blur-md">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Tours</span>
        </button>

        <button
          onClick={() => onResumeRecording(demo.demoId, demo.demoTitle)}
          className="h-6 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          title="Record additional steps"
        >
          <Plus className="w-3 h-3 stroke-[2.5]" />
          <span>Add Steps</span>
        </button>
      </div>

      {/* Editable Title Section */}
      <div className="p-3.5 border-b border-zinc-800/80 bg-zinc-950/40 space-y-1">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="w-full text-sm font-medium bg-transparent border-b border-transparent focus:border-zinc-700 text-zinc-100 focus:outline-none transition py-0.5"
          placeholder="Untitled Walkthrough"
        />
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <span>{demo.steps.length} {demo.steps.length === 1 ? 'step' : 'steps'} captured</span>
          <span>{new Date(demo.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Steps List */}
      <div className="p-3 space-y-2 flex-1 pb-20">
        {demo.steps.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-zinc-800/80 rounded-lg flex flex-col items-center justify-center gap-2 bg-zinc-950/20">
            <Sparkles className="w-6 h-6 text-zinc-600 stroke-1" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-zinc-300">No steps recorded yet</p>
              <p className="text-[11px] text-zinc-500 max-w-xs">
                Click 'Add Steps' to begin capturing interactions on your target website.
              </p>
            </div>
          </div>
        ) : (
          demo.steps.map((step, idx) => (
            <StepCard
              key={step.id}
              step={step}
              totalSteps={demo.steps.length}
              onUpdate={onUpdateStep}
              onDelete={onDeleteStep}
              onMoveUp={idx > 0 ? () => handleMoveUp(idx) : undefined}
              onMoveDown={idx < demo.steps.length - 1 ? () => handleMoveDown(idx) : undefined}
            />
          ))
        )}
      </div>

      {/* Fixed Bottom Dock Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-2.5 bg-[#09090b]/90 border-t border-zinc-800/80 backdrop-blur-md flex items-center gap-2">
        <button
          onClick={() => setIsExportOpen(true)}
          disabled={demo.steps.length === 0}
          className="flex-1 h-8 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-900 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5 text-zinc-400" />
          <span>Export Code (ZIP)</span>
        </button>

        <button
          onClick={() => setIsVideoExportOpen(true)}
          disabled={!canExportVideo}
          className="flex-1 h-8 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-950 disabled:opacity-40 disabled:hover:bg-zinc-100 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          title={!canExportVideo ? 'Record at least one step with screenshot to export video' : undefined}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Export MP4 Video</span>
        </button>
      </div>

      {/* Modals */}
      <ExportModal demo={demo} isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <VideoExportModal
        demo={demo}
        isOpen={isVideoExportOpen}
        onClose={() => setIsVideoExportOpen(false)}
        isProLicense={isProLicense}
        onOpenUpgrade={onOpenUpgrade}
      />
    </div>
  );
};
