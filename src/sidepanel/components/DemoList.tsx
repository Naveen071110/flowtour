import React, { useState } from 'react';
import { Demo } from '../../shared/types';
import { Plus, Trash2, Layers, Calendar, ChevronRight, Play } from 'lucide-react';

interface DemoListProps {
  demos: Demo[];
  onSelectDemo: (demoId: string) => void;
  onStartNewRecording: (title: string) => void;
  onDeleteDemo: (demoId: string) => void;
}

export const DemoList: React.FC<DemoListProps> = ({
  demos,
  onSelectDemo,
  onStartNewRecording,
  onDeleteDemo,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const title =
      newTitle.trim() ||
      `Workflow - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    onStartNewRecording(title);
    setNewTitle('');
    setIsCreating(false);
  };

  return (
    <div className="p-3.5 space-y-3.5 flex-1 flex flex-col">
      {/* Top Action Bar */}
      {!isCreating ? (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full h-9 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium text-xs rounded-md flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Walkthrough</span>
        </button>
      ) : (
        <form
          onSubmit={handleStart}
          className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-2.5"
        >
          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              Walkthrough Title
            </label>
            <input
              type="text"
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. User Onboarding Flow"
              className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-md px-2.5 py-1.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition font-sans"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 h-7 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium text-xs rounded-md flex items-center justify-center gap-1.5 transition-colors"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Start Recording</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="h-7 px-3 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 text-xs rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Demos List Section */}
      <div className="space-y-2 flex-1">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Recorded Tours ({demos.length})
          </span>
        </div>

        {demos.length === 0 ? (
          <div className="py-12 px-4 border border-dashed border-zinc-800/80 rounded-lg text-center space-y-2 bg-zinc-950/40">
            <Layers className="w-6 h-6 text-zinc-600 mx-auto stroke-1" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-zinc-300">No walkthroughs yet</p>
              <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                Navigate to any web app and click 'New Walkthrough' to record your workflow.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {demos.map((demo) => (
              <div
                key={demo.demoId}
                onClick={() => onSelectDemo(demo.demoId)}
                className="group p-2.5 bg-zinc-900/30 border border-zinc-800/70 hover:bg-zinc-900/70 hover:border-zinc-700/90 rounded-lg cursor-pointer transition-all flex items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="text-xs font-medium text-zinc-200 group-hover:text-zinc-100 transition truncate">
                    {demo.demoTitle}
                  </h3>
                  <div className="flex items-center gap-2.5 text-[10px] font-mono text-zinc-500">
                    <span className="bg-zinc-800/60 text-zinc-400 px-1.5 py-0.2 rounded">
                      {demo.steps.length} {demo.steps.length === 1 ? 'step' : 'steps'}
                    </span>
                    <span>{new Date(demo.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${demo.demoTitle}"?`)) {
                        onDeleteDemo(demo.demoId);
                      }
                    }}
                    className="p-1.5 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50 transition opacity-0 group-hover:opacity-100"
                    title="Delete walkthrough"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
