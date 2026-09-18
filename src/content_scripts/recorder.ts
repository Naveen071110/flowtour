import { DOMRecorderEngine } from '../recorder-core/DOMRecorderEngine';
import { CapturedClickEvent, MessagePayload } from '../shared/types';
import { APP_CONFIG } from '../shared/constants';

let engine: DOMRecorderEngine | null = null;
let hudHost: HTMLElement | null = null;
let hudShadow: ShadowRoot | null = null;
let stepCounter = 0;

/**
 * Creates a non-intrusive floating indicator badge using Shadow DOM
 */
function createRecordingHUD(): void {
  if (document.getElementById('flowtour-hud-host')) return;

  hudHost = document.createElement('div');
  hudHost.id = 'flowtour-hud-host';
  hudHost.setAttribute('data-flowtour-ignore', 'true');
  hudHost.style.position = 'fixed';
  hudHost.style.bottom = '24px';
  hudHost.style.right = '24px';
  hudHost.style.zIndex = '2147483647'; // Max z-index
  hudHost.style.pointerEvents = 'none'; // Don't block underlying page

  hudShadow = hudHost.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .badge-container {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 9999px;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 15px rgba(239, 68, 68, 0.2);
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
    }
    .hud-toast {
      pointer-events: auto;
      margin-top: 8px;
      padding: 8px 14px;
      background: rgba(220, 38, 38, 0.95);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(254, 202, 202, 0.4);
      border-radius: 12px;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      max-width: 320px;
      line-height: 1.4;
      display: none;
    }
    .pulse-dot {
      width: 10px;
      height: 10px;
      background: #ef4444;
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
      animation: pulse 1.5s infinite;
    }
    .step-pill {
      background: rgba(255, 255, 255, 0.12);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      color: #cbd5e1;
    }
    @keyframes pulse {
      0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
      }
      70% {
        transform: scale(1);
        box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
      }
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
      }
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;

  const container = document.createElement('div');
  container.className = 'badge-container';
  container.innerHTML = `
    <div class="pulse-dot"></div>
    <span>${APP_CONFIG.name} Recording</span>
    <span class="step-pill" id="step-count-display">0 steps</span>
  `;

  const toastEl = document.createElement('div');
  toastEl.id = 'flowtour-hud-toast';
  toastEl.className = 'hud-toast';

  hudShadow.appendChild(style);
  hudShadow.appendChild(container);
  hudShadow.appendChild(toastEl);
  document.documentElement.appendChild(hudHost);
}

let toastTimer: any = null;

function showHUDToast(message: string, durationMs: number = 5000): void {
  if (!hudShadow) {
    createRecordingHUD();
  }
  if (!hudShadow) return;

  const toast = hudShadow.getElementById('flowtour-hud-toast');
  if (toast) {
    toast.textContent = message;
    toast.style.display = 'block';

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (toast) toast.style.display = 'none';
    }, durationMs);
  }
}

function updateHUDStepCount(count: number): void {
  stepCounter = count;
  if (!hudShadow) return;
  const countEl = hudShadow.getElementById('step-count-display');
  if (countEl) {
    countEl.textContent = `${count} ${count === 1 ? 'step' : 'steps'}`;
  }
}

function removeRecordingHUD(): void {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  if (hudHost) {
    hudHost.remove();
    hudHost = null;
    hudShadow = null;
  }
}

/**
 * Creates an animated visual ripple circle at click location for user feedback
 */
function showClickRipple(x: number, y: number): void {
  const ripple = document.createElement('div');
  ripple.setAttribute('data-flowtour-ignore', 'true');
  ripple.style.position = 'fixed';
  ripple.style.left = `${x - 20}px`;
  ripple.style.top = `${y - 20}px`;
  ripple.style.width = '40px';
  ripple.style.height = '40px';
  ripple.style.borderRadius = '50%';
  ripple.style.backgroundColor = 'rgba(99, 102, 241, 0.4)';
  ripple.style.border = '2px solid #6366f1';
  ripple.style.pointerEvents = 'none';
  ripple.style.zIndex = '2147483646';
  ripple.style.transform = 'scale(0.5)';
  ripple.style.opacity = '1';
  ripple.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';

  document.documentElement.appendChild(ripple);

  requestAnimationFrame(() => {
    ripple.style.transform = 'scale(1.6)';
    ripple.style.opacity = '0';
  });

  setTimeout(() => {
    ripple.remove();
  }, 450);
}

/**
 * Initialized recorder engine instance
 */
function getOrCreateEngine(): DOMRecorderEngine {
  if (!engine) {
    engine = new DOMRecorderEngine({ debounceMs: 250 }, (event: CapturedClickEvent) => {
      // Guard against invalidated extension context
      if (!chrome.runtime?.id) {
        console.warn('[FlowTour Content] Extension context invalidated. Please refresh the page.');
        removeRecordingHUD();
        if (engine) engine.destroy();
        engine = null;
        return;
      }

      if (event.actionType !== 'hover') {
        showClickRipple(event.coordinates.x, event.coordinates.y);
      }
      stepCounter++;
      updateHUDStepCount(stepCounter);

      // Send to background service worker for screenshot capture and persistence
      try {
        chrome.runtime.sendMessage({
          type: 'CLICK_CAPTURED',
          payload: event
        } as MessagePayload).catch((sendErr) => {
          console.warn('[FlowTour Content] Could not send CLICK_CAPTURED:', sendErr);
        });
      } catch (err) {
        console.warn('[FlowTour Content] sendMessage caught exception:', err);
      }
    });
  }
  return engine;
}

// Listen for control commands from background service worker
chrome.runtime.onMessage.addListener((message: MessagePayload, _sender, sendResponse) => {
  try {
    if (!chrome.runtime?.id) {
      sendResponse({ status: 'invalidated' });
      return false;
    }

    if (message.type === 'TOGGLE_RECORDER') {
      const { active } = message.payload;
      const initialStepCount = (message.payload as any)?.initialStepCount;
      const recorder = getOrCreateEngine();

      if (active) {
        if (typeof initialStepCount === 'number') {
          updateHUDStepCount(initialStepCount);
        }
        recorder.start();
        createRecordingHUD();
        sendResponse({ status: 'started' });
      } else {
        recorder.stop();
        removeRecordingHUD();
        stepCounter = 0;
        sendResponse({ status: 'stopped' });
      }
      return false; // synchronous response
    }

    if (message.type === 'GET_RECORDING_STATE') {
      sendResponse({
        isRecording: engine ? engine.isRecording() : false,
        stepCount: stepCounter
      });
      return false; // synchronous response
    }

    if (message.type === 'SHOW_TOAST') {
      const text = message.payload?.message || (typeof message.payload === 'string' ? message.payload : '');
      if (text) {
        showHUDToast(text);
      }
      sendResponse({ status: 'shown' });
      return false; // synchronous response
    }
  } catch (err) {
    console.warn('[FlowTour Content] onMessage error:', err);
    sendResponse({ error: String(err) });
  }
  return false;
});
