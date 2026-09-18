import { useState, useEffect, useCallback } from 'react';
import { RecordingState, MessagePayload } from '../../shared/types';
import { APP_CONFIG } from '../../shared/constants';
import { getRecordingState } from '../../background/storage';

export function useRecording(onError?: (errorMsg: string) => void) {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    activeDemoId: null,
    activeTabId: null,
    stepCount: 0,
    startedAt: null,
  });

  const checkState = useCallback(async () => {
    try {
      const state = await getRecordingState();
      setRecordingState(state);
    } catch (err) {
      console.error('Error fetching recording state:', err);
    }
  }, []);

  useEffect(() => {
    checkState();

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[APP_CONFIG.STORAGE_KEYS.ACTIVE_RECORDING]) {
        setRecordingState(
          (changes[APP_CONFIG.STORAGE_KEYS.ACTIVE_RECORDING].newValue as RecordingState) || {
            isRecording: false,
            activeDemoId: null,
            activeTabId: null,
            stepCount: 0,
            startedAt: null,
          }
        );
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, [checkState]);

  const startRecording = async (demoId: string, demoTitle: string): Promise<boolean> => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'START_RECORDING',
        payload: { demoId, demoTitle },
      } as MessagePayload);

      if (response?.error) {
        if (onError) {
          onError(response.error);
        } else {
          console.error('[FlowTour Recording Error]', response.error);
        }
        return false;
      }
      return true;
    } catch (err: any) {
      const msg = err.message || 'Could not start recording';
      if (onError) {
        onError(msg);
      } else {
        console.error('[FlowTour Recording Error]', msg);
      }
      return false;
    }
  };

  const stopRecording = async (): Promise<void> => {
    try {
      await chrome.runtime.sendMessage({
        type: 'STOP_RECORDING',
      } as MessagePayload);
    } catch (err) {
      console.error('Error stopping recording:', err);
    }
  };

  return {
    isRecording: recordingState.isRecording,
    activeDemoId: recordingState.activeDemoId,
    stepCount: recordingState.stepCount,
    startedAt: recordingState.startedAt,
    startRecording,
    stopRecording,
  };
}
