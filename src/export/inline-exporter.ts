import { Demo } from '../shared/types';
import { getScreenshotDataUrl } from '../shared/idb';
import { APP_CONFIG } from '../shared/constants';

/**
 * Generates a single-file, self-contained HTML walkthrough with inline images
 */
export async function generateSingleFileHtml(demo: Demo): Promise<string> {
  const stepsWithImages = [];

  for (let i = 0; i < demo.steps.length; i++) {
    const step = demo.steps[i];
    let dataUrl = '';
    if (step.screenshotId) {
      dataUrl = (await getScreenshotDataUrl(step.screenshotId)) || '';
    }
    stepsWithImages.push({
      index: i + 1,
      title: step.title,
      annotation: step.annotation,
      image: dataUrl,
      xPercent: step.coordinates?.xPercent ?? 0.5,
      yPercent: step.coordinates?.yPercent ?? 0.5,
      elementRect: step.coordinates?.elementRect,
      scrollX: step.coordinates?.scrollX ?? 0,
      scrollY: step.coordinates?.scrollY ?? 0,
    });
  }

  const stepsJson = JSON.stringify(stepsWithImages);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(demo.demoTitle)} | Interactive Walkthrough</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #090d16;
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px;
    }
    .flow-wrapper { width: 100%; max-width: 1000px; display: flex; flex-direction: column; gap: 16px; }
    .header { display: flex; justify-content: space-between; align-items: center; background: #131b2e; padding: 14px 20px; border-radius: 12px; border: 1px solid #1e293b; }
    .title { font-size: 1.15rem; font-weight: 600; }
    .nav-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; cursor: pointer; }
    .nav-btn.primary { background: #6366f1; border-color: #6366f1; }
    .nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .stage { position: relative; width: 100%; background: #020617; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b; }
    .screenshot { width: 100%; height: auto; display: block; }
    .pin { position: absolute; width: 34px; height: 34px; transform: translate(-50%, -50%); cursor: pointer; z-index: 10; }
    .pin-core { position: absolute; top: 50%; left: 50%; width: 14px; height: 14px; background: #ec4899; border: 2px solid #fff; border-radius: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 10px rgba(236,72,153,0.8); }
    .pin-ring { width: 100%; height: 100%; border: 2px solid #ec4899; border-radius: 50%; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { transform: scale(0.6); opacity: 0.9; } 100% { transform: scale(1.8); opacity: 0; } }
    .footer { padding: 16px 20px; background: #0f172a; border-top: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
    .footer h3 { font-size: 1rem; color: #fff; margin-bottom: 4px; }
    .footer p { font-size: 0.875rem; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="flow-wrapper">
    <div class="header">
      <div>
        <div class="title">${escapeHtml(demo.demoTitle)}</div>
        <small id="indicator" style="color: #94a3b8;">Step 1 of ${demo.steps.length}</small>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="nav-btn" id="prev" disabled>‹ Prev</button>
        <button class="nav-btn primary" id="next">Next ›</button>
      </div>
    </div>
    <div class="stage">
      <img id="img" src="${stepsWithImages[0]?.image || ''}" class="screenshot" alt="Step Screenshot" />
      <div class="pin" id="pin" style="left: ${(stepsWithImages[0]?.xPercent ?? 0.5) * 100}%; top: ${(stepsWithImages[0]?.yPercent ?? 0.5) * 100}%;">
        <div class="pin-ring"></div>
        <div class="pin-core"></div>
      </div>
      <div class="footer">
        <div>
          <h3 id="step-title">${escapeHtml(demo.steps[0]?.title || '')}</h3>
          <p id="step-desc">${escapeHtml(demo.steps[0]?.annotation || '')}</p>
        </div>
      </div>
    </div>
  </div>
  <script>
    const steps = ${stepsJson};
    let curr = 0;
    const img = document.getElementById('img');
    const pin = document.getElementById('pin');
    const title = document.getElementById('step-title');
    const desc = document.getElementById('step-desc');
    const ind = document.getElementById('indicator');
    const prev = document.getElementById('prev');
    const next = document.getElementById('next');

    function update() {
      const s = steps[curr];
      if (!s) return;
      img.src = s.image;
      pin.style.left = (s.xPercent * 100) + '%';
      pin.style.top = (s.yPercent * 100) + '%';
      title.textContent = s.title;
      desc.textContent = s.annotation;
      ind.textContent = 'Step ' + (curr + 1) + ' of ' + steps.length;
      prev.disabled = curr === 0;
      next.textContent = curr === steps.length - 1 ? 'Restart ↺' : 'Next ›';
    }

    pin.onclick = () => { curr = (curr + 1) % steps.length; update(); };
    next.onclick = () => { curr = (curr + 1) % steps.length; update(); };
    prev.onclick = () => { if (curr > 0) { curr--; update(); } };
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
