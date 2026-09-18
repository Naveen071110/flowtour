import React, { useState, useEffect, useRef } from 'react';
import { Demo } from '../../shared/types';
import { renderDemoToVideo, VideoExportOptions, RenderProgress } from '../../shared/videoRenderer';
import {
  X,
  Video,
  Download,
  Sliders,
  Maximize2,
  Clock,
  Film,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useToast } from './Toast';

interface VideoExportModalProps {
  demo: Demo;
  isOpen: boolean;
  onClose: () => void;
  isProLicense?: boolean;
  onOpenUpgrade?: () => void;
}

export const VideoExportModal: React.FC<VideoExportModalProps> = ({
  demo,
  isOpen,
  onClose,
  isProLicense = false,
  onOpenUpgrade,
}) => {
  const { showToast } = useToast();
  const [isPro, setIsPro] = useState<boolean>(Boolean(isProLicense));
  const [fps, setFps] = useState<number>(isProLicense ? 60 : 30);
  const [resolution, setResolution] = useState<'1080p' | '4k' | '720p'>('1080p');
  const [zoomLevel, setZoomLevel] = useState<number>(1.4);
  const [stepDuration, setStepDuration] = useState<number>(2.0);
  const [format, setFormat] = useState<'mp4' | 'webm'>('mp4');
  const [showCursor, setShowCursor] = useState<boolean>(true);
  const [showClickRipple, setShowClickRipple] = useState<boolean>(true);
  const [showStepBadge, setShowStepBadge] = useState<boolean>(true);
  const [showAutoFocusFrame, setShowAutoFocusFrame] = useState<boolean>(true);

  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<RenderProgress>({
    percent: 0,
    stage: '',
    currentStep: 0,
    totalSteps: demo.steps.length,
  });
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [videoSizeBytes, setVideoSizeBytes] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [videoBlobUrl]);

  // Synchronize Pro status from chrome.storage.sync and local on modal open
  useEffect(() => {
    if (!isOpen) return;

    const syncProStatus = async () => {
      let proActive = Boolean(isProLicense);

      if (typeof chrome !== 'undefined') {
        try {
          let syncData: any = {};
          let localData: any = {};
          if (chrome.storage?.sync) {
            syncData = await chrome.storage.sync.get(['isProLicense', 'isPro']);
          }
          if (chrome.storage?.local) {
            localData = await chrome.storage.local.get(['isProLicense', 'isPro']);
          }
          proActive = Boolean(
            syncData.isProLicense ||
            syncData.isPro ||
            localData.isProLicense ||
            localData.isPro ||
            isProLicense
          );
        } catch (err) {
          console.warn('[FlowTour] Failed checking Pro status:', err);
        }
      }

      setIsPro(proActive);
      if (!proActive) {
        setResolution((prev) => (prev === '4k' ? '1080p' : prev));
        setFps(30);
      } else {
        setFps(60);
      }
    };

    syncProStatus();
  }, [isOpen, isProLicense]);

  if (!isOpen) return null;

  const handleCancelRender = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleCloseModal = () => {
    if (isRendering && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onClose();
  };

  const handleStartRender = async () => {
    setIsRendering(true);
    setErrorMessage(null);
    setProgress({ percent: 2, stage: 'Initializing canvas...', currentStep: 0, totalSteps: demo.steps.length });

    if (videoBlobUrl) {
      URL.revokeObjectURL(videoBlobUrl);
      setVideoBlobUrl(null);
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const options: VideoExportOptions = {
        resolution,
        zoomLevel,
        stepDurationSeconds: stepDuration,
        format,
        showCursor,
        showClickRipple,
        showStepBadge,
        showAutoFocusFrame,
        fps,
        signal: controller.signal,
        isProLicense: isPro,
      };

      const resultBlob = await renderDemoToVideo(demo, options, (p) => {
        setProgress(p);
      });

      if (controller.signal.aborted) {
        setIsRendering(false);
        return;
      }

      const blobUrl = URL.createObjectURL(resultBlob);
      setVideoBlobUrl(blobUrl);
      setVideoSizeBytes(resultBlob.size);
      setIsRendering(false);
      showToast('Video rendered successfully!', 'success');
    } catch (err: any) {
      if (controller.signal.aborted || err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        console.log('[FlowTour] Render aborted by user.');
        setIsRendering(false);
        showToast('Export cancelled.', 'info');
        return;
      }

      console.error('[FlowTour] Video export failed:', err);
      const friendlyMsg =
        err?.message ||
        'Video rendering encountered an error. Please test with 720p or re-record on standard web pages.';
      setErrorMessage(friendlyMsg);
      showToast(`Video export failed: ${friendlyMsg}`, 'error');
      setIsRendering(false);
    }
  };

  const handleDownload = () => {
    if (!videoBlobUrl) return;
    const a = document.createElement('a');
    a.href = videoBlobUrl;
    const cleanTitle = demo.demoTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `${cleanTitle}-${resolution}-${zoomLevel}x.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Download started!', 'success');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const validScreenshotCount = demo.steps.filter(
    (s) => Boolean(s.screenshotId && s.screenshotId.trim() !== '')
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden max-w-lg">
        {/* Header */}
        <div className="px-3.5 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-zinc-400" />
            <div>
              <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                <span>Auto-Zoom Video Export</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                  {fps} FPS
                </span>
                {!isPro && (
                  <button
                    type="button"
                    onClick={() => onOpenUpgrade?.()}
                    className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-0.5"
                    title="Unlock 60fps & 4K with Pro"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>PRO</span>
                  </button>
                )}
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono">Pan & zoom camera on click targets</p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 flex-1 overflow-y-auto space-y-3.5 text-xs">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] leading-relaxed">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="p-0.5 rounded text-red-400 hover:text-red-200"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Missing Screenshots Warning Banner */}
          {validScreenshotCount === 0 && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[11px]">No Valid Screenshots</p>
                <p className="text-[10px] text-amber-400/80 mt-0.5">
                  All {demo.steps.length} steps lack screenshots. Video export requires at least one image.
                </p>
              </div>
            </div>
          )}

          {/* Controls Grid */}
          <div className="space-y-3 bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/80">
            {/* Resolution */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Resolution
                </label>
                <span className="text-[10px] font-mono text-zinc-400">
                  {resolution === '4k' ? '3840x2160 Ultra-HD' : resolution === '1080p' ? '1920x1080 Full-HD' : '1280x720 HD'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['1080p', '4k', '720p'] as const).map((res) => {
                  const isLocked = res === '4k' && !isPro;
                  return (
                    <button
                      key={res}
                      type="button"
                      onClick={() => {
                        if (isLocked) {
                          showToast('⚡ 4K Ultra-HD is exclusive to FlowTour Pro.', 'info');
                          onOpenUpgrade?.();
                          return;
                        }
                        setResolution(res);
                      }}
                      className={`py-1.5 px-2 rounded-md font-mono text-xs text-center transition-colors flex items-center justify-center gap-1.5 ${
                        resolution === res
                          ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                          : isLocked
                          ? 'bg-zinc-900/40 border border-zinc-800/60 text-zinc-500 hover:border-zinc-700'
                          : 'bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>{res.toUpperCase()}</span>
                      {isLocked && (
                        <span className="text-[9px] font-sans font-bold px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          PRO
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Frame Rate (WebCodecs) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Frame Rate (WebCodecs)
                </label>
                <span className="text-[10px] font-mono text-zinc-400">
                  {fps} FPS {fps === 60 ? '• 60fps Smooth' : '• 30fps Standard'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono">
                <button
                  type="button"
                  onClick={() => setFps(30)}
                  className={`py-1.5 px-2 rounded-md text-xs text-center transition-colors ${
                    fps === 30
                      ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                      : 'bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  30 FPS (Free)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isPro) {
                      showToast('⚡ Smooth 60 FPS rendering is exclusive to FlowTour Pro.', 'info');
                      onOpenUpgrade?.();
                      return;
                    }
                    setFps(60);
                  }}
                  className={`py-1.5 px-2 rounded-md text-xs text-center transition-colors flex items-center justify-center gap-1.5 ${
                    fps === 60
                      ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                      : isPro
                      ? 'bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                      : 'bg-zinc-900/40 border border-zinc-800/60 text-zinc-500 hover:border-zinc-700'
                  }`}
                >
                  <span>60 FPS</span>
                  {!isPro && (
                    <span className="text-[9px] font-sans font-bold px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      PRO
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Auto-Zoom Scale */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Camera Zoom Style
                </label>
                <span className="text-[10px] font-mono text-zinc-400">
                  {zoomLevel === 1.0 ? 'Full' : `${zoomLevel}x click focus`}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1 font-mono">
                {[
                  { label: '1.0x', val: 1.0 },
                  { label: '1.25x', val: 1.25 },
                  { label: '1.4x', val: 1.4 },
                  { label: '1.6x', val: 1.6 },
                  { label: '1.8x', val: 1.8 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setZoomLevel(item.val)}
                    className={`py-1.5 px-1 rounded-md text-[11px] text-center transition-colors ${
                      zoomLevel === item.val
                        ? 'bg-zinc-100 text-zinc-950 font-semibold'
                        : 'bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step Duration */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
                Pacing per Step
              </label>
              <div className="grid grid-cols-3 gap-1.5 font-mono">
                {[
                  { label: '1.5s', val: 1.5 },
                  { label: '2.0s', val: 2.0 },
                  { label: '3.0s', val: 3.0 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setStepDuration(item.val)}
                    className={`py-1.5 px-2 rounded-md text-xs text-center transition-colors ${
                      stepDuration === item.val
                        ? 'bg-zinc-100 text-zinc-950 font-semibold'
                        : 'bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Overlays Toggles */}
            <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-2 gap-2 text-[11px] text-zinc-400 font-mono">
              <label className="flex items-center gap-2 cursor-pointer hover:text-zinc-200">
                <input
                  type="checkbox"
                  checked={showAutoFocusFrame}
                  onChange={(e) => setShowAutoFocusFrame(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-zinc-100"
                />
                Auto-Focus Box
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-zinc-200">
                <input
                  type="checkbox"
                  checked={showCursor}
                  onChange={(e) => setShowCursor(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-zinc-100"
                />
                macOS Cursor
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-zinc-200">
                <input
                  type="checkbox"
                  checked={showClickRipple}
                  onChange={(e) => setShowClickRipple(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-zinc-100"
                />
                Click Ripples
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-zinc-200">
                <input
                  type="checkbox"
                  checked={showStepBadge}
                  onChange={(e) => setShowStepBadge(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-zinc-100"
                />
                Step Badges
              </label>
            </div>
          </div>

          {/* Render Progress Bar */}
          {isRendering && (
            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-zinc-300 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                  <span>{progress.stage}</span>
                </span>
                <span className="font-mono text-zinc-100 font-bold">{progress.percent}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-zinc-100 h-full rounded-full transition-all duration-200"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[10px] text-zinc-500 font-mono">WebCodecs GPU rendering</span>
                <button
                  type="button"
                  onClick={handleCancelRender}
                  className="text-[11px] text-red-400 hover:text-red-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Video Preview Player */}
          {videoBlobUrl && !isRendering && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-200 flex items-center gap-1 font-mono text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Ready ({formatFileSize(videoSizeBytes)})</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {resolution.toUpperCase()} • {fps} FPS {!isPro && '• Watermarked'}
                </span>
              </div>

              <div className="relative rounded-lg overflow-hidden border border-zinc-800 bg-black aspect-video shadow-md">
                <video
                  ref={videoRef}
                  src={videoBlobUrl}
                  controls
                  autoPlay
                  loop
                  muted
                  className="w-full h-full object-contain"
                />
              </div>

              <button
                onClick={handleDownload}
                className="w-full h-8 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download MP4 ({formatFileSize(videoSizeBytes)})</span>
              </button>
            </div>
          )}

          {/* Free Tier Watermark Notice */}
          {!isPro && !isRendering && (
            <div className="p-2.5 bg-zinc-900/40 border border-zinc-800/80 rounded-lg flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[11px] font-mono text-zinc-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  <span>Free Export: 'Made with FlowTour' Watermark</span>
                </span>
                <p className="text-[10px] text-zinc-500 font-mono">
                  Upgrade to Pro Lifetime ($19) for clean exports & 4K 60fps
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenUpgrade?.()}
                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-semibold rounded transition-colors"
              >
                Upgrade
              </button>
            </div>
          )}

          {/* Generate Button */}
          {!videoBlobUrl && !isRendering && (
            <button
              onClick={handleStartRender}
              disabled={validScreenshotCount === 0}
              className="w-full h-9 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-40 disabled:hover:bg-zinc-100 text-zinc-950 font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs shadow-sm"
              title={
                validScreenshotCount === 0
                  ? 'Cannot export: 0 steps contain valid screenshots'
                  : 'Render Auto-Zoom Video'
              }
            >
              <Film className="w-3.5 h-3.5" />
              <span>Render Auto-Zoom Video</span>
            </button>
          )}

          {/* Re-generate if already rendered */}
          {videoBlobUrl && !isRendering && (
            <button
              onClick={handleStartRender}
              className="w-full h-7 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors text-xs"
            >
              <RefreshCw className="w-3 h-3 text-zinc-400" />
              <span>Re-render</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
