# FlowTour Monetization & Chrome Profile Licensing Architecture

> **Architecture Decision Record (ADR) & Technical Whitepaper**  
> **Prepared for**: FlowTour Engineering, Product, and Leadership Team  
> **Status**: Approved Proposal  
> **Version**: 1.0  
> **Date**: September 2026  

---

## 🎯 Executive Overview

FlowTour is introducing a **$19 One-Time Lifetime Pro Access tier** powered by **Dodo Payments**. This repository provides the technical architecture analysis answering three core product and engineering questions:

1. **How do we deliver a zero-friction payment flow** without forcing users to remember accounts or manually copy-paste 24-character strings?
2. **Can we avoid recurring database and auth infrastructure costs** ($0 burn rate) while maintaining security?
3. **Can we tie the purchase to the user's personal Google Chrome account** so that Pro features automatically travel across their desktop and laptop without a login screen?

---

## 📊 Summary Evaluation Matrix

| Metric / Dimension | Option 1: Full Auth (Supabase/Firebase) | Option 2: Domain Cookies | Option 3: Manual License Keys | Option 4: 1-Click Chrome Sync (Recommended) |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Cost** | $25–$100/mo server + DB ops | $0 | $0 | **$0 (100% Serverless)** |
| **User Friction** | **High** (email verify, passwords, reset flows) | **High** (drops pro on cache clear) | **Medium** (copy/paste strings) | **Zero** (1-click automatic background sync) |
| **Cross-Device Sync** | Yes (manual login required) | No (isolated per machine) | No (requires re-pasting key) | **Yes (Automatic via Google Chrome Profile)** |
| **Offline Capability** | Breaks if offline without cached token | Breaks if cookie expires | Works offline | **Works 100% offline** |
| **Privacy Compliance** | Heavy (Stores PII, GDPR/CCPA risk) | Medium | Light (Zero PII stored) | **100% Client-Side / Zero PII stored** |
| **Extension Permissions** | None extra | Invasive (`cookies` + `<all_urls>`) | None extra | None extra (`externally_connectable`) |
| **Maintenance Burden** | High (Auth migrations, DB downtime) | High (Cookie policy breakage) | Very Low | **Zero (Native Chrome Engine)** |

---

## ⚡ The Winning Pattern: 1-Click Chrome Account Sync

The recommended flow combines **Dodo Payments**, Chrome's **`externally_connectable` API**, and **`chrome.storage.sync`**:

```
1. User clicks "Upgrade to Pro ($19)" in FlowTour Side Panel or Landing Page
                                 │
                                 ▼
2. Opens Dodo Payments Hosted Checkout (https://checkout.dodopayments.com/buy/...)
                                 │
                                 ▼
3. Customer completes $19 purchase via credit card / Apple Pay / Google Pay
                                 │
       ┌─────────────────────────┴─────────────────────────┐
       ▼                                                   ▼
4a. Dodo generates unique key                   4b. Redirects to /success?key=FLOW-PRO-XXXX
    (sent via email receipt)                        (hosted on flowtour.dev)
       └─────────────────────────┬─────────────────────────┘
                                 │
                                 ▼
5. Webpage communicates directly with FlowTour Extension via `externally_connectable`
                                 │
                                 ▼
6. Extension saves entitlement to `chrome.storage.sync`
   • Unlocks 4K 60fps & removes watermark in 1 millisecond
   • Automatically replicates to all computers signed into the user's Chrome Profile!
```

---

## 📂 Repository Contents

- [`docs/ARCHITECTURE_DECISION_RECORD.md`](docs/ARCHITECTURE_DECISION_RECORD.md): Detailed comparison of the 4 evaluated options and why Cookies & Traditional Auth were rejected.
- [`docs/IMPLEMENTATION_GUIDE.md`](docs/IMPLEMENTATION_GUIDE.md): Drop-in TypeScript and JSON code for `manifest.json`, background service worker, Next.js success page, and Settings modal.
- [`docs/SECURITY_AND_FAQ.md`](docs/SECURITY_AND_FAQ.md): Analysis of anti-piracy, offline resilience, origin whitelisting, and future scaling.

---

## 🚀 Getting Started for Developers

To run the landing page handshake locally:

```bash
cd landing
npm run dev
# Open http://localhost:3000/success?key=TEST-KEY-1234
```
