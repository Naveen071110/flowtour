import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { Demo, Step } from './types';
import { getScreenshot, getScreenshotBlob } from './idb';
import { APP_CONFIG } from './constants';
import { isProUser } from './licenseValidator';

export interface VideoExportOptions {
  resolution: '1080p' | '4k' | '720p';
  zoomLevel: number; // 1.0, 1.25, 1.4, 1.6, 1.8
  stepDurationSeconds: number; // 1.5, 2.0, 3.0
  format: 'mp4' | 'webm' | 'gif';
  showCursor?: boolean;
  showStepBadge?: boolean;
  showClickRipple?: boolean;
  showAutoFocusFrame?: boolean;
  fps?: number; // 60 or 30
  signal?: AbortSignal;
  isProLicense?: boolean;
  customLogoUrl?: string;
}

export interface RenderProgress {
  percent: number;
  stage: string;
  currentStep: number;
  totalSteps: number;
}

// Easing functions for smooth cinematic camera movements
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Loads and fully decodes a single step's screenshot from IndexedDB.
 * Awaits both img.onload and img.decode() to guarantee the image bitmap is resident in memory
 * before any canvas drawing commences.
 */
async function loadStepImage(screenshotId: string): Promise<HTMLImageElement> {
  if (!screenshotId) {
    throw new Error('Step has no screenshotId');
  }
  const blob = await getScreenshot(screenshotId);
  if (!blob) {
    throw new Error(`Screenshot not found in IndexedDB for ID: ${screenshotId}`);
  }

  const img = new Image();
  const objectUrl = URL.createObjectURL(blob);
  img.src = objectUrl;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(new Error(`Failed to load image from blob for ${screenshotId}: ${e}`));
  });

  try {
    if ('decode' in img) {
      await img.decode();
    }
  } catch (decodeErr) {
    console.warn('[FlowTour Video] img.decode() non-fatal fallback:', decodeErr);
  }

  URL.revokeObjectURL(objectUrl);
  return img;
}

/**
 * Safely loads an image by screenshot ID, returning null if ID is missing or load fails
 */
async function safeLoadImageById(screenshotId?: string): Promise<HTMLImageElement | null> {
  if (!screenshotId || screenshotId.trim() === '') return null;
  try {
    return await loadStepImage(screenshotId);
  } catch (err) {
    console.warn(`[FlowTour Video] Could not load image for ID ${screenshotId}:`, err);
    return null;
  }
}

/**
 * Resolves both pre-action image (what the screen looked like when clicking)
 * and post-action image (the result of the click) for smooth cinematic transition.
 */
async function resolveStepImagePair(
  demo: Demo,
  allSteps: Step[],
  currentIndex: number,
  lastResolvedPostImg: HTMLImageElement | null
): Promise<{ preImg: HTMLImageElement; postImg: HTMLImageElement }> {
  const currentStep = allSteps[currentIndex];

  // 1. Determine pre-action image
  let preImg: HTMLImageElement | null = null;

  if (currentIndex === 0) {
    // For Step 1, prefer demo.initialScreenshotId
    if (demo.initialScreenshotId) {
      preImg = await safeLoadImageById(demo.initialScreenshotId);
    }
    // Fallback to step[0].screenshotId
    if (!preImg && currentStep.screenshotId) {
      preImg = await safeLoadImageById(currentStep.screenshotId);
    }
  } else {
    // For subsequent steps, preImg is previous step's postImg if available
    if (lastResolvedPostImg) {
      preImg = lastResolvedPostImg;
    } else if (currentStep.screenshotId) {
      preImg = await safeLoadImageById(currentStep.screenshotId);
    }
  }

  // 2. Determine post-action image
  let postImg: HTMLImageElement | null = null;
  if (currentStep.nextScreenshotId && currentStep.nextScreenshotId !== currentStep.screenshotId) {
    postImg = await safeLoadImageById(currentStep.nextScreenshotId);
  }

  // If nextScreenshotId not present, check next step's screenshot
  if (!postImg && currentIndex + 1 < allSteps.length) {
    const nextStep = allSteps[currentIndex + 1];
    if (nextStep.screenshotId && nextStep.screenshotId !== currentStep.screenshotId) {
      postImg = await safeLoadImageById(nextStep.screenshotId);
    }
  }

  // Fallbacks if either is missing
  if (!preImg && postImg) preImg = postImg;
  if (!postImg && preImg) postImg = preImg;

  // Ultimate fallback across all steps
  if (!preImg || !postImg) {
    const { img: fallbackImg } = await resolveStepImage(allSteps, currentIndex);
    if (!preImg) preImg = fallbackImg;
    if (!postImg) postImg = fallbackImg;
  }

  return { preImg, postImg };
}

/**
 * Resolves a valid screenshot for a step, with fallback to neighboring steps
 * so that no steps in the walkthrough are ever dropped from the video.
 */
async function resolveStepImage(
  steps: Step[],
  currentIndex: number
): Promise<{ img: HTMLImageElement; isFallback: boolean }> {
  const currentStep = steps[currentIndex];

  // 1. Try loading current step's screenshot
  if (currentStep.screenshotId && currentStep.screenshotId.trim() !== '') {
    try {
      const img = await loadStepImage(currentStep.screenshotId);
      return { img, isFallback: false };
    } catch (err) {
      console.warn(`[FlowTour Video] Could not load screenshot for step ${currentIndex + 1}, searching fallback:`, err);
    }
  }

  // 2. Fallback to nearest previous step with a valid screenshot
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (steps[i].screenshotId && steps[i].screenshotId.trim() !== '') {
      try {
        const img = await loadStepImage(steps[i].screenshotId);
        return { img, isFallback: true };
      } catch {}
    }
  }

  // 3. Fallback to nearest subsequent step with a valid screenshot
  for (let i = currentIndex + 1; i < steps.length; i++) {
    if (steps[i].screenshotId && steps[i].screenshotId.trim() !== '') {
      try {
        const img = await loadStepImage(steps[i].screenshotId);
        return { img, isFallback: true };
      } catch {}
    }
  }

  throw new Error('No valid screenshots found in this walkthrough to export.');
}

