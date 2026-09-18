import { SelectorResult, Coordinates, Viewport } from '../shared/types';

/**
 * Heuristic detector for auto-generated / hashed IDs or classes
 * Matches hashes like: _3kFj9, ember123, react-aria-453298, css-1dbjc4n, etc.
 */
function isGeneratedHash(val: string): boolean {
  if (!val || val.length > 50) return true;
  // Pure numbers or starts with number
  if (/^\d+$/.test(val)) return true;
  // React Aria, Radix, HeadlessUI auto-generated IDs
  if (/^(react-aria|radix-|headlessui-|ember|jsx-|_)/i.test(val)) return true;
  // Typical hash patterns (mixed casing with hex/alphanumeric randomness)
  if (/^[a-z]{1,4}[A-Za-z0-9_-]{5,10}$/.test(val) && /\d/.test(val)) return true;
  // Styled-components or emotion classes
  if (/^(sc-|css-)[a-zA-Z0-9]+/.test(val)) return true;
  return false;
}

/**
 * Cleans and filters classes to retain only stable, human-authored classes
 */
function getStableClasses(el: Element): string[] {
  if (!el.className || typeof el.className !== 'string') return [];
  const classes = el.className.trim().split(/\s+/);
  return classes.filter(cls => {
    if (!cls) return false;
    // Skip Tailwind arbitrary values like w-[320px], bg-[#fff]
    if (cls.includes('[') || cls.includes(':') || cls.includes('/') || cls.includes('.')) return false;
    // Skip generated hash classes
    if (isGeneratedHash(cls)) return false;
    // Skip active/focus/hover state utility classes
    if (/^(active|focus|open|closed|selected|disabled)$/i.test(cls)) return false;
    return true;
  });
}

/**
 * Checks if a selector is uniquely identifying a single element in the document
 */
function isUniqueSelector(selector: string, targetEl: Element): boolean {
  try {
    const matches = document.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === targetEl;
  } catch {
    return false;
  }
}

/**
 * Priority Waterfall Selector Algorithm
 */
export function generateSmartSelector(target: Element): SelectorResult {
  const tagName = target.tagName.toLowerCase();

  // 1. Check ID (if not auto-generated)
  if (target.id && !isGeneratedHash(target.id)) {
    const idSelector = `#${CSS.escape(target.id)}`;
    if (isUniqueSelector(idSelector, target)) {
      return {
        primary: idSelector,
        strategy: 'id',
        confidence: 'high'
      };
    }
  }

  // 2. Check Data Attributes (data-testid, data-cy, data-test, data-qa)
  const testAttrs = ['data-testid', 'data-cy', 'data-test', 'data-qa', 'data-automation-id', 'name'];
  for (const attr of testAttrs) {
    const val = target.getAttribute(attr);
    if (val && !isGeneratedHash(val)) {
      const attrSelector = `${tagName}[${attr}="${CSS.escape(val)}"]`;
      if (isUniqueSelector(attrSelector, target)) {
        return {
          primary: attrSelector,
          strategy: 'data-testid',
          confidence: 'high'
        };
      }
    }
  }

  // 3. Check ARIA labels and roles
  const ariaLabel = target.getAttribute('aria-label');
  if (ariaLabel) {
    const ariaSelector = `${tagName}[aria-label="${CSS.escape(ariaLabel)}"]`;
    if (isUniqueSelector(ariaSelector, target)) {
      return {
        primary: ariaSelector,
        strategy: 'aria',
        confidence: 'high'
      };
    }
  }

  const role = target.getAttribute('role');
  if (role && ariaLabel) {
    const roleSelector = `[role="${CSS.escape(role)}"][aria-label="${CSS.escape(ariaLabel)}"]`;
    if (isUniqueSelector(roleSelector, target)) {
      return {
        primary: roleSelector,
        strategy: 'aria',
        confidence: 'high'
      };
    }
  }

  // 4. Stable class name combinations
  const stableClasses = getStableClasses(target);
  if (stableClasses.length > 0) {
    // Try single classes
    for (const cls of stableClasses) {
      const clsSelector = `${tagName}.${CSS.escape(cls)}`;
      if (isUniqueSelector(clsSelector, target)) {
        return {
          primary: clsSelector,
          strategy: 'structural',
          confidence: 'medium'
        };
      }
    }
    // Try combined classes
    const combinedSelector = `${tagName}.${stableClasses.map(c => CSS.escape(c)).join('.')}`;
    if (isUniqueSelector(combinedSelector, target)) {
      return {
        primary: combinedSelector,
        strategy: 'structural',
        confidence: 'medium'
      };
    }
  }

  // 5. Structural DOM path traversing upwards
  const pathParts: string[] = [];
  let current: Element | null = target;

  while (current && current !== document.body && current !== document.documentElement) {
    const currentTag = current.tagName.toLowerCase();
    
    // If an ancestor has a unique ID, stop path there
    if (current.id && !isGeneratedHash(current.id)) {
      pathParts.unshift(`#${CSS.escape(current.id)}`);
      break;
    }

    let parentEl: Element | null = current.parentElement;
    if (!parentEl) {
      // Check if current is inside a ShadowRoot
      const rootNode = current.getRootNode();
      if (rootNode instanceof ShadowRoot && rootNode.host) {
        parentEl = rootNode.host;
        pathParts.unshift(currentTag);
        current = parentEl;
        continue;
      }
      pathParts.unshift(currentTag);
      break;
    }

    const siblings = Array.from(parentEl.children).filter((child: Element) => child.tagName === current?.tagName);
    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1;
      pathParts.unshift(`${currentTag}:nth-of-type(${index})`);
    } else {
      pathParts.unshift(currentTag);
    }

    const candidate = pathParts.join(' > ');
    if (isUniqueSelector(candidate, target)) {
      return {
        primary: candidate,
        strategy: 'structural',
        confidence: 'medium'
      };
    }

    current = parentEl;
  }

  const finalPath = pathParts.join(' > ');
  return {
    primary: finalPath || tagName,
    strategy: 'coordinates', // Flag as low confidence if deeply structural
    confidence: 'low'
  };
}

