import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Known verified test session payments from Dodo Payments checkout testing
const VERIFIED_TEST_KEYS = new Set([
  "FLOW-PRO-0NNO-QYVV-AIHN", // pay_0NnoqYVvAIHNdovP5MHnw
  "FLOW-PRO-0NNS-SZFH-VHBK", // pay_0NnsszfHVhbKoVDzY8YNH
  "FLOW-PRO-0NNO-PMRK-KWQJ", // pay_0NnopmRkKwQJNyX4ohOF3
]);

const SECRET_SALT =
  process.env.LICENSE_SECRET_KEY ||
  process.env.DODO_WEBHOOK_SECRET ||
  "flowtour_pro_secret_license_salt_2026";

/**
 * Compute 4-character HMAC-SHA256 checksum for a key prefix
 */
function computeKeyChecksum(prefix: string): string {
  return crypto
    .createHmac("sha256", SECRET_SALT)
    .update(prefix)
    .digest("hex")
    .substring(0, 4)
    .toUpperCase();
}

/**
 * Validate with Dodo Payments Native License API (Public endpoint, zero-auth)
 */
async function validateWithDodoLicenseApi(licenseKey: string): Promise<boolean> {
  const endpoints = [
    "https://test.dodopayments.com/licenses/validate",
    "https://live.dodopayments.com/licenses/validate",
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license_key: licenseKey }),
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && (data.valid === true || data.status === "active")) {
          return true;
        }
      }
    } catch {
      // Continue to next endpoint or fallback checks
    }
  }
  return false;
}

/**
 * Verify payment status with Dodo Payments API if API key is configured
 */
async function verifyDodoPaymentApi(paymentPrefix: string): Promise<boolean> {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) return false;

  const mode = process.env.DODO_PAYMENTS_MODE === "live" ? "live" : "test";
  const baseUrl = `https://${mode}.dodopayments.com`;

  try {
    const res = await fetch(`${baseUrl}/payments/pay_${paymentPrefix.toLowerCase()}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const payment = await res.json().catch(() => null);
      if (payment && (payment.status === "succeeded" || payment.status === "paid")) {
        return true;
      }
    }
  } catch {
    // Graceful fallback
  }
  return false;
}

/**
 * Core validation logic for any submitted license key
 */
async function verifyLicenseKey(
  key: string
): Promise<{ valid: boolean; reason?: string; plan?: string }> {
  const cleanKey = key.trim().toUpperCase();

  if (!cleanKey || cleanKey.length < 8) {
    return { valid: false, reason: "License key is missing or too short." };
  }

  // Check 1: Whitelist of known verified test session payments
  if (VERIFIED_TEST_KEYS.has(cleanKey)) {
    return { valid: true, plan: "pro_lifetime" };
  }

  // Check 2: Dodo Payments official public license validation API
  const isValidInDodo = await validateWithDodoLicenseApi(cleanKey);
  if (isValidInDodo) {
    return { valid: true, plan: "pro_lifetime" };
  }

  // Check 3: Cryptographic HMAC-SHA256 signature check for FLOW-PRO-XXXX-XXXX-SIG
  const hmacMatch = cleanKey.match(/^FLOW-PRO-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$/);
  if (hmacMatch) {
    const [, p1, p2, sig] = hmacMatch;
    const prefix = `${p1}-${p2}`;
    const expectedSig = computeKeyChecksum(prefix);

    try {
      if (
        sig.length === expectedSig.length &&
        crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
      ) {
        return { valid: true, plan: "pro_lifetime" };
      }
    } catch {
      // Ignore timingSafeEqual length errors
    }

    // Check 4: Check if prefix corresponds to an active Dodo payment
    const paymentPrefix = `${p1}${p2}`;
    const isPaymentValid = await verifyDodoPaymentApi(paymentPrefix);
    if (isPaymentValid) {
      return { valid: true, plan: "pro_lifetime" };
    }
  }

  return { valid: false, reason: "Invalid or unrecognized FlowTour license key." };
}

// GET /api/license/verify?key=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json(
      { valid: false, message: "License key parameter 'key' is required." },
      { status: 400 }
    );
  }

  const result = await verifyLicenseKey(key);

  if (result.valid) {
    return NextResponse.json({
      valid: true,
      plan: result.plan || "pro_lifetime",
      status: "active",
      features: {
        resolution_4k: true,
        fps_60: true,
        no_watermark: true,
        custom_curves: true,
        custom_themes: true,
      },
      verifiedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json(
    {
      valid: false,
      message: result.reason || "Invalid license key. Please check your purchase receipt.",
    },
    { status: 400 }
  );
}

// POST /api/license/verify body: { "key": "..." } or { "license_key": "..." }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const key = body.key || body.license_key || body.licenseKey;

    if (!key) {
      return NextResponse.json(
        { valid: false, message: "License key is required in request body." },
        { status: 400 }
      );
    }

    const result = await verifyLicenseKey(key);

    if (result.valid) {
      return NextResponse.json({
        valid: true,
        plan: result.plan || "pro_lifetime",
        status: "active",
        features: {
          resolution_4k: true,
          fps_60: true,
          no_watermark: true,
          custom_curves: true,
          custom_themes: true,
        },
        verifiedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        valid: false,
        message: result.reason || "Invalid license key. Please check your purchase receipt.",
      },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { valid: false, message: "Invalid JSON request body." },
      { status: 400 }
    );
  }
}
