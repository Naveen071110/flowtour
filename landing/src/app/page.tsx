"use client";

import React, { useState, useEffect } from "react";
import posthog from "posthog-js";
import { motion } from "framer-motion";
import {
  Video,
  MousePointerClick,
  Code2,
  Check,
  X,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Github,
  Twitter,
  ChevronRight,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/flowtour-interactive-demo/emaghcilmigcakcnnfonmgbfcddhikki?hl=en-US&utm_source=ext_sidebar";
const GITHUB_URL = "https://github.com/Naveen071110";
const PRODUCT_HUNT_URL = "https://www.producthunt.com/products/flowtour";

function ProductHuntIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13.6 13.87h-3.32V8.13h3.32c1.58 0 2.87 1.29 2.87 2.87s-1.29 2.87-2.87 2.87zM12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm1.6 15.87h-3.32v4.13H8.28V6.13h5.32c2.68 0 4.87 2.19 4.87 4.87s-2.19 4.87-4.87 4.87z" />
    </svg>
  );
}

function ProductHuntBadgeLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="#FF6154" />
      <path
        d="M22.6667 21.3333H17.3333V14.6667H22.6667C24.5076 14.6667 26 16.159 26 18C26 19.841 24.5076 21.3333 22.6667 21.3333ZM22.6667 12H14.6667V28H17.3333V24H22.6667C25.9805 24 28.6667 21.3137 28.6667 18C28.6667 14.6863 25.9805 12 22.6667 12Z"
        fill="white"
      />
    </svg>
  );
}

// Real Recorded FlowTour Demos
const DEMO_VIDEOS = [
  {
    id: "gitcontextgen",
    title: "GitContextGen (1080p)",
    src: "/gitcontextgen-demo.mp4",
    urlDisplay: "https://gitcontextgen.com",
    badge: "1080p 60fps • Auto-Zoom",
    footerTitle: "GitContextGen Product Walkthrough Captured with FlowTour",
    footerDesc: "60fps camera tracking, auto-focus zoom & click ripple animations",
  },
  {
    id: "workflow",
    title: "App Workflow (1080p)",
    src: "/new-1080p-1.4x.mp4",
    urlDisplay: "https://app.ahrefs.com/dashboard",
    badge: "1080p 60fps • Click Focus",
    footerTitle: "SaaS Dashboard Flow Captured with FlowTour",
    footerDesc: "Smooth camera panning, step pill badges & 100% client-side export",
  },
];

