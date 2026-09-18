# Security, Anti-Abuse & Technical FAQ

### Q1: What stops another website from sending fake activation messages?
Chrome strictly enforces origin isolation via the `externally_connectable` whitelist in `manifest.json`. If a malicious website (e.g. `evil-site.com`) calls `chrome.runtime.sendMessage(EXTENSION_ID, ...)`, the browser immediately blocks the message before it ever reaches your code. Additionally, the service worker validates `sender.url` origin before executing any storage write.

---

### Q2: What if a user buys FlowTour on Safari or on their phone?
The Dodo Payments success redirect still passes `?key=FLOW-PRO-XXXX` and sends the key via email. If the customer opens the success page on a browser without the FlowTour extension installed, the page gracefully displays the license key card with a 1-click **"Copy Key"** button and simple 3-step instructions on how to paste it into the FlowTour extension settings on their computer.

---

### Q3: What if someone shares their license key with 50 people?
For v1 early adopter sales ($19 lifetime), software piracy risk is negligible. However, when scaling:
1. **Dodo Payments Activation Limits**: Dodo provides an built-in activation quota per license key (e.g. max 3 concurrent activations).
2. **Optional Edge Verification**: A 15-line Cloudflare Worker or Next.js API route can verify the key against Dodo Payments:
   ```typescript
   const res = await fetch(`https://api.dodopayments.com/license-keys/${key}/check`, {
     headers: { Authorization: `Bearer ${DODO_API_KEY}` }
   });
   ```

---

### Q4: Does `chrome.storage.sync` work offline?
**Yes.** Google Chrome maintains a persistent local SQLite replica on the user's hard drive. When the computer is offline (e.g. in flight), FlowTour reads the stored `isProLicense: true` immediately without waiting for an internet connection. When the user reconnects to Wi-Fi, Chrome synchronizes changes silently in the background.

---

### Q5: What is the storage limit of `chrome.storage.sync`?
Chrome provides 100 KB total quota for sync storage, with 8 KB per individual key item. Our license payload is under 200 bytes (`isProLicense: true`, `licenseKey: "..."`), consuming less than 0.2% of the available quota.
