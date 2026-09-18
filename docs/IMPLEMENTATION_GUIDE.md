# Implementation Guide: 1-Click Chrome Account Sync

This guide provides drop-in code for implementing the handshake between Dodo Payments, the FlowTour landing page, and the FlowTour Chrome Extension.

---

## 1. Extension Manifest Configuration (`public/manifest.json`)

Add the `externally_connectable` block so the browser allows your landing page to communicate with the extension:

```json
{
  "manifest_version": 3,
  "name": "FlowTour — Interactive Demo & Video Walkthrough Engine",
  "version": "1.0.1",
  "permissions": [
    "storage",
    "sidePanel",
    "activeTab",
    "scripting"
  ],
  "externally_connectable": {
    "matches": [
      "https://flowtour.dev/*",
      "https://*.flowtour.dev/*",
      "http://localhost:3000/*"
    ]
  }
}
```

---

## 2. Background Service Worker Listener (`src/background/service_worker.ts`)

Handle incoming handshake messages from the landing page:

```typescript
// src/background/service_worker.ts

chrome.runtime.onMessageExternal.addListener(
  async (message, sender, sendResponse) => {
    // 1. Verify Origin Security
    const origin = sender.url ? new URL(sender.url).origin : '';
    const isAllowed =
      origin === 'https://flowtour.dev' ||
      origin.endsWith('.flowtour.dev') ||
      origin === 'http://localhost:3000';

    if (!isAllowed) {
      sendResponse({ success: false, error: 'Unauthorized origin' });
      return;
    }

    // 2. Handle Activation
    if (message.type === 'ACTIVATE_PRO_LICENSE' && message.licenseKey) {
      try {
        const cleanKey = String(message.licenseKey).trim();

        // Save to chrome.storage.sync (Tied to user's personal Google Chrome Account)
        await chrome.storage.sync.set({
          isProLicense: true,
          licenseKey: cleanKey,
          activatedAt: Date.now(),
        });

        // Also update local cache for instant offline access
        await chrome.storage.local.set({
          isProLicense: true,
          licenseKey: cleanKey,
        });

        sendResponse({ success: true, message: 'Pro Lifetime Activated' });
      } catch (err: any) {
        sendResponse({ success: false, error: err.message || String(err) });
      }
    }
    return true; // Keep message channel open for async response
  }
);
```

---

## 3. Landing Page Success Route (`landing/src/app/success/page.tsx`)

When Dodo Payments redirects back to `/success?key=...`, automatically ping the extension:

```typescript
"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// Your published Chrome Extension ID
const FLOWTOUR_EXTENSION_ID = "emaghcilmigcakcnnfonmgbfcddhikki";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key") || searchParams.get("license_key") || "";
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    if (!key) return;

    // Check if Chrome extension API is available in current browser
    if (typeof window !== "undefined" && (window as any).chrome?.runtime?.sendMessage) {
      try {
        (window as any).chrome.runtime.sendMessage(
          FLOWTOUR_EXTENSION_ID,
          {
            type: "ACTIVATE_PRO_LICENSE",
            licenseKey: key,
          },
          (response: any) => {
            if (response && response.success) {
              setIsActivated(true);
            }
          }
        );
      } catch (e) {
        console.log("Extension handshake fallback to manual copy:", e);
      }
    }
  }, [key]);

  return (
    <div className="p-6 max-w-lg mx-auto text-center">
      {isActivated ? (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl">
          <h2 className="font-bold text-base">⚡ FlowTour Pro Activated!</h2>
          <p className="text-xs text-zinc-300 mt-1">
            Your Chrome extension has been upgraded automatically. Enjoy unlimited 4K 60fps exports!
          </p>
        </div>
      ) : (
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <p className="text-xs text-zinc-400">Your Pro License Key:</p>
          <code className="text-sm font-mono font-bold text-white block mt-2">{key}</code>
        </div>
      )}
    </div>
  );
}
```

---

## 4. Extension Settings Modal Hydration

Update the extension to hydrate from `chrome.storage.sync` on startup with `chrome.storage.local` fallback:

```typescript
// Retrieve license status on mount
chrome.storage.sync.get(['isProLicense', 'licenseKey'], (syncData) => {
  if (syncData && syncData.isProLicense) {
    setIsPro(true);
    setKey(syncData.licenseKey);
  } else {
    // Fallback to local
    chrome.storage.local.get(['isProLicense', 'licenseKey'], (localData) => {
      if (localData && localData.isProLicense) {
        setIsPro(true);
        setKey(localData.licenseKey);
      }
    });
  }
});
```
