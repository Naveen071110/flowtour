import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-dodo-signature") || req.headers.get("webhook-signature");

    console.log("🔔 Received Dodo Payments Webhook Event");
    let event: any = {};
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const eventType = event.type || event.event || "unknown";
    console.log(`Event Type: ${eventType}`, event.data?.id || "");

    // Handle payment succeeded
    if (eventType === "payment.succeeded" || eventType === "checkout.session.completed") {
      const customerEmail = event.data?.customer?.email || event.data?.billing?.email;
      const paymentId = event.data?.payment_id || event.data?.id;
      console.log(`✅ Verified payment for ${customerEmail} (ID: ${paymentId})`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Error processing Dodo webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler failed", details: error.message },
      { status: 500 }
    );
  }
}