/**
 * Draws a macOS-style vector cursor pointer with drop shadow
 */
function drawMacCursor(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 8 * scale;
  ctx.shadowOffsetX = 2 * scale;
  ctx.shadowOffsetY = 4 * scale;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 24);
  ctx.lineTo(6, 19);
  ctx.lineTo(12, 30);
  ctx.lineTo(16, 28);
  ctx.lineTo(10.5, 17);
  ctx.lineTo(18, 17);
  ctx.closePath();

  ctx.fillStyle = '#0f172a';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws a macOS-style pointer hand cursor with drop shadow for hover states on interactive elements
 */
function drawMacHandCursor(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 8 * scale;
  ctx.shadowOffsetX = 2 * scale;
  ctx.shadowOffsetY = 4 * scale;

  ctx.beginPath();
  // macOS style pointing hand outline with hotspot at tip of index finger (0, 0)
  ctx.moveTo(0, 0);
  ctx.lineTo(4, 0);
  ctx.lineTo(4, 10);
  ctx.lineTo(7, 10);
  ctx.bezierCurveTo(8.5, 10, 9, 11, 9, 12);
  ctx.lineTo(9, 11.5);
  ctx.bezierCurveTo(10.5, 11.5, 11, 12.5, 11, 13.5);
  ctx.lineTo(11, 13);
  ctx.bezierCurveTo(12.5, 13, 13.5, 14, 13.5, 15);
  ctx.lineTo(13.5, 20);
  ctx.bezierCurveTo(13.5, 25, 8, 27, 4, 27);
  ctx.bezierCurveTo(0, 27, -4, 24, -4, 18);
  ctx.lineTo(-4, 12);
  ctx.bezierCurveTo(-4, 9, -1, 9, 0, 10);
  ctx.closePath();

  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#0f172a';
  ctx.stroke();

  // Internal finger division lines
  ctx.beginPath();
  ctx.moveTo(4, 11);
  ctx.lineTo(4, 18);
  ctx.moveTo(8, 13);
  ctx.lineTo(8, 19);
  ctx.moveTo(11, 15);
  ctx.lineTo(11, 20);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

/**
 * Checks whether an action target is an interactive clickable element
 */
function isInteractiveElement(step: Step): boolean {
  const tag = (step.elementTagName || '').toLowerCase();
  const selector = (step.selector || '').toLowerCase();
  if (['button', 'a', 'input', 'select', 'textarea', 'nav', 'summary'].includes(tag)) return true;
  if (
    selector.includes('button') ||
    selector.includes('btn') ||
    selector.includes('nav') ||
    selector.includes('link') ||
    selector.includes('menu') ||
    selector.includes('tab') ||
    selector.includes('card')
  ) {
    return true;
  }
  return false;
}

/**
 * Computes exact element bounds on canvas using recorded elementRect, or fallback
 */
function computeElementCanvasBounds(
  step: Step,
  preDrawX: number,
  preDrawY: number,
  preDrawW: number,
  preDrawH: number,
  targetClickX: number,
  targetClickY: number
): { x: number; y: number; w: number; h: number } {
  if (
    step.coordinates?.elementRect &&
    step.coordinates.elementRect.width > 8 &&
    step.coordinates.elementRect.height > 8
  ) {
    const vpW = step.viewport?.width || 1280;
    const vpH = step.viewport?.height || 800;
    const scaleX = preDrawW / vpW;
    const scaleY = preDrawH / vpH;

    const elX = preDrawX + step.coordinates.elementRect.left * scaleX;
    const elY = preDrawY + step.coordinates.elementRect.top * scaleY;
    const elW = step.coordinates.elementRect.width * scaleX;
    const elH = step.coordinates.elementRect.height * scaleY;

    if (elW > 12 && elH > 10 && elW < preDrawW * 0.85 && elH < preDrawH * 0.85) {
      return { x: elX, y: elY, w: elW, h: elH };
    }
  }

  // Fallback: smart button-like bounding box centered at target click
  const defaultW = Math.min(160, preDrawW * 0.14);
  const defaultH = Math.min(46, preDrawH * 0.08);
  return {
    x: targetClickX - defaultW / 2,
    y: targetClickY - defaultH / 2,
    w: defaultW,
    h: defaultH,
  };
}

/**
 * Draws an ultra-subtle radial spotlight around the active element that gently frames focus
 * without dimming or obscuring background text and surrounding UI elements.
 */
function drawFocusSpotlight(
  ctx: CanvasRenderingContext2D,
  targetX: number,
  targetY: number,
  canvasW: number,
  canvasH: number,
  alpha: number
) {
  if (alpha <= 0.01) return;

  ctx.save();
  const innerRadius = Math.max(120, canvasW * 0.12);
  const outerRadius = Math.max(480, canvasW * 0.55);

  const gradient = ctx.createRadialGradient(targetX, targetY, innerRadius, targetX, targetY, outerRadius);
  gradient.addColorStop(0, 'rgba(3, 7, 18, 0)');
  gradient.addColorStop(0.5, 'rgba(3, 7, 18, 0)');
  gradient.addColorStop(1, `rgba(3, 7, 18, ${0.08 * alpha})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.restore();
}


/**
 * Draws an interactive auto-focus reticle frame around the target element
 */
function drawAutoFocusFrame(
  ctx: CanvasRenderingContext2D,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  alpha: number,
  pulsePhase: number,
  isClicking: boolean
) {
  if (alpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);

  // Subtle breathing expansion during hover
  const breath = Math.sin(pulsePhase * Math.PI * 2) * 1.8;
  const pad = 8 + (isClicking ? -2 : breath);
  const x = boxX - pad;
  const y = boxY - pad;
  const w = boxW + pad * 2;
  const h = boxH + pad * 2;
  const r = Math.min(10, Math.min(w, h) / 4);

  // 1. Soft glowing fill
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  const fillColor = isClicking ? 'rgba(236, 72, 153, 0.16)' : 'rgba(99, 102, 241, 0.08)';
  ctx.fillStyle = fillColor;
  ctx.fill();

  // 2. Glowing border
  ctx.shadowColor = isClicking ? 'rgba(236, 72, 153, 0.85)' : 'rgba(99, 102, 241, 0.65)';
  ctx.shadowBlur = isClicking ? 18 : 12;
  ctx.lineWidth = isClicking ? 2.5 : 2;
  ctx.strokeStyle = isClicking ? '#ec4899' : '#818cf8';
  ctx.stroke();

  // 3. Screen Studio Corner brackets / focus marks
  const bracketLen = Math.min(14, Math.min(w, h) * 0.25);
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = isClicking ? '#f472b6' : '#a5b4fc';

  // Top-Left bracket
  ctx.beginPath();
  ctx.moveTo(x, y + bracketLen);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.lineTo(x + bracketLen, y);
  ctx.stroke();

  // Top-Right bracket
  ctx.beginPath();
  ctx.moveTo(x + w - bracketLen, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + bracketLen);
  ctx.stroke();

  // Bottom-Left bracket
  ctx.beginPath();
  ctx.moveTo(x, y + h - bracketLen);
  ctx.lineTo(x, y + h - r);
  ctx.arcTo(x, y + h, x + r, y + h, r);
  ctx.lineTo(x + bracketLen, y + h);
  ctx.stroke();

  // Bottom-Right bracket
  ctx.beginPath();
  ctx.moveTo(x + w - bracketLen, y + h);
  ctx.lineTo(x + w - r, y + h);
  ctx.arcTo(x + w, y + h, x + w, y + h - r, r);
  ctx.lineTo(x + w, y + h - bracketLen);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the animated click ripple at target coordinates
 */
function drawClickRipple(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number) {
  if (progress <= 0 || progress >= 1) return;

  ctx.save();
  const maxRadius = 48;
  const radius = maxRadius * easeOutQuart(progress);
  const alpha = Math.max(0, 1 - progress);

  // Outer expanding pulse ring
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(236, 72, 153, ${alpha * 0.9})`;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Secondary soft halo
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(99, 102, 241, ${alpha * 0.6})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Center solid ping core
  const coreScale = progress < 0.3 ? 1 + progress * 2 : Math.max(1, 1.6 - progress);
  ctx.beginPath();
  ctx.arc(x, y, 7 * coreScale, 0, Math.PI * 2);
  ctx.fillStyle = '#ec4899';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws a modern frosted-glass lower-third badge with step info
 */
function drawStepBadge(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  stepIndex: number,
  totalSteps: number,
  title: string,
  alpha: number
) {
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  const badgeH = 54;
  const badgeY = canvasH - badgeH - 36;
  const maxTextW = canvasW * 0.6;

  ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const textMetrics = ctx.measureText(title);
  const titleW = Math.min(textMetrics.width, maxTextW);
  const badgeW = titleW + 160;
  const badgeX = (canvasW - badgeW) / 2;

  // Background pill with shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;

  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 27);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.stroke();

  // Step counter pill
  const pillW = 68;
  const pillH = 26;
  const pillX = badgeX + 16;
  const pillY = badgeY + (badgeH - pillH) / 2;

  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 13);
  ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
  ctx.stroke();

  ctx.font = '700 11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#a5b4fc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`STEP ${stepIndex}/${totalSteps}`, pillX + pillW / 2, pillY + pillH / 2);

  // Title text
  ctx.font = '600 14px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  let displayTitle = title;
  if (textMetrics.width > maxTextW) {
    displayTitle = title.substring(0, 36) + '...';
  }
  ctx.fillText(displayTitle, pillX + pillW + 14, badgeY + badgeH / 2);

  ctx.restore();
}

/**
 * Safely loads a custom brand logo image from a URL or data URL
 */
async function loadLogoImage(url?: string): Promise<HTMLImageElement | null> {
  if (!url || url.trim() === '') return null;
  try {
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(new Error(`Failed to load logo: ${e}`));
    });
    if ('decode' in img) {
      await img.decode();
    }
    return img;
  } catch (err) {
    console.warn('[FlowTour Video] Failed to load custom logo:', err);
    return null;
  }
}

