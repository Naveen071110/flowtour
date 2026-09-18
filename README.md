<div align="center">

# FlowTour — Interactive Demo & 4K Video Engine

<p align="center">
  <strong>Capture web app workflows, animate Screen Studio-style auto-zoom cameras, and export self-hosted interactive widgets or 60fps 4K video trailers. Zero backend. 100% Client-Side.</strong>
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/flowtour-interactive-demo/emaghcilmigcakcnnfonmgbfcddhikki"><img src="https://img.shields.io/badge/Chrome_Web_Store-v1.0.1-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome Web Store" /></a>
  <img src="https://img.shields.io/badge/Manifest-V3-0052CC?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/WebCodecs-60fps_4K-F7931A?style=for-the-badge" alt="WebCodecs" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-10B981?style=for-the-badge" alt="MIT License" /></a>
</p>

<sub>Built by <a href="https://github.com/Naveen071110">Naveen Guru</a> • For indie developers, SaaS founders, and open-source creators.</sub>

</div>

---

## ⚡ The Problem & The Solution

| The Old Way (Static Screenshots & Heavy SaaS) | The FlowTour Way (Local-First Engine) |
| :--- | :--- |
| **$60/mo recurring SaaS subscriptions** just to display a 5-step walkthrough tour on your website. | **Pay once ($19) or use Free ($0)** forever. Zero server costs, zero recurring fees. |
| **150KB+ vendor scripts** that track visitors, slow down Core Web Vitals, and introduce external dependencies. | **< 3KB vanilla embed or pure React JSX**. 100% self-hosted with zero vendor tracker footprint. |
| **Clunky screen recorders** requiring manual camera keyframing, timeline editing, and expensive desktop apps. | **Instant DOM coordinate recording** with automatic Screen Studio-style camera zooms & cubic-bezier pans. |
| **Vendor lock-in**: Cancel your subscription, and all your customer walkthroughs and interactive tours break. | **Zero lock-in**: You own the React code and MP4 files permanently. All data stays in your browser's IndexedDB. |

---

## ✨ Key Features

- **🎯 1-Click DOM & Coordinate Recorder**: Captures element clicks, CSS selectors, precise mouse coordinates, viewport ratios, and post-action screenshots via Chrome's Side Panel.
- **🎥 Screen Studio-Style Camera Auto-Zoom**: Automatically zooms and smoothly pans into click targets with cinematic easing (`cubic-bezier(0.16, 1, 0.3, 1)`) and pulsing click ripple indicators.
- **⚡ 60fps Ultra-HD WebCodecs Video Renderer**: Renders hardware-accelerated 4K and 1080p MP4 videos directly inside Chrome without sending a single frame to a cloud server.
- **☁️ 1-Click Chrome Profile Sync**: Zero-login licensing architecture powered by Dodo Payments and `chrome.storage.sync`. Licenses automatically replicate across all your signed-in Google Chrome browsers.
- **🧩 Dual Code Exporters**:
  - **React + Tailwind Component**: Modular JSX component (`<FlowTourPlayer />`) ready to drop into Next.js, Vite, or Remix apps.
  - **Vanilla JS Embed (< 3KB)**: Lightweight custom element (`<flow-tour />`) for static documentation, Webflow, or Shopify sites.
- **🔒 100% Local Privacy**: Screenshots and recordings never leave your local IndexedDB storage until you explicitly export.

---

## 🛠️ Architecture & Tech Stack

```
FlowTour/
├── src/
│   ├── background/         # Service worker, sequential capture queue & external messaging
│   ├── content_scripts/    # Low-overhead DOM event tracker & visual click HUD
│   ├── sidepanel/          # React 18 + Tailwind recording manager, editor & export studio
│   └── shared/             # IndexedDB screenshot vault & WebCodecs MP4 muxer engine
├── landing/                # Next.js 14 marketing landing page & 1-Click sync handler
├── public/                 # Manifest V3 configuration & extension icons
└── scripts/                # Multi-phase build pipeline (Vite + esbuild)
```

| Layer | Technologies Used | Purpose |
| :--- | :--- | :--- |
| **Browser Runtime** | Chrome Manifest V3, Service Workers, Side Panel API | Background automation, tab capture, and persistent side-docked UI. |
| **Extension UI** | React 18, TypeScript, Tailwind CSS, Lucide Icons | Interactive step editor, timeline reordering, and settings modal. |
| **Video Engine** | WebCodecs API, `mp4-muxer`, HTML5 Canvas 2D | In-browser 60fps 4K video encoding with dynamic zoom viewports. |
| **Local Storage** | IndexedDB (`idb`), `chrome.storage.local`, `chrome.storage.sync` | High-capacity screenshot storage & Google Account cloud licensing sync. |
| **Landing & Payments** | Next.js 14 (App Router), Framer Motion, Dodo Payments | Checkout redirects, license generation & 1-click external extension handshake. |

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18.0 or higher
- Google Chrome (or any Chromium-based browser: Brave, Edge)

### 1. Clone the repository
```bash
git clone https://github.com/Naveen071110/flowtour.git
cd flowtour
```

### 2. Install dependencies & build extension
```bash
npm install
npm run build
```
This will compile the background worker, content scripts, and side panel into the `dist/` directory.

### 3. Load the extension in Chrome
1. Open Google Chrome and go to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `dist/` folder inside the `FlowTour` directory.
4. Open the FlowTour Side Panel by clicking the extension icon or pinning it to your toolbar.

### 4. (Optional) Run the landing page locally
```bash
cd landing
npm install
npm run dev
```
Open `http://localhost:3000` to preview the landing page and test the 1-Click checkout handshake.

---

## 📦 Creating a Production Release Package

To generate a Chrome Web Store compliant `.zip` archive:
```bash
npm run package
```
The output zip archive will be generated at `flowtour-extension.zip`.

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

---

<div align="center">
  <sub>Crafted with ❤️ by <a href="https://github.com/Naveen071110">Naveen Guru</a> • Follow on <a href="https://x.com">X / Twitter</a></sub>
</div>
