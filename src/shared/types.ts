export type ActionType = 'click' | 'input' | 'navigation' | 'scroll' | 'hover';

export type SelectorStrategy = 'id' | 'data-testid' | 'aria' | 'text' | 'structural' | 'coordinates';

export interface ElementBoundingBox {
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface Coordinates {
  x: number;
  y: number;
  // Normalized percentage relative to viewport (0.0 to 1.0) for responsive scaling
  xPercent: number;
  yPercent: number;
  // Scrollable container & element offset fallback
  scrollX?: number;
  scrollY?: number;
  elementRect?: ElementBoundingBox;
  elementRelativeX?: number;
  elementRelativeY?: number;
}

export interface Viewport {
  width: number;
  height: number;
  devicePixelRatio: number;
}

export interface SelectorResult {
  primary: string;
  fallback?: string;
  strategy: SelectorStrategy;
  confidence: 'high' | 'medium' | 'low';
}

export interface Step {
  id: string;
  index: number;
  actionType: ActionType;
  selector: string;
  selectorStrategy: SelectorStrategy;
  elementText: string;
  elementTagName: string;
  coordinates: Coordinates;
  viewport: Viewport;
  screenshotId: string; // Key in IndexedDB (the pre-click screenshot where element was clicked)
  screenshotUrl?: string; // Hydrated data URL or Object URL for display
  nextScreenshotId?: string; // Key in IndexedDB (the post-click screenshot resulting from action)
  title: string;
  annotation: string;
  timestamp: number;
}

export interface Demo {
  demoId: string;
  demoTitle: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
  steps: Step[];
  targetUrl?: string;
  initialScreenshotId?: string; // Baseline screenshot of page when recording started
  settings?: {
    themeColor?: string;
    showCoordinatesDot?: boolean;
    autoPlayInterval?: number;
  };
}

export interface RecordingState {
  isRecording: boolean;
  activeDemoId: string | null;
  activeTabId: number | null;
  stepCount: number;
  startedAt: number | null;
  lastScreenshotId?: string | null;
}

// Runtime messaging protocols
export type MessagePayload =
  | { type: 'START_RECORDING'; payload: { demoId: string; demoTitle?: string; tabId?: number } }
  | { type: 'STOP_RECORDING' }
  | { type: 'TOGGLE_RECORDER'; payload: { active: boolean; demoId?: string } }
  | { type: 'CLICK_CAPTURED'; payload: CapturedClickEvent }
  | { type: 'GET_RECORDING_STATE' }
  | { type: 'RECORDING_STATE_RESPONSE'; payload: RecordingState }
  | { type: 'STEP_ADDED'; payload: { demoId: string; step: Step } }
  | { type: 'RECORDER_STATUS'; payload: { isRecording: boolean } }
  | { type: 'SHOW_TOAST'; payload: { message: string } };

export interface CapturedClickEvent {
  selectorResult: SelectorResult;
  elementText: string;
  tagName: string;
  coordinates: Coordinates;
  viewport: Viewport;
  pageUrl: string;
  timestamp: number;
  actionType?: ActionType;
}