/**
 * Draws a subtle, professional watermark badge in the bottom-right corner for Free tier,
 * or draws the user's custom brand logo for Pro tier.
 */
function drawWatermarkOrLogo(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  isPro: boolean,
  customLogoImg: HTMLImageElement | null
) {
  const scale = canvasW / 1920;

  if (isPro) {
    // Pro Tier: Skip FlowTour watermark entirely.
    // If a custom brand logo was provided, render it in the bottom-right corner.
    if (customLogoImg && customLogoImg.width > 0 && customLogoImg.height > 0) {
      ctx.save();
      const maxLogoW = 160 * scale;
      const maxLogoH = 48 * scale;
      const logoAspect = customLogoImg.width / customLogoImg.height;
      let drawW = maxLogoW;
      let drawH = drawW / logoAspect;
      if (drawH > maxLogoH) {
        drawH = maxLogoH;
        drawW = drawH * logoAspect;
      }
      const posX = canvasW - drawW - 16 * scale;
      const posY = canvasH - drawH - 16 * scale;

      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 8 * scale;
      ctx.shadowOffsetY = 2 * scale;
      ctx.drawImage(customLogoImg, posX, posY, drawW, drawH);
      ctx.restore();
    }
    return;
  }

  // Free Tier: Subtle glassmorphism watermark badge (Made with FlowTour)
  ctx.save();

  const fontSize = Math.round(11.5 * scale);
  const fontStr = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.font = fontStr;

  const text = 'Made with FlowTour';
  const textMetrics = ctx.measureText(text);
  const textW = textMetrics.width;

  const dotRadius = 3 * scale;
  const padX = 10 * scale;
  const padY = 5.5 * scale;
  const badgeH = Math.round(fontSize + padY * 2);
  const badgeW = Math.round(padX * 2 + dotRadius * 2 + 7 * scale + textW);

  const badgeX = canvasW - badgeW - 16 * scale;
  const badgeY = canvasH - badgeH - 16 * scale;
  const radius = 6 * scale;

  // 1. Subtle drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 10 * scale;
  ctx.shadowOffsetY = 3 * scale;

  // 2. Glassmorphism background pill (bg-black/60)
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, radius);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.60)';
  ctx.fill();

  // 3. Border: 1px border-white/20
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(1, 1 * scale);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
  ctx.stroke();

  // 4. Clean emerald glowing accent dot
  const dotCenterX = badgeX + padX + dotRadius;
  const dotCenterY = badgeY + badgeH / 2;

  ctx.shadowColor = 'rgba(16, 185, 129, 0.7)';
  ctx.shadowBlur = 5 * scale;
  ctx.beginPath();
  ctx.arc(dotCenterX, dotCenterY, dotRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#10b981';
  ctx.fill();

  // 5. Text: text-white/90 font-sans
  ctx.shadowColor = 'transparent';
  ctx.font = fontStr;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, dotCenterX + dotRadius + 6 * scale, dotCenterY);

  ctx.restore();
}

