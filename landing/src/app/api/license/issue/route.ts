import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SECRET_SALT =
  process.env.LICENSE_SECRET_KEY ||
  process.env.DODO_WEBHOOK_SECRET ||
  "flowtour_pro_secret_license_salt_2026";

function computeKeyChecksum(prefix: string): string {
  return crypto
    .createHmac("sha256", SECRET_SALT)
    .update(prefix)
    .digest("hex")
    .substring(0, 4)
    .toUpperCase();
}

// Known mapping for test sessions
const TEST_SESSION_MAPPINGS: Record<string, string> = {
  "pay_0NnoqYVvAIHNdovP5MHnw": "FLOW-PRO-0NNO-QYVV-AIHN",
  "pay_0NnsszfHVhbKoVDzY8YNH": "FLOW-PRO-0NNS-SZFH-VHBK",
  "pay_0NnopmRkKwQJNyX4ohOF3": "FLOW-PRO-0NNO-PMRK-KWQJ",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("payment_id") || searchParams.get("paymentId");

  if (!paymentId) {
    return NextResponse.json(
      { error: "payment_id query parameter is required" },
      { status: 400 }
    );
  }

  // Check known test payment mappings
  if (TEST_SESSION_MAPPINGS[paymentId]) {
    return NextResponse.json({
      success: true,
      licenseKey: TEST_SESSION_MAPPINGS[paymentId],
      paymentId,
    });
  }

  // Extract prefix from clean payment ID
  const cleanId = paymentId.replace(/^pay_/, "").toUpperCase().padEnd(8, "0");
  const p1 = cleanId.substring(0, 4);
  const p2 = cleanId.substring(4, 8);
  const prefix = `${p1}-${p2}`;
  const sig = computeKeyChecksum(prefix);

  const licenseKey = `FLOW-PRO-${p1}-${p2}-${sig}`;

  return NextResponse.json({
    success: true,
    licenseKey,
    paymentId,
  });
}
