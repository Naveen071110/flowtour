import React from 'react';
import { Square, MousePointer } from 'lucide-react';

interface RecordingViewProps {
  demoTitle: string;
  stepCount: number;
  onStop: () => void;
}

export const RecordingView: React.FC<RecordingViewProps> = ({
  demoTitle,
  stepCount,
  onStop,
}) => {
  return (
    <div className="p-5 flex flex-col items-center justify-center min-h-[65vh] text-center space-y-6">
      {/* Recording Status Header */}
      <div className="space-y-2 max-w-xs">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span>RECORDING ACTIVE</span>
        </div>

        <h2 className="text-sm font-semibold text-zinc-100 leading-snug truncate">
          {demoTitle}
        </h2>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Interact on the active web tab. Clicks, selectors, and screenshots are recorded automatically.
        </p>
      </div>

      {/* Live Counter Card */}
      <div className="w-full max-w-xs bg-zinc-900/40 border border-zinc-800 rounded-lg p-4 flex items-center justify-around">
        <div className="text-center">
          <span className="text-3xl font-mono font-bold text-zinc-100">{stepCount}</span>
          <span className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mt-1">
            {stepCount === 1 ? 'Step' : 'Steps'}
          </span>
        </div>
        <div className="h-8 w-px bg-zinc-800" />
        <div className="text-center flex flex-col items-center">
          <MousePointer className="w-4 h-4 text-zinc-400 mb-1" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mt-1">
            Click to Capture
          </span>
        </div>
      </div>

      {/* Stop Button */}
      <button
        onClick={onStop}
        className="w-full max-w-xs h-9 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 font-medium text-xs rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        <span className="w-2 h-2 rounded-sm bg-red-400" />
        <span>Finish Recording</span>
      </button>
    </div>
  );
};
