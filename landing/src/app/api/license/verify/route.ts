import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";

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

// In-memory rate limiting map: ip -> { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (record.count >= 5) {
    return true;
  }
  record.count += 1;
  return false;
}

// Persistent / In-memory account binding store: Map<key, accountId>
const accountBindings = new Map<string, string>();
const BINDINGS_FILE = path.join(process.cwd(), ".data", "account_bindings.json");

// Load existing bindings if file exists
try {
  if (fs.existsSync(BINDINGS_FILE)) {
    const data = JSON.parse(fs.readFileSync(BINDINGS_FILE, "utf8"));
    for (const [k, v] of Object.entries(data)) {
      accountBindings.set(k, v as string);
    }
  }
} catch {
  // Ignore filesystem errors in read-only / serverless runtimes
}

function getBoundAccount(key: string): string | null {
  return accountBindings.get(key) || null;
}

function bindAccountToKey(key: string, accountId: string): void {
  accountBindings.set(key, accountId);
  try {
    const dir = path.dirname(BINDINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      BINDINGS_FILE,
      JSON.stringify(Object.fromEntries(accountBindings), null, 2),
      "utf8"
    );
  } catch {
    // Ignore filesystem persistence errors
  }
}

/**
 * Sign a payload using HMAC-SHA256 creating a standard compact JWT
 */
function signPayload(
  payload: { key: string; accountId: string; exp: number; plan: string },
  secret: string
): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url"
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

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

// GET /api/license/verify?key=...&accountId=...
export async function GET(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      {
        valid: false,
        error: "RATE_LIMIT_EXCEEDED",
        message: "Too many verification attempts. Please try again in a minute.",
      },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key")?.trim().toUpperCase();
  const accountId = (
    searchParams.get("accountId") ||
    searchParams.get("account_id") ||
    ""
  ).trim();

  if (!key) {
    return NextResponse.json(
      {
        valid: false,
        error: "INVALID_KEY",
        message: "License key parameter 'key' is required.",
      },
      { status: 400 }
    );
  }

  const result = await verifyLicenseKey(key);

  if (!result.valid) {
    return NextResponse.json(
      {
        valid: false,
        error: "INVALID_KEY",
        message: result.reason || "Invalid license key format.",
      },
      { status: 400 }
    );
  }

  // Check Account Binding if accountId provided
  if (accountId) {
    const bound = getBoundAccount(key);
    if (bound && bound !== accountId) {
      return NextResponse.json(
        {
          valid: false,
          error: "KEY_BOUND_TO_ANOTHER_ACCOUNT",
          message: "This license key is linked to a different Chrome account.",
        },
        { status: 403 }
      );
    }
    if (!bound) {
      bindAccountToKey(key, accountId);
    }
  }

  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30-day token lifetime
  const proToken = signPayload(
    {
      key,
      accountId: accountId || "unbound-device",
      exp,
      plan: result.plan || "pro_lifetime",
    },
    SECRET_SALT
  );

  return NextResponse.json({
    valid: true,
    proToken,
    exp,
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

// POST /api/license/verify body: { "key": "...", "accountId": "..." }
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      {
        valid: false,
        error: "RATE_LIMIT_EXCEEDED",
        message: "Too many verification attempts. Please try again in a minute.",
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const rawKey = body.key || body.license_key || body.licenseKey;
    const key = typeof rawKey === "string" ? rawKey.trim().toUpperCase() : "";
    const accountId = (
      body.accountId ||
      body.account_id ||
      ""
    ).trim();

    if (!key) {
      return NextResponse.json(
        {
          valid: false,
          error: "INVALID_KEY",
          message: "License key is required in request body.",
        },
        { status: 400 }
      );
    }

    const result = await verifyLicenseKey(key);

    if (!result.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: "INVALID_KEY",
          message: result.reason || "Invalid license key format.",
        },
        { status: 400 }
      );
    }

    // Check Account Binding if accountId provided
    if (accountId) {
      const bound = getBoundAccount(key);
      if (bound && bound !== accountId) {
        return NextResponse.json(
          {
            valid: false,
            error: "KEY_BOUND_TO_ANOTHER_ACCOUNT",
            message: "This license key is linked to a different Chrome account.",
          },
          { status: 403 }
        );
      }
      if (!bound) {
        bindAccountToKey(key, accountId);
      }
    }

    const exp = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30-day token lifetime
    const proToken = signPayload(
      {
        key,
        accountId: accountId || "unbound-device",
        exp,
        plan: result.plan || "pro_lifetime",
      },
      SECRET_SALT
    );

    return NextResponse.json({
      valid: true,
      proToken,
      exp,
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
  } catch {
    return NextResponse.json(
      { valid: false, error: "BAD_REQUEST", message: "Invalid JSON request body." },
      { status: 400 }
    );
  }
}
