"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Key,
  Zap,
  RefreshCw,
  ExternalLink,
  Laptop,
} from "lucide-react";

// Official published Chrome Web Store extension ID
const DEFAULT_EXTENSION_ID = "emaghcilmigcakcnnfonmgbfcddhikki";

function SuccessContent() {
  const searchParams = useSearchParams();

  // Read query params from Dodo Payments redirect or manual test URL
  const queryKey =
    searchParams.get("key") ||
    searchParams.get("license_key") ||
    searchParams.get("licenseKey") ||
    "";
  const paymentId =
    searchParams.get("payment_id") ||
    searchParams.get("paymentId") ||
    searchParams.get("session_id") ||
    "";
  const customExtId =
    searchParams.get("ext_id") ||
    searchParams.get("extension_id") ||
    process.env.NEXT_PUBLIC_FLOWTOUR_EXTENSION_ID ||
    DEFAULT_EXTENSION_ID;

  const [licenseKey, setLicenseKey] = useState<string>(queryKey);
  const [extensionId, setExtensionId] = useState<string>(customExtId);
  const [copied, setCopied] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "fallback">("idle");
  const [syncError, setSyncError] = useState<string | null>(null);

  // Initialize or generate deterministic key if not supplied by Dodo Payments URL
  useEffect(() => {
    if (queryKey) {
      setLicenseKey(queryKey);
    } else if (!licenseKey) {
      if (paymentId) {
        // Derive clean deterministic key from Dodo payment ID
        const cleanId = paymentId.replace(/^pay_/, "").toUpperCase().padEnd(12, "0");
        const k1 = cleanId.substring(0, 4);
        const k2 = cleanId.substring(4, 8);
        const k3 = cleanId.substring(8, 12);
        setLicenseKey(`FLOW-PRO-${k1}-${k2}-${k3}`);
      } else {
        const randomHex = () =>
          Math.random().toString(36).substring(2, 6).toUpperCase();
        const fallbackKey = `FLOW-PRO-${randomHex()}-${randomHex()}-${randomHex()}`;
        setLicenseKey(fallbackKey);
      }
    }
  }, [queryKey, paymentId, licenseKey]);

  // Attempt 1-Click handshake with FlowTour Chrome extension
  const attemptHandshake = useCallback(
    async (keyToActivate: string, targetExtId: string) => {
      if (!keyToActivate) return;

      // Check if browser has Chrome extension runtime available
      const hasChromeExtensionApi =
        typeof window !== "undefined" &&
        typeof (window as any).chrome !== "undefined" &&
        typeof (window as any).chrome.runtime !== "undefined" &&
        typeof (window as any).chrome.runtime.sendMessage === "function";

      if (!hasChromeExtensionApi) {
        console.log("[FlowTour Sync] Not running inside Chrome with extension API. Falling back to manual activation.");
        setSyncStatus("fallback");
        return;
      }

      setSyncStatus("syncing");
      setSyncError(null);

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Handshake timed out")), 2000)
        );

        const sendPromise = new Promise<any>((resolve, reject) => {
          (window as any).chrome.runtime.sendMessage(
            targetExtId,
            {
              type: "ACTIVATE_PRO_LICENSE",
              payload: {
                licenseKey: keyToActivate,
                paymentId: paymentId || undefined,
              },
            },
            (response: any) => {
              const lastErr = (window as any).chrome.runtime?.lastError;
              if (lastErr) {
                reject(new Error(lastErr.message || "Extension not reachable"));
              } else {
                resolve(response);
              }
            }
          );
        });

        const response: any = await Promise.race([sendPromise, timeoutPromise]);

        if (response && response.success) {
          console.log("[FlowTour Sync] 1-Click Chrome Account Sync succeeded:", response);
          setSyncStatus("synced");
        } else {
          console.warn("[FlowTour Sync] Handshake returned failure:", response);
          setSyncError(response?.error || "Extension returned error");
          setSyncStatus("fallback");
        }
      } catch (err: any) {
        console.info(
          "[FlowTour Sync] Extension handshake attempt did not connect (normal if extension is not installed on this browser profile):",
          err?.message
        );
        setSyncError(err?.message || null);
        setSyncStatus("fallback");
      }
    },
    [paymentId]
  );

  // Trigger automatic handshake as soon as key is determined
  useEffect(() => {
    if (licenseKey) {
      attemptHandshake(licenseKey, extensionId);
    }
  }, [licenseKey, extensionId, attemptHandshake]);

  const handleCopy = () => {
    if (!licenseKey) return;
    navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleManualRetry = () => {
    if (licenseKey) {
      attemptHandshake(licenseKey, extensionId);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-grid-pattern">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-b from-indigo-500/20 via-cyan-500/10 to-transparent blur-3xl pointer-events-none -z-10" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl glass-panel rounded-3xl p-6 sm:p-10 border-indigo-500/30 shadow-2xl relative"
      >
        {/* Top Header Badge & Celebration Icon */}
        <AnimatePresence mode="wait">
          {syncStatus === "synced" ? (
            <motion.div
              key="synced-header"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 p-[2px] mx-auto shadow-lg shadow-emerald-500/30 animate-pulse">
                <div className="w-full h-full bg-[#0D1322] rounded-[14px] flex items-center justify-center">
                  <Zap className="w-8 h-8 text-emerald-400" />
                </div>
              </div>

              <div className="mt-6">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-950/70 px-3.5 py-1 rounded-full border border-emerald-500/30 shadow-inner">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  1-Click Chrome Sync Complete
                </span>
                <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Extension <span className="text-gradient">Activated!</span>
                </h1>
                <p className="mt-2 text-sm text-emerald-200/90 leading-relaxed max-w-md mx-auto">
                  Your FlowTour extension was automatically detected and upgraded to Pro Lifetime. All 4K exports and branding controls are unlocked now.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="general-header"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 p-[2px] mx-auto shadow-lg shadow-indigo-500/30">
                <div className="w-full h-full bg-[#0D1322] rounded-[14px] flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-cyan-400" />
                </div>
              </div>

              <div className="mt-6">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Payment Completed
                </span>
                <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Welcome to <span className="text-gradient">FlowTour Pro</span>!
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  Thank you for purchasing lifetime access. Unlocked unlimited 4K 60fps auto-zoom video exports and custom themes forever.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1-Click Sync Banner or Active State */}
        {syncStatus === "synced" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3.5"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xs space-y-1">
              <div className="font-semibold text-emerald-300">Synced to Google Chrome Account</div>
              <p className="text-slate-300 leading-relaxed">
                Your license is synchronized across all your Chrome browsers using your Google profile. Open the FlowTour Side Panel on any device and start exporting.
              </p>
            </div>
          </motion.div>
        )}

        {/* License Key Card */}
        <div className="mt-6 bg-[#070A12] border border-white/10 rounded-2xl p-5 shadow-inner">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <Key className="w-4 h-4 text-cyan-400" />
              <span>Lifetime License Key</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                syncStatus === "synced"
                  ? "bg-emerald-950 text-emerald-400 border-emerald-500/30"
                  : "bg-green-950 text-green-400 border-green-500/30"
              }`}
            >
              {syncStatus === "synced" ? "Active • Synced" : "Active Lifetime"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 bg-[#0D1322] border border-cyan-500/30 rounded-xl px-4 py-3">
            <code className="text-base sm:text-lg font-mono font-bold text-cyan-300 tracking-wider select-all truncate">
              {licenseKey || "GENERATING-KEY..."}
            </code>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black transition-colors shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Key</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Keep this key for your records or manual restorations.</span>
            {syncStatus !== "synced" && (
              <button
                type="button"
                onClick={handleManualRetry}
                disabled={syncStatus === "syncing"}
                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                <span>{syncStatus === "syncing" ? "Syncing..." : "Retry 1-Click Sync"}</span>
              </button>
            )}
          </div>

          {syncStatus !== "synced" && (
            <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-col sm:flex-row items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 shrink-0">Local Dev Extension ID:</span>
              <input
                type="text"
                value={extensionId}
                onChange={(e) => setExtensionId(e.target.value.trim())}
                placeholder="Paste unpacked ID from chrome://extensions"
                className="w-full bg-[#0D1322] border border-white/10 rounded px-2.5 py-1 text-[11px] font-mono text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
              />
              <button
                type="button"
                onClick={handleManualRetry}
                className="w-full sm:w-auto px-3 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 transition-colors shrink-0 cursor-pointer"
              >
                Connect & Sync
              </button>
            </div>
          )}
        </div>

        {/* Fallback 3-Step Manual Activation Guide (When not auto-synced) */}
        {syncStatus !== "synced" && (
          <div className="mt-8 pt-6 border-t border-white/10">
            <h2 className="text-xs uppercase font-bold tracking-widest text-indigo-400 font-mono mb-4 flex items-center gap-2">
              <Laptop className="w-4 h-4" />
              <span>How to Activate Your FlowTour Extension</span>
            </h2>
            <div className="space-y-3.5 text-xs sm:text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-mono font-bold text-white shrink-0">
                  1
                </div>
                <p>
                  Open Google Chrome and launch the <strong>FlowTour</strong> Side Panel from your extensions bar.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-mono font-bold text-white shrink-0">
                  2
                </div>
                <p>
                  Click the <strong>Settings (gear icon)</strong> in the top header or <strong>Activate Pro</strong> in Video Export.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-mono font-bold text-white shrink-0">
                  3
                </div>
                <p>
                  Paste your lifetime key <strong>{licenseKey ? `(${licenseKey.substring(0, 8)}...)` : ""}</strong> and click <strong>Activate</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/10">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors order-2 sm:order-1"
          >
            <span>Return to FlowTour Homepage</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>

          {syncStatus === "synced" && (
            <div className="order-1 sm:order-2">
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ready to record in Chrome Side Panel</span>
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090D16] flex items-center justify-center text-slate-400 font-mono text-sm">
          Loading order details...
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}

