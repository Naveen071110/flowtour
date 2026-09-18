import JSZip from 'jszip';
import { Demo, Step } from '../shared/types';
import { getScreenshotBlob } from '../shared/idb';
import { APP_CONFIG } from '../shared/constants';

/**
 * Builds the standalone, zero-dependency Vanilla JS interactive player HTML
 */
function buildPlayerHtml(demo: Demo): string {
  const stepsJson = JSON.stringify(
    demo.steps.map((s, idx) => ({
      index: idx + 1,
      title: s.title,
      annotation: s.annotation,
      image: `images/step_${idx + 1}.jpg`,
      xPercent: s.coordinates?.xPercent ?? 0.5,
      yPercent: s.coordinates?.yPercent ?? 0.5,
      elementText: s.elementText || '',
      elementRect: s.coordinates?.elementRect,
      scrollX: s.coordinates?.scrollX ?? 0,
      scrollY: s.coordinates?.scrollY ?? 0,
    })),
    null,
    2
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(demo.demoTitle)} | Interactive Walkthrough</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="flow-player-wrapper">
    <!-- Header -->
    <header class="player-header">
      <div class="header-left">
        <h1 class="demo-title">${escapeHtml(demo.demoTitle)}</h1>
        <span class="step-indicator" id="step-indicator">Step 1 of ${demo.steps.length}</span>
      </div>
      <div class="header-right">
        <button class="nav-btn" id="prev-btn" disabled aria-label="Previous step">‹ Prev</button>
        <button class="nav-btn primary" id="next-btn" aria-label="Next step">Next ›</button>
      </div>
    </header>

    <!-- Interactive Canvas & Viewport Container -->
    <main class="viewport-card">
      <div class="image-stage" id="image-stage">
        <img id="step-image" src="images/step_1.jpg" alt="Step Screenshot" class="screenshot-img" />
        <div id="click-target" class="click-target-pin" title="Click here to proceed">
          <div class="pin-ring"></div>
          <div class="pin-core"></div>
        </div>
      </div>

      <!-- Step Annotation Details -->
      <footer class="annotation-footer">
        <div class="annotation-content">
          <h2 id="step-title" class="annotation-title">${escapeHtml(demo.steps[0]?.title || '')}</h2>
          <p id="step-annotation" class="annotation-text">${escapeHtml(demo.steps[0]?.annotation || '')}</p>
        </div>
        <div class="progress-track" id="progress-track">
          <!-- Dots dynamically rendered -->
        </div>
      </footer>
    </main>

    <footer class="player-brand-footer">
      Powered by <span class="brand-name">${APP_CONFIG.name}</span>
    </footer>
  </div>

  <script>
    const STEPS = ${stepsJson};
  </script>
  <script src="player.js"></script>
</body>
</html>`;
}

/**
 * Builds the standalone CSS stylesheet
 */
function buildPlayerCss(): string {
  return `*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: #090d16;
  color: #f1f5f9;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
}

.flow-player-wrapper {
  width: 100%;
  max-width: 1080px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.player-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: #131b2e;
  border: 1px solid #1e293b;
  border-radius: 12px;
}

.demo-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: #f8fafc;
}

.step-indicator {
  font-size: 0.825rem;
  color: #94a3b8;
  margin-top: 2px;
  display: inline-block;
}

.header-right {
  display: flex;
  gap: 8px;
}

.nav-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid #334155;
  background: #1e293b;
  color: #f1f5f9;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-btn:hover:not(:disabled) {
  background: #334155;
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nav-btn.primary {
  background: #6366f1;
  border-color: #6366f1;
}

.nav-btn.primary:hover:not(:disabled) {
  background: #4f46e5;
}

.viewport-card {
  background: #131b2e;
  border: 1px solid #1e293b;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
}

.image-stage {
  position: relative;
  width: 100%;
  background: #020617;
  overflow: hidden;
  cursor: crosshair;
}

.screenshot-img {
  width: 100%;
  height: auto;
  display: block;
  user-select: none;
  transition: opacity 0.2s ease;
}

.click-target-pin {
  position: absolute;
  width: 36px;
  height: 36px;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  cursor: pointer;
  z-index: 10;
}

.pin-core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14px;
  height: 14px;
  background: #ec4899;
  border: 2px solid #ffffff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 12px rgba(236, 72, 153, 0.8);
}

