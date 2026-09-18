# Architecture Decision Record (ADR): FlowTour Licensing Engine

## Status
**ACCEPTED**

## Context
FlowTour is a zero-backend, 100% client-side Chrome Extension for creating auto-zooming interactive product walkthroughs. We are launching a **$19 One-Time Lifetime Pro Access tier**.

The team evaluated four potential architectures:
1. **Traditional Auth (Supabase / Firebase / NextAuth)**
2. **Web Domain Cookies**
3. **Manual License Keys**
4. **1-Click Chrome Profile Handshake (`externally_connectable` + `chrome.storage.sync`)**

---

## Decision Matrix & Deep Dive

### Option 1: Traditional User Accounts & Auth
- **Concept**: User creates an account on `flowtour.dev` with an email and password. Extension communicates with a PostgreSQL database via JWT tokens.
- **Pros**: Familiar SaaS user experience.
- **Why Rejected**:
  - **High Infrastructure Overhead**: Monthly server & database costs ($25-$100/mo minimum) for a product intended to run at $0 burn rate.
  - **Massive Friction**: Users installing a Chrome extension hate filling out registration forms, verifying emails, and dealing with forgotten passwords.
  - **GDPR / CCPA / PII Burden**: Storing emails and passwords requires strict security audits, password hashing, and privacy disclosures on the Chrome Web Store.

### Option 2: Domain Cookies
- **Concept**: After paying on `flowtour.dev`, a cookie like `flowtour_pro=true` is set on the domain. The extension reads the cookie.
- **Pros**: Seems straightforward at first glance.
- **Why Rejected**:
  - **Sandbox Isolation**: Chrome Extensions run in isolated sandboxes (`chrome-extension://[id]`). They cannot access web cookies by default.
  - **Store Warning Rejections**: Reading domain cookies requires requesting the invasive `"cookies"` permission and host permissions. Chrome Web Store displays a scary warning: *"This extension can read your browsing history and data on flowtour.dev"*, destroying conversion rates.
  - **Fragility**: Users clearing browser cache, private windows, or Chrome's third-party cookie restrictions frequently wipe the entitlement.

### Option 3: Manual License Keys
- **Concept**: Dodo Payments generates a key, customer copies it from their receipt email, opens extension settings, and pastes it.
- **Pros**: 100% zero backend, simple to implement.
- **Why Incomplete as Primary Flow**:
  - Requires user to switch between email tab and extension tab.
  - Users lose license emails or mistype keys.
  - Only stored on local machine's disk (`chrome.storage.local`), so when they open their second computer, they are back on Free until they hunt down the email again.

### Option 4: 1-Click Chrome Account Sync (Selected Approach)
- **Concept**: Combine Dodo Payments checkout with Chrome's native `externally_connectable` API and `chrome.storage.sync`.
- **How it works**:
  1. Buyer checks out on Dodo Payments.
  2. Dodo redirects to `https://flowtour.dev/success?key=XYZ`.
  3. The success page immediately messages the extension in 1ms.
  4. Extension stores `isProLicense: true` in `chrome.storage.sync`.
  5. Chrome natively replicates this entitlement across all computers signed into that user's Chrome Profile!
- **Fallback**: The manual license key box is retained in Settings purely as a backup/restore tool.

---

## Consequences
- **Positive**: Zero recurring server bills ($0 infrastructure cost forever).
- **Positive**: Instant gratification — customer pays and extension is already Pro before they even switch tabs.
- **Positive**: Multi-device sync across user's laptops via Google's cloud.
- **Negative**: Relies on Chrome Web Store extension ID remaining consistent (handled via stable manifest key).