interface CodecNegotiation {
  config: VideoEncoderConfig;
  muxerCodec: 'avc' | 'vp9' | 'av1';
}

/**
 * Dynamically queries VideoEncoder.isConfigSupported to select the optimal codec profile
 * for the requested resolution and framerate.
 *
 * CRITICAL FOR 4K:
 * H.264 Level 4.2 (avc1.64002a) rejects 3840x2160 because its max frame size is 8,704 macroblocks.
 * 4K requires Level 5.1 (avc1.640033) or Level 5.2 (avc1.640034) which supports 36,864 macroblocks.
 * On devices where 4K H.264 hardware encoding is unavailable, this falls back to VP9 or 30fps.
 */
async function selectSupportedCodecConfig(
  width: number,
  height: number,
  desiredFps: number,
  is4k: boolean
): Promise<CodecNegotiation | null> {
  if (typeof VideoEncoder === 'undefined') return null;

  const candidates: Array<{
    codec: string;
    muxerCodec: 'avc' | 'vp9' | 'av1';
    bitrate: number;
    framerate: number;
  }> = [];

  if (is4k) {
    // 4K (3840x2160) configurations:
    // 1. H.264 High Profile Level 5.1 (0x33)
    candidates.push({ codec: 'avc1.640033', muxerCodec: 'avc', bitrate: 36_000_000, framerate: desiredFps });
    // 2. H.264 High Profile Level 5.2 (0x34)
    candidates.push({ codec: 'avc1.640034', muxerCodec: 'avc', bitrate: 36_000_000, framerate: desiredFps });
    // 3. H.264 Main Profile Level 5.1
    candidates.push({ codec: 'avc1.4d0033', muxerCodec: 'avc', bitrate: 28_000_000, framerate: desiredFps });
    // 4. VP9 Profile 0 Level 4.1 (widely supported software encoder in Chromium)
    candidates.push({ codec: 'vp09.00.41.08', muxerCodec: 'vp9', bitrate: 30_000_000, framerate: desiredFps });
    // 5. VP9 Profile 0 Level 5.1
    candidates.push({ codec: 'vp09.00.51.08', muxerCodec: 'vp9', bitrate: 30_000_000, framerate: desiredFps });

    // Fallbacks if 60fps is not supported on the user's GPU/hardware
    if (desiredFps > 30) {
      candidates.push({ codec: 'avc1.640033', muxerCodec: 'avc', bitrate: 24_000_000, framerate: 30 });
      candidates.push({ codec: 'avc1.640034', muxerCodec: 'avc', bitrate: 24_000_000, framerate: 30 });
      candidates.push({ codec: 'vp09.00.41.08', muxerCodec: 'vp9', bitrate: 20_000_000, framerate: 30 });
    }
  } else {
    // 1080p / 720p: H.264 Level 4.2 / Main / Baseline
    candidates.push({ codec: 'avc1.64002a', muxerCodec: 'avc', bitrate: 16_000_000, framerate: desiredFps });
    candidates.push({ codec: 'avc1.4d002a', muxerCodec: 'avc', bitrate: 14_000_000, framerate: desiredFps });
    candidates.push({ codec: 'avc1.42001f', muxerCodec: 'avc', bitrate: 12_000_000, framerate: desiredFps });
    candidates.push({ codec: 'vp09.00.41.08', muxerCodec: 'vp9', bitrate: 14_000_000, framerate: desiredFps });
  }

  for (const item of candidates) {
    try {
      const cfg: VideoEncoderConfig = {
        codec: item.codec,
        width,
        height,
        bitrate: item.bitrate,
        framerate: item.framerate,
      };
      const test = await VideoEncoder.isConfigSupported(cfg);
      if (test.supported) {
        return {
          config: test.config || cfg,
          muxerCodec: item.muxerCodec,
        };
      }
    } catch {
      // Continue to next candidate
    }
  }

  return null;
}

/**
 * Main Video Animation & Encoding Engine:
 * Renders all steps sequentially with dynamic zoom-in on element click
 * and smooth zoom-out back to full page overview.
 */
