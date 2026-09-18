import { CapturedClickEvent } from '../shared/types';
import { RecorderOptions, ClickCaptureCallback } from './types';
import { generateSmartSelector, extractElementText, calculateCoordinates } from './selector-waterfall';

export class DOMRecorderEngine {
  private active = false;
  private options: Required<RecorderOptions>;
  private callback: ClickCaptureCallback | null = null;
  private lastClickTimestamp = 0;
  private lastClickCoordinates = { x: 0, y: 0 };
  private boundClickHandler: (e: MouseEvent) => void;
  private boundMouseMoveHandler: (e: MouseEvent) => void;
  private hoverTimer: any = null;
  private lastHoveredElement: Element | null = null;

  constructor(options: RecorderOptions = {}, callback?: ClickCaptureCallback) {
    this.options = {
      debounceMs: options.debounceMs ?? 300,
      ignoreSelector: options.ignoreSelector ?? '[data-flowtour-ignore], #flowtour-hud-host, .flowtour-ignore',
      enableHoverTracking: options.enableHoverTracking ?? false,
    };
    if (callback) {
      this.callback = callback;
    }

    this.boundClickHandler = this.handleClick.bind(this);
    this.boundMouseMoveHandler = this.handleMouseMove.bind(this);
  }

  public setCallback(callback: ClickCaptureCallback): void {
    this.callback = callback;
  }

  public start(): void {
    if (this.active) return;
    this.active = true;

    // Listen in capture phase to record clicks before web page stops propagation
    window.addEventListener('click', this.boundClickHandler, { capture: true, passive: false });

    if (this.options.enableHoverTracking) {
      window.addEventListener('mousemove', this.boundMouseMoveHandler, { capture: true, passive: true });
    }
  }

  public stop(): void {
    if (!this.active) return;
    this.active = false;
    window.removeEventListener('click', this.boundClickHandler, { capture: true });
    window.removeEventListener('mousemove', this.boundMouseMoveHandler, { capture: true });

    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    this.lastHoveredElement = null;
  }

  public isRecording(): boolean {
    return this.active;
  }

  public destroy(): void {
    this.stop();
    this.callback = null;
  }

  private handleClick(e: MouseEvent): void {
    if (!this.active || !this.callback) return;

    // Guard against invalidated extension context after extension reload
    if (typeof chrome !== 'undefined' && chrome.runtime && !chrome.runtime.id) {
      this.destroy();
      return;
    }

    // Shadow DOM Event Piercing:
    // If the click occurs inside a Shadow Root, e.target is retargeted to the custom element host.
    // e.composedPath() pierces the shadow boundary and returns the array of nodes starting
    // with the true, innermost clicked element!
    const composed = typeof e.composedPath === 'function' ? e.composedPath() : [];
    const target = (composed.length > 0 && composed[0] instanceof Element ? composed[0] : e.target) as Element | null;
    if (!target) return;

    // Ignore clicks on internal extension HUD / widget (checking full composed path)
    if (this.isIgnoredElement(target, composed)) {
      return;
    }

    // Debounce rapid repeated clicks within short duration
    const now = Date.now();
    const distance = Math.hypot(e.clientX - this.lastClickCoordinates.x, e.clientY - this.lastClickCoordinates.y);
    if (now - this.lastClickTimestamp < this.options.debounceMs && distance < 10) {
      return;
    }

    // Clear any pending hover capture
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }

    this.lastClickTimestamp = now;
    this.lastClickCoordinates = { x: e.clientX, y: e.clientY };

    // Compute selector, coordinates, and metadata
    const selectorResult = generateSmartSelector(target);
    const elementText = extractElementText(target);
    const tagName = target.tagName.toLowerCase();
    const { coordinates, viewport } = calculateCoordinates(e, target);

    const eventData: CapturedClickEvent = {
      selectorResult,
      elementText,
      tagName,
      coordinates,
      viewport,
      pageUrl: window.location.href,
      timestamp: now,
      actionType: 'click',
    };

    // Forward to callback
    this.callback(eventData);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.active || !this.options.enableHoverTracking || !this.callback) return;

    const composed = typeof e.composedPath === 'function' ? e.composedPath() : [];
    const target = (composed.length > 0 && composed[0] instanceof Element ? composed[0] : e.target) as Element | null;
    if (!target || this.isIgnoredElement(target, composed)) {
      if (this.hoverTimer) {
        clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }
      return;
    }

    // Check if target is an interactive element worthy of hover capture
    const tag = target.tagName.toLowerCase();
    const isInteractive =
      ['button', 'a', 'select', 'nav', 'summary'].includes(tag) ||
      target.hasAttribute('role') ||
      target.hasAttribute('aria-haspopup');

    if (!isInteractive) {
      if (this.hoverTimer) {
        clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }
      return;
    }

    if (this.lastHoveredElement === target) return;

    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
    }

    this.hoverTimer = setTimeout(() => {
      if (!this.active || !this.callback) return;
      this.lastHoveredElement = target;

      const selectorResult = generateSmartSelector(target);
      const elementText = extractElementText(target);
      const tagName = target.tagName.toLowerCase();
      const { coordinates, viewport } = calculateCoordinates(e, target);

      const eventData: CapturedClickEvent = {
        selectorResult,
        elementText,
        tagName,
        coordinates,
        viewport,
        pageUrl: window.location.href,
        timestamp: Date.now(),
        actionType: 'hover',
      };

      this.callback(eventData);
    }, 1400);
  }

  private isIgnoredElement(el: Element, composedPath: EventTarget[] = []): boolean {
    // 1. Check if any node in the composed event path belongs to our extension HUD
    if (composedPath.length > 0) {
      const isPathIgnored = composedPath.some((node) => {
        if (node instanceof Element) {
          if (node.id === 'flowtour-hud-host' || node.hasAttribute('data-flowtour-ignore')) {
            return true;
          }
          if (node.matches && node.matches(this.options.ignoreSelector)) {
            return true;
          }
        }
        return false;
      });
      if (isPathIgnored) return true;
    }

    // 2. Check if element or any ancestor matches ignore selector
    try {
      if (el.closest && el.closest(this.options.ignoreSelector)) {
        return true;
      }
    } catch {
      // Ignore query errors on special elements like XML/SVG
    }

    // 3. Check if inside shadow root of an extension component
    let current: Node | null = el;
    while (current) {
      if (current instanceof ShadowRoot) {
        if ((current.host as HTMLElement)?.id === 'flowtour-hud-host') {
          return true;
        }
      }
      current = current.parentNode;
    }

    return false;
  }
}
