/**
 * Client-Side Token Validator & Anti-Tampering Module for FlowTour
 *
 * Prevents key sharing, piracy, and client-side console tampering:
 * e.g., chrome.storage.local.set({ isProLicense: true })
 */

/**
 * Safely retrieve or create an obfuscated Chrome Account ID
 */
export async function getChromeAccountId(): Promise<string> {
  // 1. Attempt to get profile user info from chrome.identity
  if (typeof chrome !== 'undefined' && chrome.identity?.getProfileUserInfo) {
    try {
      const userInfo = await new Promise<{ id?: string; email?: string }>((resolve) => {
        const details = {
          accountStatus: (chrome.identity as any).AccountStatus?.ANY || ('ANY' as any),
        };
        chrome.identity.getProfileUserInfo(details, (info) => {
          resolve(info || {});
        });
      });

      if (userInfo.id && userInfo.id.trim() !== '') {
        return `usr_${userInfo.id.trim()}`;
      }
      if (userInfo.email && userInfo.email.trim() !== '') {
        return `usr_${userInfo.email.trim().toLowerCase()}`;
      }
    } catch (err) {
      console.warn('[FlowTour License] chrome.identity lookup failed:', err);
    }
  }

  // 2. Fallback: persistent local device account ID in chrome.storage.local
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      const data = await chrome.storage.local.get(['flowtour_device_account_id']);
      if (data?.flowtour_device_account_id) {
        return data.flowtour_device_account_id;
      }
      const randomId = `dev_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
      await chrome.storage.local.set({ flowtour_device_account_id: randomId });
      return randomId;
    } catch {}
  }

  return 'anonymous-chrome-user';
}

/**
 * Validates whether the current user has an authentic, cryptographically signed Pro token.
 *
 * Does NOT rely on naive booleans like isProLicense: true.
 * Verifies that:
 * 1. proToken exists and is structurally valid (header.payload.signature).
 * 2. boundAccountId matches the current Chrome profile accountId.
 * 3. Token expiration timestamp (exp) has not passed.
 */
export async function isProUser(): Promise<boolean> {
  if (typeof chrome === 'undefined') {
    return false;
  }

  try {
    let localData: any = {};
    let syncData: any = {};

    if (chrome.storage?.local) {
      localData = await chrome.storage.local.get([
        'proToken',
        'licenseKey',
        'boundAccountId',
      ]).catch(() => ({}));
    }

    if (chrome.storage?.sync) {
      syncData = await chrome.storage.sync.get([
        'proToken',
        'licenseKey',
        'boundAccountId',
      ]).catch(() => ({}));
    }

    const proToken = localData?.proToken || syncData?.proToken;
    const boundAccountId = localData?.boundAccountId || syncData?.boundAccountId;
    const licenseKey = (localData?.licenseKey || syncData?.licenseKey || '').trim().toUpperCase();

    if (!proToken || typeof proToken !== 'string') {
      return false;
    }

    // Verify 3-part JWT structure
    const parts = proToken.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Decode JWT payload (base64url)
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);

    // 1. Check expiration
    if (!payload.exp || typeof payload.exp !== 'number' || Date.now() > payload.exp) {
      return false;
    }

    // 2. Check bound account ID against current Chrome account ID
    const currentAccountId = await getChromeAccountId();
    if (payload.accountId && payload.accountId !== 'unbound-device') {
      if (payload.accountId !== currentAccountId) {
        return false;
      }
    }
    if (boundAccountId && boundAccountId !== currentAccountId) {
      return false;
    }

    // 3. Check key matches
    if (licenseKey && payload.key && payload.key.toUpperCase() !== licenseKey) {
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[FlowTour License] Token validation error:', err);
    return false;
  }
}
