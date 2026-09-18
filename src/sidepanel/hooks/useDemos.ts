import { useState, useEffect, useCallback } from 'react';
import { Demo } from '../../shared/types';
import { getDemos, saveDemo, deleteDemo, updateDemo, reorderSteps, deleteStep } from '../../background/storage';
import { APP_CONFIG } from '../../shared/constants';

export function useDemos() {
  const [demos, setDemos] = useState<Demo[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshDemos = useCallback(async () => {
    try {
      const data = await getDemos();
      setDemos(data);
    } catch (err) {
      console.error('Error loading demos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDemos();

    // Listen to storage changes to keep UI reactive
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[APP_CONFIG.STORAGE_KEYS.DEMOS]) {
        setDemos((changes[APP_CONFIG.STORAGE_KEYS.DEMOS].newValue as Demo[]) || []);
      }
    };

    chrome.storage.onChanged.addListener(storageListener);
    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, [refreshDemos]);

  const removeDemo = async (demoId: string) => {
    await deleteDemo(demoId);
    await refreshDemos();
  };

  const updateDemoDetails = async (demoId: string, patch: Partial<Demo>) => {
    await updateDemo(demoId, patch);
    await refreshDemos();
  };

  const removeStep = async (demoId: string, stepId: string) => {
    await deleteStep(demoId, stepId);
    await refreshDemos();
  };

  const reorderDemoSteps = async (demoId: string, orderedStepIds: string[]) => {
    await reorderSteps(demoId, orderedStepIds);
    await refreshDemos();
  };

  return {
    demos,
    loading,
    refreshDemos,
    removeDemo,
    updateDemoDetails,
    removeStep,
    reorderDemoSteps,
  };
}
