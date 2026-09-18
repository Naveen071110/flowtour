import { Demo, Step, RecordingState } from '../shared/types';
import { APP_CONFIG } from '../shared/constants';
import { deleteScreenshots, cleanupOrphanedScreenshots } from '../shared/idb';

/**
 * Retrieves all saved demos metadata from chrome.storage.local
 */
export async function getDemos(): Promise<Demo[]> {
  const data = await chrome.storage.local.get(APP_CONFIG.STORAGE_KEYS.DEMOS);
  return (data[APP_CONFIG.STORAGE_KEYS.DEMOS] as Demo[]) || [];
}

/**
 * Retrieves a single demo by ID
 */
export async function getDemo(demoId: string): Promise<Demo | null> {
  const demos = await getDemos();
  return demos.find(d => d.demoId === demoId) || null;
}

/**
 * Creates or updates a demo
 */
export async function saveDemo(demo: Demo): Promise<void> {
  const demos = await getDemos();
  const existingIndex = demos.findIndex(d => d.demoId === demo.demoId);

  if (existingIndex >= 0) {
    demos[existingIndex] = { ...demo, updatedAt: new Date().toISOString() };
  } else {
    demos.unshift(demo);
  }

  await chrome.storage.local.set({ [APP_CONFIG.STORAGE_KEYS.DEMOS]: demos });
}

/**
 * Updates an existing demo with a patch
 */
