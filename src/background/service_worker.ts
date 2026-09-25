import { MessagePayload, Step, Demo, RecordingState } from '../shared/types';
import { APP_CONFIG } from '../shared/constants';
import { saveDemo, appendStep, getRecordingState, setRecordingState, getDemo, runStorageGarbageCollection } from './storage';
import { saveScreenshot, saveScreenshotDataUrl } from '../shared/idb';
import { verifyLicenseKeyRemotely } from '../shared/licenseService';
import { getChromeAccountId, isProUser } from '../shared/licenseValidator';

// Open side panel when user clicks the extension action icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Side panel initialization error:', error));

// Run garbage collection on extension installed/updated
chrome.runtime.onInstalled.addListener(() => {
  runStorageGarbageCollection().catch(console.warn);
});

// Mutex / sequential queue for chrome.tabs.captureVisibleTab to prevent race conditions and burst throttling
let captureQueue: Promise<any> = Promise.resolve();

function enqueueCapture<T>(task: () => Promise<T>): Promise<T> {
  const result = captureQueue.then(task, task);
  captureQueue = result.catch(() => {});
  return result;
}

/**
 * Safely captures the visible tab as a JPEG data URL.
 * Wraps chrome.tabs.captureVisibleTab in a strict try/catch block and checks chrome.runtime.lastError.
 * Ensures the image Data URL is fully generated before returning.
 */
async function captureTabScreenshot(windowId?: number): Promise<string> {
  return new Promise((resolve) => {
    try {
      const options = {
        format: 'jpeg' as const,
        quality: Math.round(APP_CONFIG.RECORDING.JPEG_QUALITY * 100),
      };

      const handleResult = (dataUrl?: string) => {
        if (chrome.runtime.lastError) {
          console.warn('[FlowTour SW] captureVisibleTab runtime error:', chrome.runtime.lastError.message);
          resolve('');
          return;
        }
        if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
          console.warn('[FlowTour SW] captureVisibleTab returned invalid or incomplete data URL');
          resolve('');
          return;
        }
        resolve(dataUrl);
      };

      if (typeof windowId === 'number') {
        chrome.tabs.captureVisibleTab(windowId, options, (dataUrl) => {
          if (chrome.runtime.lastError) {
            console.warn(
              '[FlowTour SW] captureVisibleTab with windowId failed:',
              chrome.runtime.lastError.message,
              '- attempting fallback to default window'
            );
            try {
              chrome.tabs.captureVisibleTab(options, handleResult);
            } catch (fallbackErr) {
              console.warn('[FlowTour SW] Fallback captureVisibleTab threw:', fallbackErr);
              resolve('');
            }
          } else {
            handleResult(dataUrl);
          }
        });
      } else {
        chrome.tabs.captureVisibleTab(options, handleResult);
      }
    } catch (err: any) {
      console.warn('[FlowTour SW] captureVisibleTab threw synchronous exception:', err);
      resolve('');
    }
  });
}

/**
 * Helper to test if a URL is restricted by Chrome security policy
 */
function isRestrictedUrl(url?: string): boolean {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('devtools://') ||
    url.startsWith('view-source:') ||
    url.includes('chromewebstore') ||
    url.includes('chrome.google.com/webstore')
  );
}

/**
 * Ensures content script is injected and ready on target tab
 */
async function ensureContentScriptInjected(tabId: number): Promise<boolean> {
  // 1. First test if content script is already listening
  try {
    const ping = await chrome.tabs.sendMessage(tabId, { type: 'GET_RECORDING_STATE' }).catch(() => null);
    if (ping && typeof ping === 'object') return true;
  } catch {
    // Expected if not injected yet
  }

  // 2. Inject content script dynamically via scripting API
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content_scripts/recorder.js'],
    });
  } catch (err: any) {
    console.error('[FlowTour SW] Failed to executeScript on tab:', tabId, err);
    throw new Error(
      `Cannot record on this page (${err.message || 'Restricted host'}). Please ensure you are on a normal website (e.g. github.com, wikipedia.org) and try refreshing the page.`
    );
  }

  // 3. Wait up to 600ms for content script to initialize its message listener
  for (let attempt = 0; attempt < 8; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 80));
    try {
      const ping = await chrome.tabs.sendMessage(tabId, { type: 'GET_RECORDING_STATE' }).catch(() => null);
      if (ping && typeof ping === 'object') return true;
    } catch {
      // Continue waiting for listener registration
    }
  }

  return true;
}

