import { CapturedClickEvent, SelectorResult } from '../shared/types';

export interface RecorderOptions {
  debounceMs?: number;
  ignoreSelector?: string;
  enableHoverTracking?: boolean;
}

export type ClickCaptureCallback = (event: CapturedClickEvent) => void;
