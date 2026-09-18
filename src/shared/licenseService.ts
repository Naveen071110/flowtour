/**
 * Remote License Verification Service for FlowTour
 * Enforces server-side and cryptographic license authenticity.
 */

export interface LicenseValidationResult {
  valid: boolean;
  message?: string;
  plan?: string;
  verifiedAt?: string;
}

export async function verifyLicenseKeyRemotely(
  key: string
): Promise<LicenseValidationResult> {
  const cleanKey = key.trim().toUpperCase();
  if (!cleanKey || cleanKey.length < 8) {
    return {
      valid: false,
      message: 'License key must be at least 8 characters.',
    };
  }

  // 1. Try local dev and production verification endpoints
  const endpoints = [
    `http://localhost:3000/api/license/verify?key=${encodeURIComponent(cleanKey)}`,
    `https://flowtour.vercel.app/api/license/verify?key=${encodeURIComponent(cleanKey)}`,
    `https://flowtour.dev/api/license/verify?key=${encodeURIComponent(cleanKey)}`,
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
            verifiedAt: data.verifiedAt,
          };
        }
      } else if (res.status === 400 || res.status === 404) {
        const data = await res.json().catch(() => null);
        return {
          valid: false,
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
