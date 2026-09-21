import { logger } from "./logger";

export interface IWhatsAppDispatchResult {
  success: boolean;
  messageId: string;
  recipient: string;
  channel: "WHATSAPP";
  messageType: "text" | "document";
  body?: string;
  documentUrl?: string;
  filename?: string;
  caption?: string;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
  sentAt: Date;
  error?: string;
  rawResponse?: any;
}

export interface IWhatsAppTextMessageOptions {
  to: string;
  text: string;
  previewUrl?: boolean;
}

export interface IWhatsAppDocumentMessageOptions {
  to: string;
  documentUrl: string;
  filename: string;
  caption?: string;
}

// In-memory audit log for real-time inspection & test assertions
export const whatsappDispatchLogs: IWhatsAppDispatchResult[] = [];

/**
 * Normalizes phone numbers to standard E.164 without '+' or special characters.
 * Handles Indian 10-digit mobile numbers (prepends country code 91),
 * US numbers (+1...), and general international formats.
 */
export function formatWhatsAppPhone(phone: string): string {
  if (!phone) return "";

  // Remove whitespace, dashes, parentheses, dots
  let cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, "");

  // If starts with +, strip +
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  // If 10 digits (standard Indian mobile like 9876543210), prepend 91
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `91${cleaned}`;
  }

  // If 11 digits starting with 0 (e.g. 09876543210), replace leading 0 with 91
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return `91${cleaned.substring(1)}`;
  }

  return cleaned;
}

/**
 * Dispatches a WhatsApp text message via Meta WhatsApp Cloud API or Mock Provider.
 */
export async function sendWhatsAppText(
  options: IWhatsAppTextMessageOptions
): Promise<IWhatsAppDispatchResult> {
  const normalizedPhone = formatWhatsAppPhone(options.to);
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v19.0";

  const messageId = `wamid.HBgL${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // If real Meta credentials configured, execute HTTP request
  if (phoneNumberId && accessToken) {
    try {
      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: normalizedPhone,
          type: "text",
          text: {
            preview_url: options.previewUrl ?? true,
            body: options.text,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "WhatsApp Cloud API request failed");
      }

      const returnedId = data.messages?.[0]?.id || messageId;
      const logEntry: IWhatsAppDispatchResult = {
        success: true,
        messageId: returnedId,
        recipient: normalizedPhone,
        channel: "WHATSAPP",
        messageType: "text",
        body: options.text,
        status: "SENT",
        sentAt: new Date(),
        rawResponse: data,
      };

      whatsappDispatchLogs.push(logEntry);
      logger.info(`[WhatsApp Cloud API] Text message sent to ${normalizedPhone} (ID: ${returnedId})`);
      return logEntry;
    } catch (err: any) {
      logger.error(`[WhatsApp Cloud API Error] Failed to send to ${normalizedPhone}:`, { error: err.message });
      const failEntry: IWhatsAppDispatchResult = {
        success: false,
        messageId,
        recipient: normalizedPhone,
        channel: "WHATSAPP",
        messageType: "text",
        body: options.text,
        status: "FAILED",
        sentAt: new Date(),
        error: err.message,
      };
      whatsappDispatchLogs.push(failEntry);
      return failEntry;
    }
  }

  // Development / Test Mock Provider
  const mockEntry: IWhatsAppDispatchResult = {
    success: true,
    messageId,
    recipient: normalizedPhone,
    channel: "WHATSAPP",
    messageType: "text",
    body: options.text,
    status: "SENT",
    sentAt: new Date(),
    rawResponse: {
      messaging_product: "whatsapp",
      contacts: [{ input: normalizedPhone, wa_id: normalizedPhone }],
      messages: [{ id: messageId }],
    },
  };

  whatsappDispatchLogs.push(mockEntry);
  logger.info(`[WhatsApp Mock Provider] Text message sent to +${normalizedPhone} (ID: ${messageId}):\n"${options.text.substring(0, 100)}..."`);
  return mockEntry;
}

/**
 * Dispatches a WhatsApp document (e.g. PDF Invoice) via Meta WhatsApp Cloud API or Mock Provider.
 */
export async function sendWhatsAppDocument(
  options: IWhatsAppDocumentMessageOptions
): Promise<IWhatsAppDispatchResult> {
  const normalizedPhone = formatWhatsAppPhone(options.to);
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v19.0";

  const messageId = `wamid.HBgL${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // If real Meta credentials configured, execute HTTP request
  if (phoneNumberId && accessToken) {
    try {
      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: normalizedPhone,
          type: "document",
          document: {
            link: options.documentUrl,
            filename: options.filename,
            caption: options.caption || undefined,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "WhatsApp Cloud API document dispatch failed");
      }

      const returnedId = data.messages?.[0]?.id || messageId;
      const logEntry: IWhatsAppDispatchResult = {
        success: true,
        messageId: returnedId,
        recipient: normalizedPhone,
        channel: "WHATSAPP",
        messageType: "document",
        documentUrl: options.documentUrl,
        filename: options.filename,
        caption: options.caption,
        status: "SENT",
        sentAt: new Date(),
        rawResponse: data,
      };

      whatsappDispatchLogs.push(logEntry);
      logger.info(`[WhatsApp Cloud API] Document ${options.filename} sent to ${normalizedPhone} (ID: ${returnedId})`);
      return logEntry;
    } catch (err: any) {
      logger.error(`[WhatsApp Cloud API Error] Failed to send document to ${normalizedPhone}:`, { error: err.message });
      const failEntry: IWhatsAppDispatchResult = {
        success: false,
        messageId,
        recipient: normalizedPhone,
        channel: "WHATSAPP",
        messageType: "document",
        documentUrl: options.documentUrl,
        filename: options.filename,
        caption: options.caption,
        status: "FAILED",
        sentAt: new Date(),
        error: err.message,
      };
      whatsappDispatchLogs.push(failEntry);
      return failEntry;
    }
  }

  // Development / Test Mock Provider
  const mockEntry: IWhatsAppDispatchResult = {
    success: true,
    messageId,
    recipient: normalizedPhone,
    channel: "WHATSAPP",
    messageType: "document",
    documentUrl: options.documentUrl,
    filename: options.filename,
    caption: options.caption,
    status: "SENT",
    sentAt: new Date(),
    rawResponse: {
      messaging_product: "whatsapp",
      contacts: [{ input: normalizedPhone, wa_id: normalizedPhone }],
      messages: [{ id: messageId }],
    },
  };

  whatsappDispatchLogs.push(mockEntry);
  logger.info(`[WhatsApp Mock Provider] Document "${options.filename}" (${options.documentUrl}) sent to +${normalizedPhone} (ID: ${messageId})`);
  return mockEntry;
}
