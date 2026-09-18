import React from 'react';
import { APP_CONFIG } from '../../shared/constants';
import { Settings, Circle } from 'lucide-react';

interface HeaderProps {
  isRecording: boolean;
  stepCount: number;
  isProLicense?: boolean;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isRecording,
  stepCount,
  isProLicense = false,
  onOpenSettings,
}) => {
  return (
    <header className="h-12 px-3.5 bg-[#09090b] border-b border-zinc-800/80 flex items-center justify-between sticky top-0 z-30">
      {/* Brand & Status */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
          <img src="/icons/icon48.png" alt="FlowTour" className="w-4 h-4 object-contain" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-zinc-100 tracking-tight">
            {APP_CONFIG.name}
          </span>
          <span className="text-zinc-700 text-xs">/</span>
          {isRecording ? (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded text-[11px] font-mono text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>REC {stepCount}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              <span>Idle</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {isProLicense ? (
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
            title="Pro Lifetime Active (Chrome Account Synced) - Click to Manage"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>⚡ Pro Active</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors cursor-pointer"
            title="Community Free - Click to Enter License Key or Upgrade"
          >
            <span>Community Free</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenSettings}
          className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
          title="Settings & License"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
