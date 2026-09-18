import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Verify Dodo Payments Standard Webhook signature (HMAC-SHA256)
 */
function verifyWebhookSignature(
  rawBody: string,
  webhookId: string | null,
  webhookTimestamp: string | null,
  webhookSignature: string | null,
  secret: string
): boolean {
  if (!webhookId || !webhookTimestamp || !webhookSignature || !secret) {
    return false;
  }

  // Prevent replay attacks: verify timestamp is within 5 minutes
  const timestampNumber = parseInt(webhookTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(timestampNumber) || Math.abs(now - timestampNumber) > 300) {
    console.warn("[Dodo Webhook] Timestamp expired or skewed:", webhookTimestamp);
    return false;
  }

  try {
    // Secret can be prefixed with 'whsec_' and base64 encoded
    const rawSecret = secret.startsWith("whsec_") ? secret.substring(6) : secret;
    const secretBuffer = Buffer.from(rawSecret, "base64");

    const payloadToSign = `${webhookId}.${webhookTimestamp}.${rawBody}`;
    const computedHmac = crypto
      .createHmac("sha256", secretBuffer)
      .update(payloadToSign)
      .digest("base64");

    // Dodo Payments webhook-signature may have format 'v1,base64signature'
    const signatures = webhookSignature.split(" ");
    for (const sig of signatures) {
      const parts = sig.split(",");
      const signatureHash = parts.length === 2 ? parts[1] : parts[0];
      if (
        computedHmac.length === signatureHash.length &&
        crypto.timingSafeEqual(Buffer.from(computedHmac), Buffer.from(signatureHash))
      ) {
        return true;
      }
    }
  } catch (err) {
    console.error("[Dodo Webhook] Error verifying signature:", err);
    return false;
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const webhookId = req.headers.get("webhook-id") || req.headers.get("x-dodo-webhook-id");
    const webhookTimestamp = req.headers.get("webhook-timestamp") || req.headers.get("x-dodo-timestamp");
    const webhookSignature = req.headers.get("webhook-signature") || req.headers.get("x-dodo-signature");

    const webhookSecret = process.env.DODO_WEBHOOK_SECRET;

    // In production, enforce cryptographic signature verification
    if (webhookSecret) {
      const isValid = verifyWebhookSignature(
        rawBody,
        webhookId,
        webhookTimestamp,
        webhookSignature,
        webhookSecret
      );

      if (!isValid) {
        console.warn("⚠️ [Dodo Webhook] Rejected webhook with invalid signature.");
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }
      console.log("🔒 [Dodo Webhook] Signature verified successfully.");
    } else {
      console.warn("⚠️ [Dodo Webhook] DODO_WEBHOOK_SECRET not set. Skipping signature verification in dev mode.");
    }

    let event: any = {};
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const eventType = event.type || event.event || "unknown";
    const data = event.data || {};

    console.log(`🔔 [Dodo Webhook] Received Event: ${eventType} (ID: ${data.id || "none"})`);

    switch (eventType) {
      case "payment.succeeded":
      case "checkout.session.completed": {
        const customerEmail = data.customer?.email || data.billing?.email || "Unknown";
        const paymentId = data.payment_id || data.id;
        const licenseKey = data.license_key || data.entitlement?.license_key;
        console.log(`✅ [Dodo Webhook] Payment Succeeded for ${customerEmail} (Payment ID: ${paymentId})`);
        if (licenseKey) {
          console.log(`🔑 [Dodo Webhook] Issued License Key: ${licenseKey}`);
        }
        break;
      }

      case "refund.processed":
      case "refund.succeeded": {
        const paymentId = data.payment_id || data.id;
        console.log(`↩️ [Dodo Webhook] Refund processed for payment ID: ${paymentId}. Pro license should be invalidated.`);
        break;
      }

      case "dispute.created": {
        console.warn(`⚠️ [Dodo Webhook] Dispute opened for payment ID: ${data.payment_id}`);
        break;
      }

      default:
        console.log(`ℹ️ [Dodo Webhook] Unhandled event type: ${eventType}`);
        break;
    }

    return NextResponse.json({ received: true, event: eventType });
  } catch (error: any) {
    console.error("❌ [Dodo Webhook] Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed", details: error.message },
      { status: 500 }
    );
  }
}
