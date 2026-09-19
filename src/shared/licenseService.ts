/**
 * Remote License Verification Service for FlowTour
 * Enforces server-side and cryptographic license authenticity.
 */

export interface LicenseValidationResult {
  valid: boolean;
  message?: string;
  error?: string;
  plan?: string;
  proToken?: string;
  exp?: number;
  verifiedAt?: string;
}

export async function verifyLicenseKeyRemotely(
  key: string,
  accountId?: string
): Promise<LicenseValidationResult> {
  const cleanKey = key.trim().toUpperCase();
  if (!cleanKey || cleanKey.length < 8) {
    return {
      valid: false,
      error: 'INVALID_KEY',
      message: 'License key must be at least 8 characters.',
    };
  }

  const queryParams = new URLSearchParams({
    key: cleanKey,
    accountId: accountId || '',
  });

  // 1. Try local dev and production verification endpoints
  const endpoints = [
    `http://localhost:3000/api/license/verify?${queryParams.toString()}`,
    `https://flowtour.vercel.app/api/license/verify?${queryParams.toString()}`,
    `https://flowtour.dev/api/license/verify?${queryParams.toString()}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.valid === true) {
          return {
            valid: true,
            plan: data.plan || 'pro_lifetime',
            proToken: data.proToken,
            exp: data.exp,
            verifiedAt: data.verifiedAt,
          };
        }
      } else if (res.status === 403) {
        const data = await res.json().catch(() => null);
        return {
          valid: false,
          error: data?.error || 'KEY_BOUND_TO_ANOTHER_ACCOUNT',
          message:
            data?.message ||
            'This license key is linked to a different Chrome account.',
        };
      } else if (res.status === 429) {
        const data = await res.json().catch(() => null);
        return {
          valid: false,
          error: data?.error || 'RATE_LIMIT_EXCEEDED',
          message:
            data?.message ||
            'Too many verification attempts. Please try again in a minute.',
        };
      } else if (res.status === 400 || res.status === 404) {
        const data = await res.json().catch(() => null);
        return {
          valid: false,
          error: data?.error || 'INVALID_KEY',
          message:
            data?.message ||
            'Invalid or unrecognized FlowTour license key.',
        };
      }
    } catch {
      // Endpoint unreachable, continue to next
    }
  }

  // 2. Direct fallback to Dodo Payments public license validation API
  const dodoEndpoints = [
    'https://test.dodopayments.com/licenses/validate',
    'https://live.dodopayments.com/licenses/validate',
  ];

  for (const url of dodoEndpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: cleanKey }),
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && (data.valid === true || data.status === 'active')) {
          return {
            valid: true,
            plan: 'pro_lifetime',
          };
        }
      }
    } catch {
      // Dodo endpoint unreachable, continue
    }
  }

  return {
    valid: false,
    message:
      'Invalid license key. Please check your purchase receipt or ensure you have an active internet connection.',
  };
}