export async function renderDemoToVideo(
  demo: Demo,
  options: VideoExportOptions,
  onProgress?: (progress: RenderProgress) => void
): Promise<Blob> {
  // Strictly resolve Pro status via cryptographic token validator
  const isPro = await isProUser();

  // Enforce resolution: 4K strictly requires verified Pro token
  const is4k = isPro && options.resolution === '4k';
  const targetZoom = options.zoomLevel ?? 1.4;
  const stepDurationMs = (options.stepDurationSeconds ?? 2.0) * 1000;

  // Custom logo only allowed if user has authentic Pro token
  let customLogoUrl = isPro ? options.customLogoUrl : undefined;
  if (isPro && !customLogoUrl && typeof chrome !== 'undefined') {
    try {
      const data = await chrome.storage.local.get(['customLogoUrl', 'customLogo']);
      customLogoUrl = data?.customLogoUrl || data?.customLogo;
    } catch {}
  }
  const customLogoImg = isPro && customLogoUrl ? await loadLogoImage(customLogoUrl) : null;

  // Canvas Dimensions: Non-Pro users cannot exceed 1080p
  let width = 1920;
  let height = 1080;
  if (is4k) {
    width = 3840;
    height = 2160;
  } else if (options.resolution === '720p') {
    width = 1280;
    height = 720;
  }

  // Enforce FPS: Non-Pro users are strictly limited to 30 FPS
  const maxAllowedFps = isPro ? 60 : 30;
  const requestedFps = Math.min(options.fps ?? (is4k ? 30 : (isPro ? 60 : 30)), maxAllowedFps);

  // Use all steps from the demo so NO steps are skipped
  const allSteps = demo.steps;
  if (allSteps.length === 0) {
    throw new Error('No steps recorded in this walkthrough.');
  }

  // Check if at least one step has a screenshot
  const hasAnyScreenshot = allSteps.some((s) => Boolean(s.screenshotId && s.screenshotId.trim() !== ''));
  if (!hasAnyScreenshot) {
    throw new Error(
      `No screenshots found in this walkthrough (${allSteps.length} steps recorded). ` +
      `Please ensure steps were recorded on a standard website (http/https).`
    );
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) throw new Error('Could not initialize 2D Canvas context');

  // Enable high-fidelity bicubic image smoothing for crisp typography during zoom & pan
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Check WebCodecs availability and negotiate supported codec
  const hasWebCodecs = typeof VideoEncoder !== 'undefined';
  let negotiated = hasWebCodecs
    ? await selectSupportedCodecConfig(width, height, requestedFps, is4k)
    : null;

  if (!negotiated) {
    console.warn('[FlowTour] WebCodecs not supported or no matching configuration found. Falling back to MediaRecorder.');
    return renderWithMediaRecorder(canvas, ctx, allSteps, options, onProgress, Boolean(isPro), customLogoImg);
  }

  const effectiveFps = negotiated.config.framerate ?? requestedFps;

  // Configure MP4 Muxer with matching codec and timescale
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: negotiated.muxerCodec,
      width,
      height,
      frameRate: effectiveFps,
    },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  let encoderFatalError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      console.error('[FlowTour WebCodecs] Fatal encoder error:', e);
      encoderFatalError = e instanceof Error ? e : new Error(String(e));
    },
  });

  try {
    encoder.configure(negotiated.config);
  } catch (err: any) {
    console.warn('[FlowTour WebCodecs] encoder.configure failed:', err);
    try {
      encoder.close();
    } catch {}
    return renderWithMediaRecorder(canvas, ctx, allSteps, options, onProgress, Boolean(isPro), customLogoImg);
  }

  const totalSteps = allSteps.length;
  const totalFramesPerStep = Math.round((stepDurationMs / 1000) * effectiveFps);
  const totalFrames = totalFramesPerStep * totalSteps;

  let globalFrameIndex = 0;
  let prevCursorX = width / 2;
  let prevCursorY = height / 2;
  let lastResolvedPostImg: HTMLImageElement | null = null;

  // Cinematic 5-phase choreography per step:
  // Phase 1 (0% to 24%): Full Page Overview & Cursor Glide (1.0x, cursor glides from previous position)
  // Phase 2 (24% to 44%): Smooth Auto-Zoom Tracking (camera zooms in, focus frame & spotlight fade in)
  // Phase 3 (44% to 62%): Hover & Auto-Focus Lock (camera locks, cursor hovers with hand pointer, breathing glow)
  // Phase 4 (62% to 78%): Action Click (cursor presses down, ripple radiates, frame flashes, cross-fade)
  // Phase 5 (78% to 100%): Zoom-Out Reveal (smooth zoom-out back to 1.0x overview of resulting page)
  const isNoZoom = targetZoom <= 1.05;
  const p1EndMs = Math.round(stepDurationMs * 0.24);
  const p2EndMs = Math.round(stepDurationMs * 0.44);
  const p3EndMs = Math.round(stepDurationMs * 0.62);
  const p4EndMs = Math.round(stepDurationMs * 0.78);
  const p5DurationMs = Math.max(1, stepDurationMs - p4EndMs);

  try {
    for (let index = 0; index < allSteps.length; index++) {
      if (options.signal?.aborted) {
        throw new Error('Video export was canceled by user.');
      }
      const step = allSteps[index];

      onProgress?.({
        percent: Math.round(5 + (globalFrameIndex / totalFrames) * 85),
        stage: `Loading Step ${index + 1} of ${totalSteps}...`,
        currentStep: index + 1,
        totalSteps,
      });

      // Resolve both pre-action screenshot and post-action screenshot
      const { preImg, postImg } = await resolveStepImagePair(demo, allSteps, index, lastResolvedPostImg);
      lastResolvedPostImg = postImg;

      // Calculate image drawing bounds for preImg and postImg
      const scaleToFitPre = Math.min(width / preImg.width, height / preImg.height);
      const preDrawW = preImg.width * scaleToFitPre;
      const preDrawH = preImg.height * scaleToFitPre;
      const preDrawX = (width - preDrawW) / 2;
      const preDrawY = (height - preDrawH) / 2;

      const scaleToFitPost = Math.min(width / postImg.width, height / postImg.height);
      const postDrawW = postImg.width * scaleToFitPost;
      const postDrawH = postImg.height * scaleToFitPost;
      const postDrawX = (width - postDrawW) / 2;
      const postDrawY = (height - postDrawH) / 2;

      // Click coordinates normalized to [0, 1] relative to the pre-action image
      const clickNormX = Math.min(Math.max(step.coordinates?.xPercent ?? 0.5, 0.05), 0.95);
      const clickNormY = Math.min(Math.max(step.coordinates?.yPercent ?? 0.5, 0.05), 0.95);
      const targetClickX = preDrawX + clickNormX * preDrawW;
      const targetClickY = preDrawY + clickNormY * preDrawH;

      // Element bounds for auto-focus highlight reticle
      const elBounds = computeElementCanvasBounds(
        step,
        preDrawX,
        preDrawY,
        preDrawW,
        preDrawH,
        targetClickX,
        targetClickY
      );
      const isClickable = isInteractiveElement(step);

      // Dynamic Camera Auto-Focus targeting:
      // Soft margin (20%) ensures the camera centers on elements (even in sidebars and headers)
      const effectiveZoom = isNoZoom ? 1.0 : targetZoom;
      const marginW = (width / effectiveZoom) * 0.20;
      const marginH = (height / effectiveZoom) * 0.20;
      const focusCamX = Math.max(marginW, Math.min(width - marginW, targetClickX));
      const focusCamY = Math.max(marginH, Math.min(height - marginH, targetClickY));

      // Full page camera center (1.0x) is always the exact canvas center
      const fullPageCamX = width / 2;
      const fullPageCamY = height / 2;

      const startCursorX = prevCursorX;
      const startCursorY = prevCursorY;

      // STEP FRAME ENCODING LOOP
      for (let f = 0; f < totalFramesPerStep; f++) {
        if (options.signal?.aborted) {
          throw new Error('Video export was canceled by user.');
        }
        const frameTimeMs = (f / totalFramesPerStep) * stepDurationMs;

        let currentZoom = 1.0;
        let camX = fullPageCamX;
        let camY = fullPageCamY;
        let cursorX = targetClickX;
        let cursorY = targetClickY;
        let cursorType: 'arrow' | 'hand' = 'arrow';
        let isClicking = false;
        let rippleProgress = -1;
        let focusFrameAlpha = 0;
        let pulsePhase = 0;
        let badgeAlpha = 1;
        let crossFadeAlpha = 0;

        if (isNoZoom) {
          // Full Page mode: no camera zoom, but full cursor flight, hover, spotlight & ripple
          currentZoom = 1.0;
          camX = fullPageCamX;
          camY = fullPageCamY;

          if (frameTimeMs < p1EndMs) {
            // Phase 1: Glide
            const tGlide = easeOutQuart(frameTimeMs / p1EndMs);
            cursorX = lerp(startCursorX, targetClickX, tGlide);
            cursorY = lerp(startCursorY, targetClickY, tGlide);
            badgeAlpha = Math.min(1, frameTimeMs / 200);
            cursorType = 'arrow';
          } else if (frameTimeMs < p3EndMs) {
            // Phase 2 & 3: Hover & Focus
            cursorX = targetClickX;
            cursorY = targetClickY;
            const tFadeIn = Math.min(1, (frameTimeMs - p1EndMs) / (p2EndMs - p1EndMs));
            focusFrameAlpha = easeOutQuart(tFadeIn);
            pulsePhase = (frameTimeMs - p2EndMs) / Math.max(1, p3EndMs - p2EndMs);
            cursorType = isClickable ? 'hand' : 'arrow';
          } else if (frameTimeMs < p4EndMs) {
            // Phase 4: Action Click
            cursorX = targetClickX;
            cursorY = targetClickY;
            cursorType = isClickable ? 'hand' : 'arrow';
            const actionElapsed = frameTimeMs - p3EndMs;
            const actionDuration = p4EndMs - p3EndMs;
            rippleProgress = Math.min(1, actionElapsed / Math.min(550, actionDuration * 0.9));
            isClicking = actionElapsed < actionDuration * 0.35;
            focusFrameAlpha = Math.max(0, 1 - actionElapsed / actionDuration);

            if (step.actionType === 'hover') {
              rippleProgress = -1;
              isClicking = false;
            }

            const crossFadeStart = actionDuration * 0.4;
            if (actionElapsed >= crossFadeStart) {
              const tFade = (actionElapsed - crossFadeStart) / (actionDuration - crossFadeStart);
              crossFadeAlpha = easeInOutCubic(tFade);
            }
          } else {
            // Phase 5: Reveal
            cursorX = targetClickX;
            cursorY = targetClickY;
            cursorType = 'arrow';
            focusFrameAlpha = 0;
            crossFadeAlpha = 1;
          }
        } else {
          // Dynamic Cinematic Auto-Zoom:
          // Overview -> Auto-Zoom Tracking -> Hover Lock -> Action Click -> Zoom-Out Reveal
          if (frameTimeMs < p1EndMs) {
            // Phase 1: Overview & Cursor Glide (1.0x)
            currentZoom = 1.0;
            camX = fullPageCamX;
            camY = fullPageCamY;

            const tGlide = easeOutQuart(frameTimeMs / p1EndMs);
            cursorX = lerp(startCursorX, targetClickX, tGlide);
            cursorY = lerp(startCursorY, targetClickY, tGlide);
            badgeAlpha = Math.min(1, frameTimeMs / 200);
            cursorType = 'arrow';
            focusFrameAlpha = 0;
            crossFadeAlpha = 0;
          } else if (frameTimeMs < p2EndMs) {
            // Phase 2: Smooth Auto-Zoom Tracking directly toward focused element
            const tZoom = easeInOutCubic((frameTimeMs - p1EndMs) / (p2EndMs - p1EndMs));
            currentZoom = lerp(1.0, targetZoom, tZoom);
            camX = lerp(fullPageCamX, focusCamX, tZoom);
            camY = lerp(fullPageCamY, focusCamY, tZoom);

            // Cursor settles on target point
            const tCursor = Math.min(1, (frameTimeMs - p1EndMs) / ((p2EndMs - p1EndMs) * 0.7));
            cursorX = lerp(startCursorX, targetClickX, easeOutQuart(tCursor));
            cursorY = lerp(startCursorY, targetClickY, easeOutQuart(tCursor));

            focusFrameAlpha = tZoom;
            cursorType = isClickable && tZoom > 0.6 ? 'hand' : 'arrow';
            badgeAlpha = 1;
            crossFadeAlpha = 0;
          } else if (frameTimeMs < p3EndMs) {
            // Phase 3: Hover & Auto-Focus Lock (cursor settles, element breathes, camera locked)
            currentZoom = targetZoom;
            camX = focusCamX;
            camY = focusCamY;

            // Subtle natural hover micro-movement
            const hoverPhase = (frameTimeMs - p2EndMs) / (p3EndMs - p2EndMs);
            const hoverFloat = Math.sin(hoverPhase * Math.PI) * 1.5;
            cursorX = targetClickX + hoverFloat * 0.5;
            cursorY = targetClickY + hoverFloat;

            cursorType = isClickable ? 'hand' : 'arrow';
            focusFrameAlpha = 1.0;
            pulsePhase = hoverPhase;
            badgeAlpha = 1;
            crossFadeAlpha = 0;
          } else if (frameTimeMs < p4EndMs) {
            // Phase 4: Action Click & Ripple at focused zoom
            currentZoom = targetZoom;
            camX = focusCamX;
            camY = focusCamY;
            cursorX = targetClickX;
            cursorY = targetClickY;
            cursorType = isClickable ? 'hand' : 'arrow';

            const actionElapsed = frameTimeMs - p3EndMs;
            const actionDuration = p4EndMs - p3EndMs;
            const rippleDuration = Math.min(550, actionDuration * 0.9);
            rippleProgress = Math.min(1, actionElapsed / rippleDuration);
            isClicking = actionElapsed < actionDuration * 0.35;
            focusFrameAlpha = Math.max(0, 1 - actionElapsed / actionDuration);

            if (step.actionType === 'hover') {
              rippleProgress = -1;
              isClicking = false;
            }

            badgeAlpha = 1;
            const crossFadeStart = actionDuration * 0.4;
            if (actionElapsed >= crossFadeStart) {
              const tFade = (actionElapsed - crossFadeStart) / (actionDuration - crossFadeStart);
              crossFadeAlpha = easeInOutCubic(tFade);
            } else {
              crossFadeAlpha = 0;
            }
          } else {
            // Phase 5: Smooth Zoom-Out back to 1.0x (Full Page Overview of resulting page)
            const tOut = easeInOutCubic((frameTimeMs - p4EndMs) / p5DurationMs);
            currentZoom = lerp(targetZoom, 1.0, tOut);
            camX = lerp(focusCamX, fullPageCamX, tOut);
            camY = lerp(focusCamY, fullPageCamY, tOut);
            cursorX = targetClickX;
            cursorY = targetClickY;
            cursorType = 'arrow';
            focusFrameAlpha = 0;
            badgeAlpha = 1;
            crossFadeAlpha = 1;
          }
        }

        // Render frame on canvas
        // Render Studio Backdrop (Cinematic Dark Radial Gradient)
        ctx.save();
        const bgGradient = ctx.createRadialGradient(
          width / 2,
          height / 2,
          width * 0.1,
          width / 2,
          height / 2,
          width * 0.75
        );
        bgGradient.addColorStop(0, '#0f172a'); // slate-900
        bgGradient.addColorStop(1, '#020617'); // slate-950
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        // Apply camera transformation centered on (camX, camY) with scale currentZoom
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.scale(currentZoom, currentZoom);
        ctx.translate(-camX, -camY);

        // Render floating browser window card with rounded corners and drop shadow
        const cardRadius = 14;
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = 32;
        ctx.shadowOffsetY = 10;

        // Draw rounded clip for the screenshot
        ctx.beginPath();
        ctx.roundRect(preDrawX, preDrawY, preDrawW, preDrawH, cardRadius);
        ctx.fillStyle = '#0f172a';
        ctx.fill();

        ctx.save();
        ctx.clip();

        // Smoothly transition from pre-action screenshot to post-action screenshot upon click
        if (preImg === postImg || crossFadeAlpha <= 0) {
          ctx.drawImage(preImg, preDrawX, preDrawY, preDrawW, preDrawH);
        } else if (crossFadeAlpha >= 1) {
          ctx.drawImage(postImg, postDrawX, postDrawY, postDrawW, postDrawH);
        } else {
          ctx.globalAlpha = 1 - crossFadeAlpha;
          ctx.drawImage(preImg, preDrawX, preDrawY, preDrawW, preDrawH);
          ctx.globalAlpha = crossFadeAlpha;
          ctx.drawImage(postImg, postDrawX, postDrawY, postDrawW, postDrawH);
          ctx.globalAlpha = 1;
        }
        ctx.restore(); // restore clip
        ctx.restore(); // restore shadow

        // Subtle card outline border
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(preDrawX, preDrawY, preDrawW, preDrawH, cardRadius);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.stroke();
        ctx.restore();

        // Draw Auto-Focus Spotlight around target element
        if (options.showAutoFocusFrame !== false && focusFrameAlpha > 0.01) {
          drawFocusSpotlight(ctx, targetClickX, targetClickY, width, height, focusFrameAlpha);
        }

        // Draw Auto-Focus Highlight Reticle Frame around target element
        if (options.showAutoFocusFrame !== false && focusFrameAlpha > 0.01) {
          drawAutoFocusFrame(
            ctx,
            elBounds.x,
            elBounds.y,
            elBounds.w,
            elBounds.h,
            focusFrameAlpha,
            pulsePhase,
            isClicking
          );
        }

        // Draw animated ripple at target coordinates
        if (options.showClickRipple !== false && rippleProgress >= 0) {
          drawClickRipple(ctx, targetClickX, targetClickY, rippleProgress);
        }

        // Draw macOS pointer or hand cursor
        if (options.showCursor !== false) {
          const cursorScale = (width / 1920) * (isClicking ? 0.88 : 1.0);
          if (cursorType === 'hand') {
            drawMacHandCursor(ctx, cursorX, cursorY, cursorScale);
          } else {
            drawMacCursor(ctx, cursorX, cursorY, cursorScale);
          }
        }

        ctx.restore();

        // Draw Floating Step Badge in screen space (independent of camera zoom)
        if (options.showStepBadge !== false) {
          drawStepBadge(ctx, width, height, index + 1, totalSteps, step.title, badgeAlpha);
        }

        // Draw Watermark / Pro Brand Logo in screen space
        drawWatermarkOrLogo(ctx, width, height, Boolean(isPro), customLogoImg);

        // Check for encoder errors before proceeding to prevent calling encode on closed codec
        if (encoderFatalError || (encoder.state as string) === 'closed') {
          throw (
            encoderFatalError ||
            new Error(`VideoEncoder closed unexpectedly at frame ${globalFrameIndex} (${width}x${height}).`)
          );
        }

        // Take immediate immutable ImageBitmap snapshot to prevent GPU buffer overwrites
        const bitmap = await createImageBitmap(canvas);
        let videoFrame: VideoFrame | null = null;
        try {
          // Encode VideoFrame with WebCodecs with explicit frame duration
          const frameDurationMicroseconds = Math.round(1_000_000 / effectiveFps);
          const timestampMicroseconds = Math.round((globalFrameIndex * 1_000_000) / effectiveFps);
          videoFrame = new VideoFrame(bitmap, {
            timestamp: timestampMicroseconds,
            duration: frameDurationMicroseconds,
          });

          const isKeyFrame = f === 0 || globalFrameIndex % effectiveFps === 0;
          encoder.encode(videoFrame, { keyFrame: isKeyFrame });
        } finally {
          if (videoFrame) {
            try {
              videoFrame.close();
            } catch {}
          }
          try {
            bitmap.close();
          } catch {}
        }

        globalFrameIndex++;

        // Progress update every 12 frames or on step end
        if (f % 12 === 0 || f === totalFramesPerStep - 1) {
          const percentComplete = Math.min(90, Math.round(5 + (globalFrameIndex / totalFrames) * 85));
          onProgress?.({
            percent: percentComplete,
            stage: `Rendering Step ${index + 1} of ${totalSteps} (${Math.round(((f + 1) / totalFramesPerStep) * 100)}%)...`,
            currentStep: index + 1,
            totalSteps,
          });
        }

        // Strict backpressure drain: prevent unbounded frame queue from exhausting GPU memory
        const maxQueue = is4k ? 2 : 4;
        while (encoder.encodeQueueSize > maxQueue) {
          if ((encoder.state as string) === 'closed' || encoderFatalError) break;
          await new Promise<void>((resolve) => {
            let resolved = false;
            const done = () => {
              if (!resolved) {
                resolved = true;
                encoder.ondequeue = null;
                resolve();
              }
            };
            encoder.ondequeue = () => {
              if (encoder.encodeQueueSize <= 1) {
                done();
              }
            };
            setTimeout(done, is4k ? 40 : 20);
          });
        }

        // Yield to event loop to allow GC and GPU driver flushing
        if (f % (is4k ? 2 : 6) === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      // Save target click as the cursor starting point for the next step
      prevCursorX = targetClickX;
      prevCursorY = targetClickY;
    }

    if (options.signal?.aborted) {
      throw new Error('Video export was canceled by user.');
    }

    // Finalize Encoding
    onProgress?.({ percent: 92, stage: 'Flushing video encoder...', currentStep: totalSteps, totalSteps });
    await encoder.flush();
    encoder.close();

    onProgress?.({ percent: 97, stage: 'Assembling MP4 container...', currentStep: totalSteps, totalSteps });
    muxer.finalize();

    const { buffer } = muxer.target;
    const mp4Blob = new Blob([buffer], { type: 'video/mp4' });

    onProgress?.({ percent: 100, stage: 'Export Complete!', currentStep: totalSteps, totalSteps });
    return mp4Blob;
  } finally {
    // Explicitly release 2D canvas GPU memory buffer
    canvas.width = 0;
    canvas.height = 0;
    if (encoder && encoder.state !== 'closed') {
      try {
        encoder.close();
      } catch {}
    }
  }
}

/**
 * Fallback renderer using MediaRecorder (WebM) for environments without WebCodecs
 */
async function renderWithMediaRecorder(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  allSteps: Step[],
  options: VideoExportOptions,
  onProgress?: (progress: RenderProgress) => void,
  isPro?: boolean,
  customLogoImg?: HTMLImageElement | null
): Promise<Blob> {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const fps = options.fps ?? 30;
  const stream = canvas.captureStream(fps);
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm',
    videoBitsPerSecond: options.resolution === '4k' ? 36_000_000 : 16_000_000,
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve) => {
    mediaRecorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };
  });

  mediaRecorder.start();

  try {
    const { width, height } = canvas;
    for (let i = 0; i < allSteps.length; i++) {
      if (options.signal?.aborted) {
        throw new Error('Video export was canceled by user.');
      }
      const step = allSteps[i];
      onProgress?.({
        percent: Math.round(5 + (i / allSteps.length) * 85),
        stage: `Rendering Step ${i + 1} of ${allSteps.length}...`,
        currentStep: i + 1,
        totalSteps: allSteps.length,
      });

      const { img } = await resolveStepImage(allSteps, i);
      const scaleToFit = Math.min(width / img.width, height / img.height);
      const imgDrawW = img.width * scaleToFit;
      const imgDrawH = img.height * scaleToFit;
      const imgDrawX = (width - imgDrawW) / 2;
      const imgDrawY = (height - imgDrawH) / 2;

      const bgGradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.1,
        width / 2,
        height / 2,
        width * 0.75
      );
      bgGradient.addColorStop(0, '#0f172a');
      bgGradient.addColorStop(1, '#020617');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 10;
      ctx.beginPath();
      ctx.roundRect(imgDrawX, imgDrawY, imgDrawW, imgDrawH, 14);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.drawImage(img, imgDrawX, imgDrawY, imgDrawW, imgDrawH);
      ctx.restore();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(imgDrawX, imgDrawY, imgDrawW, imgDrawH, 14);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.stroke();
      ctx.restore();
      drawStepBadge(ctx, width, height, i + 1, allSteps.length, step.title, 1);
      drawWatermarkOrLogo(ctx, width, height, Boolean(isPro), customLogoImg || null);
      await new Promise((r) => setTimeout(r, (options.stepDurationSeconds ?? 2) * 1000));
    }

    if (mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    return await recordingPromise;
  } finally {
    if (mediaRecorder.state === 'recording') {
      try {
        mediaRecorder.stop();
      } catch {}
    }
    canvas.width = 0;
    canvas.height = 0;
  }
}