// Re-arm recording on SPA route changes or full page navigations (Audit Point 5)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const state = await getRecordingState();
  if (!state.isRecording || state.activeTabId !== tabId) return;

  // 1. Full page navigation or reload finished
  if (changeInfo.status === 'complete') {
    console.log(`[FlowTour SW] Tab ${tabId} reloaded or navigated. Re-arming recording HUD and listeners.`);
    try {
      await ensureContentScriptInjected(tabId);
      await chrome.tabs.sendMessage(tabId, {
        type: 'TOGGLE_RECORDER',
        payload: { active: true, demoId: state.activeDemoId || undefined, initialStepCount: state.stepCount }
      }).catch(() => {});
    } catch (err) {
      console.warn('[FlowTour SW] Failed to re-arm recorder on tab navigation:', err);
    }
  }

  // 2. Client-side URL change in SPA
  if (changeInfo.url) {
    console.log(`[FlowTour SW] SPA URL updated: ${changeInfo.url}`);
  }
});

// Graceful cleanup if the recorded tab is closed during an active session
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const state = await getRecordingState();
  if (state.isRecording && state.activeTabId === tabId) {
    console.log(`[FlowTour SW] Recorded tab ${tabId} closed. Concluding active recording.`);
    await setRecordingState({
      isRecording: false,
      activeDemoId: null,
      activeTabId: null,
      stepCount: 0,
      startedAt: null,
      lastScreenshotId: null,
    });
  }
});

// Global runtime message listener
chrome.runtime.onMessage.addListener((message: MessagePayload, sender, sendResponse) => {
  handleIncomingMessage(message, sender)
    .then(sendResponse)
    .catch((err) => {
      console.error('Service worker error handling message:', message, err);
      sendResponse({ error: err.message });
    });
  return true; // Keep message channel open for async response
});

// Allowed origins for 1-Click License Sync & external messaging
const ALLOWED_EXTERNAL_ORIGINS = [
  'https://flowtour.dev',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function isAllowedExternalOrigin(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (ALLOWED_EXTERNAL_ORIGINS.includes(parsed.origin)) return true;
    if (parsed.hostname.endsWith('.flowtour.dev')) return true;
    if (parsed.hostname.endsWith('.vercel.app')) return true;
  } catch {
    return false;
  }
  return false;
}

/**
 * Handle external messages from FlowTour web origins (e.g., checkout success page)
 * Implements 1-Click Chrome Account Sync & Pro Licensing Architecture
 */
chrome.runtime.onMessageExternal.addListener((message: any, sender, sendResponse) => {
  handleExternalMessage(message, sender)
    .then(sendResponse)
    .catch((err) => {
      console.error('[FlowTour SW] Error handling external message:', err);
      sendResponse({ success: false, error: err?.message || 'External message error' });
    });
  return true; // Keep message channel open for async response
});

