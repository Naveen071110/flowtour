import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key")?.trim().toUpperCase();

  if (!key) {
    return NextResponse.json({ valid: false, message: "License key is required." }, { status: 400 });
  }

  // Basic format validation for FlowTour Pro Lifetime: FLOW-PRO-XXXX-XXXX-XXXX
  const isValidFormat = /^FLOW-PRO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key) || key.startsWith("FLOW-PRO");

  if (isValidFormat) {
    return NextResponse.json({
      valid: true,
      plan: "pro_lifetime",
      features: {
        resolution_4k: true,
        fps_60: true,
        no_watermark: true,
        custom_curves: true,
        custom_themes: true,
      },
      activatedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json(
    { valid: false, message: "Invalid or unrecognized FlowTour license key." },
    { status: 400 }
  );
}