.pin-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 2px solid #ec4899;
  border-radius: 50%;
  animation: pulsePin 1.6s infinite;
}

@keyframes pulsePin {
  0% { transform: scale(0.6); opacity: 0.9; }
  100% { transform: scale(1.8); opacity: 0; }
}

.annotation-footer {
  padding: 20px 24px;
  border-top: 1px solid #1e293b;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  background: #0f172a;
}

.annotation-content {
  flex: 1;
}

.annotation-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #f8fafc;
  margin-bottom: 4px;
}

.annotation-text {
  font-size: 0.9rem;
  color: #94a3b8;
  line-height: 1.4;
}

.progress-track {
  display: flex;
  gap: 8px;
}

.progress-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #334155;
  cursor: pointer;
  transition: all 0.2s;
}

.progress-dot.active {
  background: #6366f1;
  transform: scale(1.2);
}

.player-brand-footer {
  text-align: center;
  font-size: 0.75rem;
  color: #64748b;
}

.brand-name {
  color: #94a3b8;
  font-weight: 600;
}
`;
}

/**
 * Builds the standalone Vanilla JS widget engine (<3KB)
 */
function buildPlayerJs(): string {
  return `(function() {
  let currentIndex = 0;
  const total = STEPS.length;

  const imgEl = document.getElementById('step-image');
  const pinEl = document.getElementById('click-target');
  const titleEl = document.getElementById('step-title');
  const annotationEl = document.getElementById('step-annotation');
  const indicatorEl = document.getElementById('step-indicator');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const trackEl = document.getElementById('progress-track');

  function renderDots() {
    trackEl.innerHTML = '';
    STEPS.forEach((_, idx) => {
      const dot = document.createElement('div');
      dot.className = 'progress-dot' + (idx === currentIndex ? ' active' : '');
      dot.addEventListener('click', () => goToStep(idx));
      trackEl.appendChild(dot);
    });
  }

  function updateView() {
    const step = STEPS[currentIndex];
    if (!step) return;

    imgEl.style.opacity = '0.4';
    setTimeout(() => {
      imgEl.src = step.image;
      imgEl.onload = () => { imgEl.style.opacity = '1'; };
    }, 100);

    // Update target pin coordinates (percentage based)
    pinEl.style.left = (step.xPercent * 100) + '%';
    pinEl.style.top = (step.yPercent * 100) + '%';

    titleEl.textContent = step.title;
    annotationEl.textContent = step.annotation;
    indicatorEl.textContent = 'Step ' + (currentIndex + 1) + ' of ' + total;

    prevBtn.disabled = currentIndex === 0;
    nextBtn.textContent = currentIndex === total - 1 ? 'Finish' : 'Next ›';

    renderDots();
  }

  function goToStep(index) {
    if (index >= 0 && index < total) {
      currentIndex = index;
      updateView();
    }
  }

  // Pin click advances to next step!
  pinEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex < total - 1) {
      goToStep(currentIndex + 1);
    } else {
      goToStep(0); // Loop back
    }
  });

  prevBtn.addEventListener('click', () => goToStep(currentIndex - 1));
  nextBtn.addEventListener('click', () => {
    if (currentIndex < total - 1) {
      goToStep(currentIndex + 1);
    } else {
      goToStep(0);
    }
  });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'Space') {
      if (currentIndex < total - 1) goToStep(currentIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      if (currentIndex > 0) goToStep(currentIndex - 1);
    }
  });

  updateView();
})();`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Assembles and triggers the browser download of the complete ZIP bundle
 */
export async function downloadDemoZip(demo: Demo): Promise<void> {
  const zip = new JSZip();

  // 1. Add core files
  zip.file('index.html', buildPlayerHtml(demo));
  zip.file('style.css', buildPlayerCss());
  zip.file('player.js', buildPlayerJs());

  // 2. Fetch and add screenshot images from IndexedDB
  const imgFolder = zip.folder('images');
  if (imgFolder) {
    for (let i = 0; i < demo.steps.length; i++) {
      const step = demo.steps[i];
      if (step.screenshotId) {
        const blob = await getScreenshotBlob(step.screenshotId);
        if (blob) {
          imgFolder.file(`step_${i + 1}.jpg`, blob);
        }
      }
    }
  }

  // 3. Generate ZIP blob
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  // 4. Trigger download
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  const filename = `${demo.demoTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-walkthrough.zip`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