async function handleExternalMessage(
  message: any,
  sender: chrome.runtime.MessageSender
): Promise<any> {
  // Validate caller origin
  if (!isAllowedExternalOrigin(sender.url)) {
    console.warn('[FlowTour SW] Rejected external message from unauthorized origin:', sender.url);
    return { success: false, error: 'Unauthorized origin' };
  }

  const type = message?.type;

  switch (type) {
    case 'PING': {
      return { success: true, version: chrome.runtime.getManifest().version, name: 'FlowTour' };
    }

    case 'CHECK_LICENSE_STATUS': {
      // Check sync storage first, fallback to local storage
      let syncData: any = {};
      let localData: any = {};
      try {
        syncData = await chrome.storage.sync.get(['isProLicense', 'isPro', 'licenseKey']);
      } catch (e) {
        console.warn('[FlowTour SW] Failed to read storage.sync:', e);
      }
      try {
        localData = await chrome.storage.local.get(['isProLicense', 'isPro', 'licenseKey']);
      } catch (e) {
        console.warn('[FlowTour SW] Failed to read storage.local:', e);
      }

      const isPro = Boolean(syncData?.isProLicense || syncData?.isPro || localData?.isProLicense || localData?.isPro);
      const licenseKey = syncData?.licenseKey || localData?.licenseKey || '';
      return { success: true, isPro, licenseKey };
    }

    case 'ACTIVATE_PRO_LICENSE': {
      const licenseKey = (message.payload?.licenseKey || message.licenseKey || '').trim();
      if (!licenseKey) {
        return { success: false, error: 'License key is missing or empty' };
      }

      // 1. Obtain current Chrome Account ID / Device ID
      const accountId = await getChromeAccountId();

      // 2. Verify license authenticity & obtain signed token
      const verification = await verifyLicenseKeyRemotely(licenseKey, accountId);
      if (!verification.valid) {
        console.warn(
          '[FlowTour SW] Rejected external license activation. Invalid key or bound to another account:',
          licenseKey
        );
        return {
          success: false,
          error: verification.message || 'Invalid or unverified FlowTour license key.',
          code: verification.error,
        };
      }

      const proPayload = {
        proToken: verification.proToken || '',
        licenseKey: licenseKey,
        boundAccountId: accountId,
        proActivatedAt: Date.now(),
        isProLicense: true,
        isPro: true,
      };

      // Dual write to chrome.storage.sync (for Chrome account cloud replication)
      // and chrome.storage.local (for instant local persistence)
      await Promise.all([
        chrome.storage.sync.set(proPayload).catch((err) => {
          console.warn('[FlowTour SW] Warning: chrome.storage.sync.set failed:', err);
        }),
        chrome.storage.local.set(proPayload).catch((err) => {
          console.warn('[FlowTour SW] Warning: chrome.storage.local.set failed:', err);
        }),
      ]);

      console.log('[FlowTour SW] Pro License activated and synced across Chrome account & local storage.');
      return {
        success: true,
        message: 'Pro License Activated',
        isPro: true,
        licenseKey,
      };
    }

    default:
      return { success: false, error: `Unsupported external message type: ${type}` };
  }
}

/**
 * Startup License Health Audit
 * Automatically revokes Pro status if token is missing or tampered
 */
async function auditStoredLicenseKey() {
  try {
    const isPro = await isProUser();
    if (!isPro) {
      // Check if legacy or tampered isProLicense flag exists without a valid proToken
      const localData: Record<string, any> = await chrome.storage.local
        .get(['isProLicense', 'proToken'])
        .catch(() => ({}));
      if (localData?.isProLicense && !localData?.proToken) {
        console.warn('[FlowTour SW] Tampered or missing token detected in storage. Revoking Pro access.');
        const revokePayload = {
          isProLicense: false,
          isPro: false,
          proToken: '',
          boundAccountId: '',
        };
        await Promise.all([
          chrome.storage.sync.set(revokePayload).catch(() => {}),
          chrome.storage.local.set(revokePayload).catch(() => {}),
        ]);
      }
    }
  } catch (err) {
    console.warn('[FlowTour SW] Error during license health audit:', err);
  }
}

chrome.runtime.onStartup.addListener(() => {
  auditStoredLicenseKey();
});

