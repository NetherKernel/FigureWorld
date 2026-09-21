import { NextResponse } from "next/server";
import { NotificationService } from "@/lib/notifications";
import { logger } from "@/lib/logger";

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "figuresworld_whatsapp_webhook_secret";

/**
 * Meta WhatsApp Cloud API Webhook Verification Challenge (GET)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      logger.info("[WhatsApp Webhook] Verification challenge verified successfully.");
      return new NextResponse(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    logger.warn("[WhatsApp Webhook] Failed verification token match.");
    return new NextResponse("Forbidden: Verification Token Mismatch", { status: 403 });
  } catch (error: any) {
    logger.error("[WhatsApp Webhook] Challenge error:", { error: error.message });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * Inbound Webhook Event Processor (POST)
 * Handles delivery receipts: 'sent', 'delivered', 'read', 'failed'
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Verify WhatsApp event structure
    if (body.object === "whatsapp_business_account" || body.entry) {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;
          if (!value) continue;

          // Process status updates (delivery receipts)
          if (value.statuses && Array.isArray(value.statuses)) {
            for (const statusObj of value.statuses) {
              const msgId = statusObj.id;
              const rawStatus = (statusObj.status || "").toLowerCase();
              let canonicalStatus: "SENT" | "DELIVERED" | "READ" | "FAILED" = "SENT";

              if (rawStatus === "delivered") canonicalStatus = "DELIVERED";
              else if (rawStatus === "read") canonicalStatus = "READ";
              else if (rawStatus === "failed") canonicalStatus = "FAILED";

              logger.info(`[WhatsApp Webhook] Delivery receipt for msg ${msgId}: ${canonicalStatus}`);
              await NotificationService.updateStatusByProviderMessageId(msgId, canonicalStatus);
            }
          }

          // Process customer incoming messages
          if (value.messages && Array.isArray(value.messages)) {
            for (const inboundMsg of value.messages) {
              logger.info(`[WhatsApp Inbound Message] From ${inboundMsg.from}: ${inboundMsg.text?.body || "(media)"}`);
            }
          }
        }
      }

      return NextResponse.json({ success: true, message: "Webhook processed" }, { status: 200 });
    }

    return NextResponse.json({ success: true, message: "Unrecognized webhook payload" }, { status: 200 });
  } catch (error: any) {
    logger.error("[WhatsApp Webhook] Processing error:", { error: error.message });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