export default function LandingPage() {
  const [selectedDemoId, setSelectedDemoId] = useState<string>("gitcontextgen");
  const [copiedCode, setCopiedCode] = useState(false);
  const [codeTab, setCodeTab] = useState<"react" | "html">("react");

  const currentVideo = DEMO_VIDEOS.find((v) => v.id === selectedDemoId) || DEMO_VIDEOS[0];

  const handleCopyCode = () => {
    const code =
      codeTab === "react"
        ? `import { FlowTourPlayer } from '@flowtour/react';\n\nexport default function ProductWalkthrough() {\n  return (\n    <FlowTourPlayer \n      tourId="genesis-mint-flow"\n      autoZoom={true}\n      theme="dark"\n    />\n  );\n}`
        : `<script src="https://cdn.jsdelivr.net/npm/@flowtour/embed@1.0/tour.min.js"></script>\n<flow-tour tour-id="genesis-mint-flow" auto-zoom="true"></flow-tour>`;

    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const dodoCheckoutUrl =
    process.env.NEXT_PUBLIC_DODO_PAYMENT_URL ||
    "https://checkout.dodopayments.com/buy/pdt_0No1lqCYBUrKAshq17fdl?quantity=1&redirect_url=https%3A%2F%2Fflowtour.vercel.app%2Fsuccess";

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-zinc-800 selection:text-white relative overflow-hidden font-sans">
      {/* Subtle developer radial grid dots */}
      <div className="absolute inset-0 bg-grid-dots pointer-events-none -z-10" />

      {/* -------------------------------------------------------------
          1. NAVBAR
      -------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-black/80 border-b border-zinc-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center">
              <img src="/icon.png" alt="FlowTour" className="w-5 h-5 object-contain" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold tracking-tight text-zinc-100">
                FlowTour
              </span>
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                v1.0
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-400">
            <a href="#features" className="hover:text-zinc-100 transition-colors">
              Features
            </a>
            <a href="#demo" className="hover:text-zinc-100 transition-colors">
              Live Demo
            </a>
            <a href="#comparison" className="hover:text-zinc-100 transition-colors">
              Comparison
            </a>
            <a href="#story" className="hover:text-zinc-100 transition-colors">
              Maker Story
            </a>
            <a href="#pricing" className="hover:text-zinc-100 transition-colors">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={PRODUCT_HUNT_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => posthog.capture('clicked_product_hunt_navbar')}
              className="text-zinc-400 hover:text-[#FF6154] transition-colors hidden sm:block p-1"
              title="View FlowTour on Product Hunt"
            >
              <ProductHuntIcon className="w-4 h-4" />
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 hover:text-zinc-100 transition-colors hidden sm:block p-1"
              title="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => posthog.capture('clicked_install_chrome_store')}
              className="h-8 px-3 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium text-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Add to Chrome</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* -------------------------------------------------------------
            2. HERO SECTION
        -------------------------------------------------------------- */}
        <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 px-4 sm:px-6 max-w-5xl mx-auto text-center">
          {/* Product Hunt Announcement & Launch Pill */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6 flex flex-wrap items-center justify-center gap-2.5"
          >
            <a
              href={PRODUCT_HUNT_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => posthog.capture('clicked_product_hunt_hero_pill')}
              className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#FF6154]/30 bg-[#FF6154]/10 hover:bg-[#FF6154]/20 hover:border-[#FF6154]/60 transition-all text-xs font-mono text-zinc-200 shadow-[0_0_20px_-4px_rgba(255,97,84,0.25)] hover:shadow-[0_0_25px_-2px_rgba(255,97,84,0.4)]"
            >
              <ProductHuntBadgeLogo className="w-4 h-4 shrink-0" />
              <span className="text-[#FF6154] font-semibold tracking-wide text-[11px]">PRODUCT HUNT</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-200 group-hover:text-white transition-colors">
                Featured on Product Hunt
              </span>
              <span className="text-[#FF6154] font-medium flex items-center group-hover:translate-x-0.5 transition-transform text-[11px]">
                <span>Support us</span>
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </span>
            </a>

            <div className="hidden sm:inline-flex items-center gap-2 border border-zinc-800 bg-zinc-900/60 text-zinc-400 text-xs font-mono px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Developer-First Chrome Extension</span>
              <span className="text-zinc-700">•</span>
              <span className="text-zinc-500">Zero Backend</span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-semibold tracking-tight text-zinc-100 max-w-4xl mx-auto leading-[1.1]"
          >
            Turn App Clicks into Interactive Demos & Auto-Zoom Videos in 60s
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto font-normal leading-relaxed"
          >
            Capture your web app workflow directly in Chrome. Export Screen Studio-style
            auto-zoomed 60fps MP4 trailers or clean, zero-dependency React and Tailwind
            landing page walkthroughs.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => posthog.capture('clicked_install_chrome_store')}
              className="w-full sm:w-auto h-10 px-5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <span>Add to Chrome — Free Forever</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>

            <a
              href="#demo"
              onClick={() => {
                setSelectedDemoId("gitcontextgen");
                posthog.capture('clicked_view_demo');
              }}
              className="w-full sm:w-auto h-10 px-5 rounded-md border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-300 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Play className="w-3 h-3 text-emerald-400 fill-current" />
              <span>Watch in Action</span>
            </a>

            <a
              href={PRODUCT_HUNT_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => posthog.capture('clicked_product_hunt_hero_button')}
              className="w-full sm:w-auto h-10 px-4 rounded-md border border-[#FF6154]/30 bg-zinc-950/80 hover:bg-[#FF6154]/10 hover:border-[#FF6154]/60 text-zinc-200 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition-all group"
            >
              <ProductHuntBadgeLogo className="w-4 h-4 shrink-0" />
              <span>Review on Product Hunt</span>
              <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-[#FF6154] transition-colors" />
            </a>
          </motion.div>

          {/* Official Product Hunt Badge Embed */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-6 flex justify-center"
          >
            <a
              href="https://www.producthunt.com/products/flowtour?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-flowtour"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => posthog.capture('clicked_product_hunt_embed_badge')}
              className="inline-block transition-transform hover:scale-105 filter drop-shadow-[0_4px_16px_rgba(255,97,84,0.18)]"
              title="FlowTour on Product Hunt"
            >
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1257195&theme=dark&t=1790361837290"
                alt="FlowTour - Turn web app clicks into interactive demos & 4K videos | Product Hunt"
                style={{ width: "250px", height: "54px" }}
                width={250}
                height={54}
                className="h-[50px] w-auto sm:h-[54px]"
              />
            </a>
          </motion.div>

          {/* Micro trust pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-zinc-500"
          >
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-zinc-400" />
              <span>100% Client-Side WebCodecs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-zinc-400" />
              <span>Local IndexedDB Privacy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-zinc-400" />
              <span>Export 3KB React Tour or MP4</span>
            </div>
            <a
              href={PRODUCT_HUNT_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => posthog.capture('clicked_product_hunt_trust_pill')}
              className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors group"
            >
              <ProductHuntBadgeLogo className="w-3.5 h-3.5 shrink-0" />
              <span className="text-zinc-400 group-hover:text-zinc-200">Product Hunt Community</span>
            </a>
          </motion.div>

          {/* -------------------------------------------------------------
              HERO DEMO CONTAINER (Window Frame)
          -------------------------------------------------------------- */}
          <motion.div
            id="demo"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-12 border border-zinc-800 bg-zinc-950 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md max-w-4xl mx-auto text-left"
          >
            {/* Window titlebar */}
            <div className="h-11 px-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                <span className="ml-2 text-[11px] font-mono text-zinc-500 hidden md:inline truncate max-w-[260px]">
                  {currentVideo.urlDisplay}
                </span>
              </div>

              {/* Segmented Demo Video Selector */}
              <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 p-0.5 rounded-md">
                {DEMO_VIDEOS.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => setSelectedDemoId(demo.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                      selectedDemoId === demo.id
                        ? "bg-zinc-800 text-zinc-100 font-medium shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Video className={`w-3 h-3 ${selectedDemoId === demo.id ? "text-emerald-400" : "text-zinc-500"}`} />
                    <span>{demo.title}</span>
                  </button>
                ))}
              </div>

              {/* Right controls badge */}
              <div className="flex items-center gap-2">
                <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {currentVideo.badge}
                </span>
              </div>
            </div>

            {/* Real Recorded 1080p MP4 Video Preview */}
            <div className="relative bg-black flex flex-col items-center justify-center overflow-hidden">
              <video
                key={currentVideo.src}
                src={currentVideo.src}
                autoPlay
                loop
                muted
                playsInline
                controls
                className="w-full h-auto max-h-[520px] object-contain bg-black"
              />
              <div className="w-full px-4 py-2.5 bg-zinc-950 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-zinc-200 font-medium">{currentVideo.footerTitle}</span>
                  <span className="text-zinc-700 hidden sm:inline">•</span>
                  <span className="text-zinc-500 hidden sm:inline">{currentVideo.footerDesc}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <Check className="w-3 h-3 text-zinc-400" />
                  <span>Rendered 100% Client-Side WebCodecs</span>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* -------------------------------------------------------------
            3. FEATURE GRID (3 CORE PILLARS)
        -------------------------------------------------------------- */}
        <section id="features" className="py-20 px-4 sm:px-6 max-w-5xl mx-auto border-t border-zinc-800/80">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Core Architecture
            </span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-semibold text-zinc-100 tracking-tight">
              Three Powerful Output Pipelines
            </h2>
            <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
              Everything runs 100% locally in your Chrome browser. Record once, and instantly
              export high-converting assets with zero cloud subscriptions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pillar 1 */}
            <div className="border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-900/60 transition-all p-6 rounded-xl hover:border-zinc-700 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
                  <MousePointerClick className="w-5 h-5 stroke-zinc-400 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
                  1-Click Chrome Recording
                </h3>
                <p className="mt-2 text-zinc-400 text-xs leading-relaxed">
                  Click through your application naturally. FlowTour captures every DOM click,
                  exact CSS selector, viewport coordinates, and screenshot with zero background lag.
                </p>

                <ul className="mt-5 space-y-2 text-[11px] font-mono text-zinc-400">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Exact DOM path & coordinate tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Works on localhost and staging</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Re-order or annotate any step</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-500">
                0ms Extension overhead
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-900/60 transition-all p-6 rounded-xl hover:border-zinc-700 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
                  <Video className="w-5 h-5 stroke-zinc-400 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
                  Auto-Zoom 60fps MP4 Export
                </h3>
                <p className="mt-2 text-zinc-400 text-xs leading-relaxed">
                  Turn static clicks into cinematic product trailers. The native WebCodecs engine
                  smoothly pans and zooms the camera onto click targets like Screen Studio.
                </p>

                <ul className="mt-5 space-y-2 text-[11px] font-mono text-zinc-400">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Screen Studio camera pan & zoom</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Native WebCodecs & MP4Box muxing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Direct client-side MP4 generation</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-500">
                Direct to Downloads folder
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-900/60 transition-all p-6 rounded-xl hover:border-zinc-700 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
                  <Code2 className="w-5 h-5 stroke-zinc-400 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
                  100% Self-Hosted & Zero Bloat
                </h3>
                <p className="mt-2 text-zinc-400 text-xs leading-relaxed">
                  Avoid bloated 150KB tracking scripts. Copy a 3KB standalone embed script or clean
                  React + Tailwind JSX component directly into your codebase.
                </p>

                <ul className="mt-5 space-y-2 text-[11px] font-mono text-zinc-400">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-300" />
                    <span>3KB embed or clean React component</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-300" />
                    <span>No subscription API limits or calls</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Zero 3rd-party tracking cookies</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-500">
                You own the code forever
              </div>
            </div>
          </div>

          {/* Code preview widget */}
          <div className="mt-8 border border-zinc-800 rounded-xl bg-zinc-950 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-xs">
              <div className="flex items-center gap-2 font-mono">
                <button
                  onClick={() => setCodeTab("react")}
                  className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                    codeTab === "react"
                      ? "bg-zinc-800 text-zinc-100 font-medium"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  React Component
                </button>
                <button
                  onClick={() => setCodeTab("html")}
                  className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                    codeTab === "html"
                      ? "bg-zinc-800 text-zinc-100 font-medium"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Vanilla HTML (3KB)
                </button>
              </div>

              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-zinc-100" />
                    <span className="text-zinc-100">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <pre className="mt-3 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed p-1">
              {codeTab === "react" ? (
                <code>
                  import &#123; FlowTourPlayer &#125; from '@flowtour/react';
                  <br />
                  <br />
                  export default function ProductWalkthrough() &#123;
                  <br />
                  &nbsp;&nbsp;return (
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&lt;FlowTourPlayer
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tourId="genesis-mint-flow"
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;autoZoom=&#123;true&#125;
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;theme="dark"
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;/&gt;
                  <br />
                  &nbsp;&nbsp;);
                  <br />
                  &#125;
                </code>
              ) : (
                <code>
                  &lt;script src="https://cdn.jsdelivr.net/npm/@flowtour/embed@1.0/tour.min.js"&gt;&lt;/script&gt;
                  <br />
                  &lt;flow-tour tour-id="genesis-mint-flow" auto-zoom="true"&gt;&lt;/flow-tour&gt;
                </code>
              )}
            </pre>
          </div>
        </section>

        {/* -------------------------------------------------------------
            4. COMPARISON MATRIX ("Painkiller" Positioning)
        -------------------------------------------------------------- */}
        <section id="comparison" className="py-20 px-4 sm:px-6 max-w-5xl mx-auto border-t border-zinc-800/80">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Why FlowTour
            </span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-semibold text-zinc-100 tracking-tight">
              Enterprise Demo SaaS vs. FlowTour
            </h2>
            <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
              Stop paying $600–$1,200/year to host a few interactive steps.
            </p>
          </div>

          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
            <table className="w-full text-left border-collapse min-w-[580px]">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 text-xs font-mono uppercase">
                  <th className="py-3 px-5">Capability</th>
                  <th className="py-3 px-5">Enterprise SaaS ($60/mo)</th>
                  <th className="py-3 px-5 text-zinc-100 font-semibold bg-zinc-900/80">FlowTour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-xs">
                <tr>
                  <td className="py-3.5 px-5 font-medium text-zinc-200">Pricing Model</td>
                  <td className="py-3.5 px-5 text-zinc-500">$50 – $150 / month recurring</td>
                  <td className="py-3.5 px-5 text-zinc-100 font-medium bg-zinc-900/40">
                    $0 Free / $19 Lifetime One-Time
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-5 font-medium text-zinc-200">Hosting & Privacy</td>
                  <td className="py-3.5 px-5 text-zinc-500">Stored on 3rd-party vendor servers</td>
                  <td className="py-3.5 px-5 text-zinc-100 font-medium bg-zinc-900/40">
                    100% Local in your Chrome IndexedDB
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-5 font-medium text-zinc-200">Script Footprint</td>
                  <td className="py-3.5 px-5 text-zinc-500">120KB – 200KB+ heavy tracker</td>
                  <td className="py-3.5 px-5 text-zinc-100 font-medium bg-zinc-900/40">
                    &lt; 3KB or Pure React JSX
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-5 font-medium text-zinc-200">Auto-Zoom MP4 Export</td>
                  <td className="py-3.5 px-5 text-zinc-500">Watermarked or $100+/mo tier</td>
                  <td className="py-3.5 px-5 text-zinc-100 font-medium bg-zinc-900/40">
                    Native 60fps WebCodecs Auto-Zoom
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-5 font-medium text-zinc-200">Vendor Lock-In</td>
                  <td className="py-3.5 px-5 text-zinc-500">Cancel subscription = tours break</td>
                  <td className="py-3.5 px-5 text-zinc-100 font-medium bg-zinc-900/40">
                    Zero lock-in. You own code forever.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* -------------------------------------------------------------
            5. MAKER STORY
        -------------------------------------------------------------- */}
        <section id="story" className="py-20 px-4 sm:px-6 max-w-3xl mx-auto border-t border-zinc-800/80">
          <div className="border border-zinc-800 bg-zinc-900/30 rounded-xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center font-mono font-medium text-xs text-zinc-200">
                NG
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-100">
                  Naveen Guru
                </h3>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Software Engineer • Creator of GitContextGen & FlowTour
                </p>
              </div>
            </div>

            <blockquote className="text-sm text-zinc-300 leading-relaxed font-normal border-l border-zinc-700 pl-4 my-4">
              "Hey, I'm Naveen! As a solo engineer launching apps like GitContextGen, I got tired
              of paying $60/month just to show a 5-step walkthrough on my landing page.
              <br />
              <br />
              I built FlowTour to give developers a self-hosted, auto-zooming demo engine with zero
              monthly fees. It records right in Chrome, animates smooth camera pans to click targets,
              and exports clean React code or 60fps MP4s in seconds. Built by a dev, for devs."
            </blockquote>

            <div className="flex items-center justify-between text-xs font-mono text-zinc-500 pt-3 border-t border-zinc-800/80">
              <div className="flex items-center gap-4">
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-200 transition-colors flex items-center gap-1"
                >
                  <Twitter className="w-3.5 h-3.5" />
                  <span>X / Twitter</span>
                </a>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-200 transition-colors flex items-center gap-1"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                </a>
                <a
                  href={PRODUCT_HUNT_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => posthog.capture('clicked_product_hunt_maker_story')}
                  className="hover:text-[#FF6154] transition-colors flex items-center gap-1"
                >
                  <ProductHuntIcon className="w-3.5 h-3.5 text-[#FF6154]" />
                  <span>Product Hunt</span>
                </a>
              </div>
              <span>Open-First</span>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            6. PRICING SECTION
        -------------------------------------------------------------- */}
        <section id="pricing" className="py-20 px-4 sm:px-6 max-w-4xl mx-auto border-t border-zinc-800/80">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              Pricing
            </span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-semibold text-zinc-100 tracking-tight">
              Pay Once. Own Forever.
            </h2>
            <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
              No recurring SaaS monthly fees. No seat licenses. No surprise overage charges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {/* Free Tier */}
            <div className="border border-zinc-800 bg-[#09090b] p-6 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-zinc-100">Community</h3>
                  <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                    Free
                  </span>
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-mono font-bold text-zinc-100">$0</span>
                  <span className="text-xs text-zinc-500">/ forever</span>
                </div>

                <p className="mt-2 text-zinc-400 text-xs leading-relaxed">
                  For indie developers & open-source builders.
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-zinc-400">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-200 shrink-0" />
                    <span>Unlimited walkthrough recordings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-200 shrink-0" />
                    <span>100% Local IndexedDB offline storage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-200 shrink-0" />
                    <span>React + Tailwind component code export</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-200 shrink-0" />
                    <span>3KB vanilla embed script export</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-200 shrink-0" />
                    <span>Standard 1080p (30fps) MP4 exports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-200 shrink-0" />
                    <span>Subtle "Made with FlowTour" watermark on videos</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <a
                  href={CHROME_STORE_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => posthog.capture('clicked_install_chrome_store')}
                  className="w-full h-9 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Install Extension (Free)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Pro Lifetime Tier */}
            <div className="border border-zinc-800 bg-[#09090b] p-6 rounded-xl flex flex-col justify-between relative shadow-xl">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-zinc-100">Pro Lifetime</h3>
                  <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-medium">
                    One-Time
                  </span>
                </div>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-bold text-zinc-100">$19</span>
                  <span className="text-xs font-mono text-zinc-500 line-through">$99</span>
                  <span className="text-[11px] font-mono text-zinc-400">Early adopter</span>
                </div>

                <p className="mt-2 text-zinc-400 text-xs leading-relaxed">
                  For creators, SaaS founders, and agencies.
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-zinc-300">
                  <li className="flex items-center gap-2 font-medium text-zinc-200">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Everything in Free, plus:</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Clean exports (No FlowTour Watermark)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Custom brand logo overlay on videos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>60fps WebCodecs Ultra-HD 4K video engine</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Custom camera zoom curves & focus controls</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Lifetime updates & priority roadmap input</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <a
                  href={dodoCheckoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => posthog.capture('clicked_pro_lifetime_checkout')}
                  className="w-full h-9 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <span>Get Lifetime Access — $19</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
                <p className="text-center text-[10px] text-zinc-500 mt-2 font-mono">
                  14-day money-back guarantee. No questions asked.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            7. FOOTER
        -------------------------------------------------------------- */}
        <footer className="border-t border-zinc-800/80 py-12 px-4 sm:px-6 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-zinc-500 font-mono">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                <img src="/icon.png" alt="FlowTour" className="w-4 h-4 object-contain" />
              </div>
              <span className="font-semibold text-zinc-300 font-sans">FlowTour</span>
              <span className="text-zinc-600">/</span>
              <span>Workflow Recorder</span>
            </div>

            <div className="flex items-center gap-5">
              <a href="#features" className="hover:text-zinc-300 transition-colors">
                Features
              </a>
              <a href="#demo" className="hover:text-zinc-300 transition-colors">
                Demo
              </a>
              <a href="#comparison" className="hover:text-zinc-300 transition-colors">
                Comparison
              </a>
              <a href="#pricing" className="hover:text-zinc-300 transition-colors">
                Pricing
              </a>
              <a href="/privacy" className="hover:text-zinc-300 transition-colors">
                Privacy
              </a>
              <a
                href={PRODUCT_HUNT_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => posthog.capture('clicked_product_hunt_footer')}
                className="hover:text-zinc-300 transition-colors"
              >
                Product Hunt
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="hover:text-zinc-300 transition-colors"
              >
                GitHub
              </a>
            </div>

            <div>
              © {new Date().getFullYear()} FlowTour. Built by Naveen Guru.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