async function handleIncomingMessage(message: MessagePayload, sender: chrome.runtime.MessageSender): Promise<any> {
  switch (message.type) {
    case 'START_RECORDING': {
      const { demoId, demoTitle } = message.payload;
      
      // Determine target tab: check current window first, then lastFocusedWindow, then all tabs
      let activeTab: chrome.tabs.Tab | undefined;
      const [currentWinTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (currentWinTab && currentWinTab.id && !isRestrictedUrl(currentWinTab.url)) {
        activeTab = currentWinTab;
      }

      if (!activeTab) {
        const [lastFocusedTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (lastFocusedTab && lastFocusedTab.id && !isRestrictedUrl(lastFocusedTab.url)) {
          activeTab = lastFocusedTab;
        }
      }

      if (!activeTab) {
        const allActiveTabs = await chrome.tabs.query({ active: true });
        activeTab = allActiveTabs.find(t => t.id && !isRestrictedUrl(t.url));
      }

      if (!activeTab) {
        const allTabs = await chrome.tabs.query({});
        activeTab = allTabs.find(t => t.id && !isRestrictedUrl(t.url));
      }

      if (!activeTab || !activeTab.id || isRestrictedUrl(activeTab.url)) {
        throw new Error(
          'Cannot record on internal browser pages (chrome://extensions). Please switch to or open a standard website (e.g. github.com, wikipedia.org) and try again.'
        );
      }

      // Capture initial baseline screenshot of the active page immediately
      let initialScreenshotKey = '';
      try {
        const initialDataUrl = await captureTabScreenshot(activeTab.windowId);
        if (initialDataUrl && initialDataUrl.startsWith('data:image/')) {
          const key = `screenshot_${demoId}_initial`;
          initialScreenshotKey = await saveScreenshot(key, initialDataUrl);
          console.log(`[FlowTour SW] Baseline screenshot captured on start: ${initialScreenshotKey}`);
        }
      } catch (capErr) {
        console.warn('[FlowTour SW] Initial tab capture warning:', capErr);
      }

      // Check if demo already exists or initialize new
      let demo = await getDemo(demoId);
      if (!demo) {
        demo = {
          demoId,
          demoTitle: demoTitle || `Walkthrough - ${new Date().toLocaleDateString()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          steps: [],
          targetUrl: activeTab.url || '',
          initialScreenshotId: initialScreenshotKey || undefined,
        };
        await saveDemo(demo);
      } else if (initialScreenshotKey && !demo.initialScreenshotId) {
        demo.initialScreenshotId = initialScreenshotKey;
        await saveDemo(demo);
      }

      // Inject / verify content script is alive and listening
      await ensureContentScriptInjected(activeTab.id);

      // Tell content script to activate recording engine and show HUD with retry
      let acknowledged = false;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const resp = await chrome.tabs.sendMessage(activeTab.id, {
            type: 'TOGGLE_RECORDER',
            payload: { active: true, demoId, initialStepCount: demo.steps.length }
          });
          if (resp?.status === 'started') {
            acknowledged = true;
            break;
          }
        } catch {
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      if (!acknowledged) {
        // Attempt clean script injection fallback
        try {
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['content_scripts/recorder.js'],
          });
          await new Promise((r) => setTimeout(r, 150));
          const retryResp = await chrome.tabs.sendMessage(activeTab.id, {
            type: 'TOGGLE_RECORDER',
            payload: { active: true, demoId, initialStepCount: demo.steps.length }
          }).catch(() => null);
          if (retryResp?.status === 'started') {
            acknowledged = true;
          }
        } catch {}
      }

      if (!acknowledged) {
        throw new Error(
          'Could not connect to the webpage. Please refresh the page (F5) so the updated extension can attach, then try starting recording again.'
        );
      }

      const newState: RecordingState = {
        isRecording: true,
        activeDemoId: demoId,
        activeTabId: activeTab.id,
        stepCount: demo.steps.length,
        startedAt: Date.now(),
        lastScreenshotId: initialScreenshotKey || null,
      };
      await setRecordingState(newState);

      return { success: true, state: newState };
    }

    case 'STOP_RECORDING': {
      const state = await getRecordingState();
      if (state.activeTabId) {
        try {
          await chrome.tabs.sendMessage(state.activeTabId, {
            type: 'TOGGLE_RECORDER',
            payload: { active: false }
          });
        } catch {
          // Tab may have closed
        }
      }

      const stoppedState: RecordingState = {
        isRecording: false,
        activeDemoId: null,
        activeTabId: null,
        stepCount: 0,
        startedAt: null,
        lastScreenshotId: null,
      };
      await setRecordingState(stoppedState);

      return { success: true, state: stoppedState };
    }

    case 'CLICK_CAPTURED': {
      return enqueueCapture(async () => {
        const state = await getRecordingState();
        if (!state.isRecording || !state.activeDemoId) {
          return { ignored: true, reason: 'Not currently recording' };
        }

        const event = message.payload;
        const stepId = `step_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const postScreenshotId = `screenshot_${stepId}_post`;

        // Retrieve pre-click screenshot key (what was on the screen when the user clicked)
        let preScreenshotKey = state.lastScreenshotId || '';
        if (!preScreenshotKey) {
          const currentDemo = await getDemo(state.activeDemoId);
          preScreenshotKey = currentDemo?.initialScreenshotId || '';
        }

        // Determine target tab, window ID and URL from sender or active recording state
        const targetTabId = sender.tab?.id ?? state.activeTabId;
        let windowId: number | undefined = sender.tab?.windowId;
        let tabUrl: string = sender.tab?.url || '';

        // 1. Temporarily hide HUD and clear active ripples on the recording tab
        if (targetTabId) {
          try {
            await chrome.tabs.sendMessage(targetTabId, { type: 'PRE_CAPTURE' });
          } catch {}
        }

        // 2. Settle delay (320ms) to allow SPA DOM transitions/animations to finish rendering
        if (APP_CONFIG.RECORDING.CAPTURE_DELAY_MS > 0) {
          await new Promise((resolve) => setTimeout(resolve, APP_CONFIG.RECORDING.CAPTURE_DELAY_MS));
        }

        if (!tabUrl && targetTabId) {
          try {
            const tab = await chrome.tabs.get(targetTabId);
            tabUrl = tab.url || '';
            if (windowId === undefined) windowId = tab.windowId;
          } catch {
            // Tab may have moved or closed
          }
        }

        if (windowId === undefined) {
          const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
          windowId = activeTab?.windowId;
          if (!tabUrl) tabUrl = activeTab?.url || '';
        }

        // Check if the tab URL is a restricted internal page
        const isRestricted = isRestrictedUrl(tabUrl);

        if (isRestricted) {
          const warningMessage =
            'Screenshots are disabled on Chrome internal pages. Please test on a standard website (e.g. http/https).';
          console.warn('[FlowTour SW] Restricted page URL:', tabUrl, '-', warningMessage);

          if (targetTabId) {
            chrome.tabs
              .sendMessage(targetTabId, {
                type: 'SHOW_TOAST',
                payload: { message: warningMessage },
              })
              .catch(() => {});
          }
        }

        // Capture visible tab screenshot of the RESULTING state after the click
        let postDataUrl = '';
        if (!isRestricted) {
          postDataUrl = await captureTabScreenshot(windowId);
        }

        // 3. Immediately restore HUD on the recording tab
        if (targetTabId) {
          chrome.tabs.sendMessage(targetTabId, { type: 'POST_CAPTURE' }).catch(() => {});
        }

        // Strictly await IndexedDB save of the post-click screenshot
        let savedPostScreenshotKey = '';
        if (postDataUrl && postDataUrl.startsWith('data:image/')) {
          try {
            savedPostScreenshotKey = await saveScreenshot(postScreenshotId, postDataUrl);
            console.log(
              `[FlowTour Debug] Post-click screenshot saved to IDB for step: ${stepId} (key: ${savedPostScreenshotKey}, size: ${Math.round(postDataUrl.length / 1024)} KB)`
            );
          } catch (idbErr) {
            console.error('[FlowTour SW] Could not store post-click screenshot in IDB:', idbErr);
            savedPostScreenshotKey = '';
          }
        } else {
          console.warn(
            `[FlowTour SW] No valid post-click screenshot captured for step: ${stepId} (isRestricted: ${isRestricted}, windowId: ${windowId})`
          );
        }

        // Guarantee each step has a valid screenshotId and nextScreenshotId
        const effectiveScreenshotId = preScreenshotKey || savedPostScreenshotKey || '';
        const effectiveNextScreenshotId = savedPostScreenshotKey || effectiveScreenshotId;

        // Format readable title and annotation
        const actionSubject = event.elementText || event.tagName;
        const actionVerb = event.actionType === 'hover' ? 'Hover over' : 'Click';
        const stepTitle = `${actionVerb} "${actionSubject}"`;
        const stepAnnotation =
          event.actionType === 'hover'
            ? `Hover over the ${event.tagName.toUpperCase()} element.`
            : `Click the ${event.tagName.toUpperCase()} element to proceed.`;

        const newStep: Step = {
          id: stepId,
          index: state.stepCount + 1,
          actionType: event.actionType || 'click',
          selector: event.selectorResult.primary,
          selectorStrategy: event.selectorResult.strategy,
          elementText: event.elementText,
          elementTagName: event.tagName,
          coordinates: event.coordinates,
          viewport: event.viewport,
          screenshotId: effectiveScreenshotId,
          nextScreenshotId: effectiveNextScreenshotId,
          title: stepTitle,
          annotation: stepAnnotation,
          timestamp: event.timestamp,
        };

        // Storage commit strictly happens after IndexedDB save has finished
        await appendStep(state.activeDemoId, newStep);

        // Update state counter and advance lastScreenshotId for subsequent steps
        state.stepCount = state.stepCount + 1;
        state.lastScreenshotId = effectiveNextScreenshotId || effectiveScreenshotId;
        await setRecordingState(state);

        // Broadcast step added to Side Panel if open
        chrome.runtime
          .sendMessage({
            type: 'STEP_ADDED',
            payload: { demoId: state.activeDemoId, step: newStep },
          } as MessagePayload)
          .catch(() => {
            // Side panel may be closed or not listening, safe to ignore
          });

        return { success: true, stepId, screenshotId: effectiveScreenshotId };
      });
    }

    case 'GET_RECORDING_STATE': {
      const state = await getRecordingState();
      return state;
    }

    default:
      return null;
  }
}