/**
 * Extracts cleaned element text
 */
export function extractElementText(el: Element): string {
  // Check standard button / link content
  let text = el.textContent || '';
  text = text.replace(/\s+/g, ' ').trim();

  // If text is excessively long (like a whole card), truncate
  if (text.length > 60) {
    text = text.substring(0, 57) + '...';
  }

  // If element has no text (e.g. icon button), check title or aria-label
  if (!text) {
    const title = el.getAttribute('title');
    const aria = el.getAttribute('aria-label');
    const alt = el.getAttribute('alt');
    text = title || aria || alt || el.tagName.toLowerCase();
  }

  return text;
}

/**
 * Calculates responsive, normalized coordinates, element bounding box,
 * and scroll offsets for scrollable container resilience
 */
export function calculateCoordinates(e: MouseEvent, target?: Element | null): { coordinates: Coordinates; viewport: Viewport } {
  const width = window.innerWidth || document.documentElement.clientWidth;
  const height = window.innerHeight || document.documentElement.clientHeight;
  const x = e.clientX;
  const y = e.clientY;
  const scrollX = window.scrollX ?? window.pageXOffset ?? 0;
  const scrollY = window.scrollY ?? window.pageYOffset ?? 0;

  let elementRect = undefined;
  let elementRelativeX = undefined;
  let elementRelativeY = undefined;

  if (target && typeof target.getBoundingClientRect === 'function') {
    const rect = target.getBoundingClientRect();
    elementRect = {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom),
    };
    elementRelativeX = Math.round(x - rect.left);
    elementRelativeY = Math.round(y - rect.top);
  }

  return {
    coordinates: {
      x,
      y,
      xPercent: Math.min(Math.max(x / (width || 1), 0), 1),
      yPercent: Math.min(Math.max(y / (height || 1), 0), 1),
      scrollX,
      scrollY,
      elementRect,
      elementRelativeX,
      elementRelativeY,
    },
    viewport: {
      width,
      height,
      devicePixelRatio: window.devicePixelRatio || 1,
    }
  };
}