export async function updateDemo(demoId: string, patch: Partial<Demo>): Promise<void> {
  const demos = await getDemos();
  const index = demos.findIndex(d => d.demoId === demoId);
  if (index === -1) return;

  demos[index] = {
    ...demos[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await chrome.storage.local.set({ [APP_CONFIG.STORAGE_KEYS.DEMOS]: demos });
}

/**
 * Deletes a demo and all its screenshot blobs from IndexedDB
 */
export async function deleteDemo(demoId: string): Promise<void> {
  const demos = await getDemos();
  const targetDemo = demos.find(d => d.demoId === demoId);

  if (targetDemo) {
    // Delete all associated screenshot blobs from IndexedDB (including initial and post screenshots)
    const screenshotIds: string[] = [];
    if (targetDemo.initialScreenshotId) {
      screenshotIds.push(targetDemo.initialScreenshotId);
    }
    for (const step of targetDemo.steps) {
      if (step.screenshotId) screenshotIds.push(step.screenshotId);
      if (step.nextScreenshotId) screenshotIds.push(step.nextScreenshotId);
    }

    // Ensure we don't delete screenshot keys that might be referenced in other demos
    const otherDemosActiveIds = new Set<string>();
    for (const d of demos) {
      if (d.demoId !== demoId) {
        if (d.initialScreenshotId) otherDemosActiveIds.add(d.initialScreenshotId);
        for (const s of d.steps) {
          if (s.screenshotId) otherDemosActiveIds.add(s.screenshotId);
          if (s.nextScreenshotId) otherDemosActiveIds.add(s.nextScreenshotId);
        }
      }
    }

    const safeToDelete = screenshotIds.filter(id => !otherDemosActiveIds.has(id));
    if (safeToDelete.length > 0) {
      await deleteScreenshots(safeToDelete).catch(err => console.warn('Could not delete screenshots from IDB:', err));
    }
  }

  const updatedDemos = demos.filter(d => d.demoId !== demoId);
  await chrome.storage.local.set({ [APP_CONFIG.STORAGE_KEYS.DEMOS]: updatedDemos });

  // Run garbage collection in background to guarantee zero orphaned Blobs
  runStorageGarbageCollection().catch(console.warn);
}

/**
 * Appends a step to an existing demo
 */
export async function appendStep(demoId: string, step: Step): Promise<Demo | null> {
  const demos = await getDemos();
  const demo = demos.find(d => d.demoId === demoId);
  if (!demo) return null;

  step.index = demo.steps.length + 1;
  demo.steps.push(step);
  demo.updatedAt = new Date().toISOString();

  await chrome.storage.local.set({ [APP_CONFIG.STORAGE_KEYS.DEMOS]: demos });
  return demo;
}

/**
 * Updates a specific step within a demo
 */
export async function updateStep(demoId: string, stepId: string, patch: Partial<Step>): Promise<void> {
  const demos = await getDemos();
  const demo = demos.find(d => d.demoId === demoId);
  if (!demo) return;

  const stepIndex = demo.steps.findIndex(s => s.id === stepId);
  if (stepIndex === -1) return;

  demo.steps[stepIndex] = { ...demo.steps[stepIndex], ...patch };
  demo.updatedAt = new Date().toISOString();

  await chrome.storage.local.set({ [APP_CONFIG.STORAGE_KEYS.DEMOS]: demos });
}

/**
 * Reorders steps within a demo
 */
export async function reorderSteps(demoId: string, orderedStepIds: string[]): Promise<void> {
  const demos = await getDemos();
  const demo = demos.find(d => d.demoId === demoId);
  if (!demo) return;

  const stepMap = new Map(demo.steps.map(s => [s.id, s]));
  const reordered: Step[] = [];

  orderedStepIds.forEach((id, idx) => {
    const step = stepMap.get(id);
    if (step) {
      step.index = idx + 1;
      reordered.push(step);
    }
  });

  demo.steps = reordered;
  demo.updatedAt = new Date().toISOString();

  await chrome.storage.local.set({ [APP_CONFIG.STORAGE_KEYS.DEMOS]: demos });
}

/**
 * Deletes a single step from a demo
 */
export async function deleteStep(demoId: string, stepId: string): Promise<void> {
  const demos = await getDemos();
  const demo = demos.find(d => d.demoId === demoId);
  if (!demo) return;

  const stepToDelete = demo.steps.find(s => s.id === stepId);
  const toDelete: string[] = [];
  if (stepToDelete?.screenshotId) toDelete.push(stepToDelete.screenshotId);
  if (stepToDelete?.nextScreenshotId) toDelete.push(stepToDelete.nextScreenshotId);

  // Collect all other active screenshot IDs across all demos
  const remainingActiveIds = new Set<string>();
  for (const d of demos) {
    if (d.initialScreenshotId) remainingActiveIds.add(d.initialScreenshotId);
    for (const s of d.steps) {
      if (d.demoId === demoId && s.id === stepId) continue;
      if (s.screenshotId) remainingActiveIds.add(s.screenshotId);
      if (s.nextScreenshotId) remainingActiveIds.add(s.nextScreenshotId);
    }
  }

  const safeToDelete = toDelete.filter(id => !remainingActiveIds.has(id));
  if (safeToDelete.length > 0) {
    await deleteScreenshots(safeToDelete).catch(console.warn);
  }

  demo.steps = demo.steps
    .filter(s => s.id !== stepId)
    .map((s, idx) => ({ ...s, index: idx + 1 }));

  demo.updatedAt = new Date().toISOString();
  await chrome.storage.local.set({ [APP_CONFIG.STORAGE_KEYS.DEMOS]: demos });

  // Run garbage collection in background to guarantee zero orphaned Blobs
  runStorageGarbageCollection().catch(console.warn);
}

/**
 * Runs a full garbage collection check across IndexedDB:
 * Identifies any screenshot Blobs that do not belong to any active step in any demo,
 * and permanently purges them to prevent storage bloat.
 */
export async function runStorageGarbageCollection(): Promise<number> {
  try {
    const demos = await getDemos();
    const activeIds: string[] = [];
    for (const demo of demos) {
      if (demo.initialScreenshotId) {
        activeIds.push(demo.initialScreenshotId);
      }
      for (const step of demo.steps) {
        if (step.screenshotId) {
          activeIds.push(step.screenshotId);
        }
        if (step.nextScreenshotId) {
          activeIds.push(step.nextScreenshotId);
        }
      }
    }
    return await cleanupOrphanedScreenshots(activeIds);
  } catch (err) {
    console.warn('[FlowTour IDB GC] Failed to execute garbage collection:', err);
    return 0;
  }
}

/**
 * Active recording state management in chrome.storage.local
 */
export async function getRecordingState(): Promise<RecordingState> {
  const data = await chrome.storage.local.get(APP_CONFIG.STORAGE_KEYS.ACTIVE_RECORDING);
  return (data[APP_CONFIG.STORAGE_KEYS.ACTIVE_RECORDING] as RecordingState) || {
    isRecording: false,
    activeDemoId: null,
    activeTabId: null,
    stepCount: 0,
    startedAt: null,
  };
}

export async function setRecordingState(state: RecordingState): Promise<void> {
  await chrome.storage.local.set({ [APP_CONFIG.STORAGE_KEYS.ACTIVE_RECORDING]: state });
}
