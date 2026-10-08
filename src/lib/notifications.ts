import { supabase } from "@/lib/supabase";
import { findSupabaseOrder } from "@/lib/orders-supabase";
import {
  formatWhatsAppPhone,
  sendWhatsAppText,
  sendWhatsAppDocument,
  IWhatsAppDispatchResult,
} from "./whatsapp";
import { createInvoiceForOrder } from "./invoice";
import { logger } from "./logger";
import { env } from "./env";
export type IOrder = any;
export type IInvoice = any;
export type INotificationLog = any;

interface IResolvedOrderContext {
  order: any;
  address: any;
  items: any[];
  recipientPhone: string;
  customerName: string;
  orderNumber: string;
  grandTotal: number;
}

/**
 * Resolves full context for an order by orderNumber, UUID, or existing order object.
 */
async function resolveOrderContext(
  orderOrNumber: any
): Promise<IResolvedOrderContext> {
  let order: any = null;

  if (typeof orderOrNumber === "string") {
    order = await findSupabaseOrder(orderOrNumber);
    if (!order) {
      throw new Error(`Order "${orderOrNumber}" not found for notification.`);
    }
  } else {
    order = orderOrNumber;
  }

  const address = order.shipping_address || order.shippingAddress || {};
  const customerDetails = order.customer_details || order.customer || {};
  const items = Array.isArray(order.items) ? order.items : [];
  const pricing = order.pricing || {};

  const recipientPhone =
    address.phone ||
    customerDetails.phone ||
    customerDetails.email ||
    "";

  const customerName =
    customerDetails.name ||
    address.fullName ||
    "Valued Customer";

  return {
    order,
    address,
    items,
    recipientPhone,
    customerName,
    orderNumber: order.order_number || order.orderNumber,
    grandTotal: Number(pricing.grandTotal || 0),
  };
}

/**
 * Persists an outbound notification into Supabase notification_logs.
 */
async function recordNotificationLog(params: any): Promise<any> {
  try {
    const { data: log } = await supabase
      .from("notification_logs")
      .insert({
        order_number: params.orderNumber,
        recipient: params.recipientPhone || params.recipientEmail,
        channel: "WHATSAPP",
        template: params.notificationType,
        status: params.dispatchResult?.status || (params.dispatchResult?.success ? "SENT" : "FAILED"),
        details: params,
      })
      .select("*")
      .maybeSingle();
    return log ? mapNotificationLog(log) : params;
  } catch (err: any) {
    logger.error("Failed to save NotificationLog to Supabase:", { error: err.message });
    return params;
  }
}

export function mapNotificationLog(n: any) {
  if (!n) return null;
  const d = n.details || {};
  return {
    _id: n.id,
    id: n.id,
    recipientPhone: n.recipient || d.recipientPhone || "",
    recipientEmail: d.recipientEmail || "",
    customerName: d.customerName || "Customer",
    orderNumber: n.order_number || d.orderNumber || "",
    orderId: d.orderId,
    invoiceNumber: d.invoiceNumber,
    channel: n.channel || "WHATSAPP",
    notificationType: n.template || d.notificationType || "ORDER_CONFIRMATION",
    messageType: d.messageType || "text",
    body: d.body || "",
    documentUrl: d.documentUrl,
    filename: d.filename,
    providerMessageId: d.dispatchResult?.messageId || d.providerMessageId || n.id,
    status: n.status || "SENT",
    error: d.error,
    metadata: d.metadata || {},
    sentAt: n.created_at || new Date().toISOString(),
    deliveredAt: d.deliveredAt,
    readAt: d.readAt,
    createdAt: n.created_at,
    updatedAt: n.updated_at || n.created_at,
  };
}

/**
 * Reusable, centralized Notification Service for FiguresWorld.
 * Decouples WhatsApp Business messaging from individual controllers.
 */
export class NotificationService {
  /**
   * 1. Order Confirmation:
   * "Your order #KF100001 has been confirmed."
   */
  static async sendOrderConfirmation(
    orderOrNumber: string | IOrder,
    options?: { phoneOverride?: string; customNote?: string }
  ): Promise<INotificationLog> {
    const ctx = await resolveOrderContext(orderOrNumber);
    const phone = options?.phoneOverride || ctx.recipientPhone;

    const itemsSummary = ctx.items.length > 0
      ? ctx.items.map((i) => `${i.quantity}x ${i.productTitle || i.title || "Item"}`).join(", ")
      : "Anime Collectibles";

    const addressLine = ctx.address
      ? `${ctx.address.city}, ${ctx.address.state} - ${ctx.address.postalCode}`
      : "Standard Shipping";

    const text = [
      `Hello ${ctx.customerName}! 👋`,
      ``,
      `Your order #${ctx.orderNumber} has been confirmed.`,
      ``,
      `📦 Items: ${itemsSummary}`,
      `💰 Total: ₹${ctx.grandTotal.toLocaleString("en-IN")}`,
      `📍 Delivery To: ${addressLine}`,
      ``,
      options?.customNote ? `Note: ${options.customNote}\n` : ``,
      `We are preparing your items for packaging. We will notify you once dispatched!`,
      `Thank you for shopping with FiguresWorld! 🎌`,
    ].filter(Boolean).join("\n");

    const result = await sendWhatsAppText({ to: phone, text });

    return recordNotificationLog({
      recipientPhone: formatWhatsAppPhone(phone),
      recipientEmail: ctx.order.customerEmail,
      customerName: ctx.customerName,
      orderNumber: ctx.orderNumber,
      orderId: ctx.order._id as any,
      notificationType: "ORDER_CONFIRMATION",
      messageType: "text",
      body: text,
      dispatchResult: result,
      metadata: { grandTotal: ctx.grandTotal, itemsCount: ctx.items.length },
    });
  }

  /**
   * 2. Payment Confirmation:
   * "Payment of ₹X,XXX for your order #KF100001 has been received and verified."
   */
  static async sendPaymentConfirmation(
    orderOrNumber: string | IOrder,
    options?: { phoneOverride?: string; upiRef?: string; amount?: number }
  ): Promise<INotificationLog> {
    const ctx = await resolveOrderContext(orderOrNumber);
    const phone = options?.phoneOverride || ctx.recipientPhone;
    const amount = options?.amount ?? ctx.grandTotal;
    const ref = options?.upiRef || ctx.order.paymentDetails?.transactionRef || "Bank Verified";

    const text = [
      `Hello ${ctx.customerName}! ✅`,
      ``,
      `Payment confirmation for your order #${ctx.orderNumber}:`,
      `Payment of ₹${amount.toLocaleString("en-IN")} has been received and verified successfully.`,
      ``,
      `💳 Payment Method: ${ctx.order.paymentMethod}`,
      `🔖 Transaction Ref (UTR): ${ref}`,
      `📅 Date: ${new Date().toLocaleDateString("en-IN")}`,
      ``,
      `Your order #${ctx.orderNumber} is now officially confirmed and moving to processing!`,
      `Thank you for shopping with FiguresWorld! 🎌`,
    ].join("\n");

    const result = await sendWhatsAppText({ to: phone, text });

    return recordNotificationLog({
      recipientPhone: formatWhatsAppPhone(phone),
      recipientEmail: ctx.order.customerEmail,
      customerName: ctx.customerName,
      orderNumber: ctx.orderNumber,
      orderId: ctx.order._id as any,
      notificationType: "PAYMENT_CONFIRMATION",
      messageType: "text",
      body: text,
      dispatchResult: result,
      metadata: { amount, ref, paymentMethod: ctx.order.paymentMethod },
    });
  }

  /**
   * 3. Invoice:
   * "Send the invoice/document through your WhatsApp Business setup."
   */
  static async sendInvoice(
    orderOrNumber: string | IOrder,
    invoiceOrNumber?: string | IInvoice,
    options?: { phoneOverride?: string; documentUrlOverride?: string }
  ): Promise<INotificationLog> {
    const ctx = await resolveOrderContext(orderOrNumber);
    const phone = options?.phoneOverride || ctx.recipientPhone;

    // Resolve or generate invoice
    let invoice: any = null;
    if (invoiceOrNumber) {
      if (typeof invoiceOrNumber === "string") {
        const { data: inv } = await supabase
          .from("invoices")
          .select("*")
          .ilike("invoice_number", invoiceOrNumber.trim())
          .maybeSingle();
        invoice = inv;
      } else {
        invoice = invoiceOrNumber;
      }
    }

    const orderInvNum = ctx.order.invoiceNumber || ctx.order.invoice_number;
    if (!invoice && orderInvNum) {
      const { data: inv } = await supabase
        .from("invoices")
        .select("*")
        .ilike("invoice_number", orderInvNum)
        .maybeSingle();
      invoice = inv;
    }

    if (!invoice) {
      try {
        invoice = await createInvoiceForOrder(ctx.orderNumber, { sendCustomerEmail: false });
      } catch (e: any) {
        logger.warn("Could not auto-generate invoice in sendInvoice, using fallback:", { error: e.message });
      }
    }

    const invoiceNumber = invoice?.invoiceNumber || ctx.order.invoiceNumber || `FW-INV-${ctx.orderNumber}`;
    const baseUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const documentUrl =
      options?.documentUrlOverride ||
      invoice?.pdfUrl
        ? `${baseUrl}${invoice.pdfUrl}`
        : `${baseUrl}/uploads/invoices/${invoiceNumber}.pdf`;

    const filename = `${invoiceNumber}.pdf`;
    const caption = `Official Tax Invoice [${invoiceNumber}] for Order #${ctx.orderNumber}. Grand Total: ₹${ctx.grandTotal.toLocaleString("en-IN")}. GSTIN: 27AADCF1234F1Z5.`;

    // 1. Send introductory message
    const introText = [
      `Hello ${ctx.customerName}! 📄`,
      ``,
      `Your tax invoice for order #${ctx.orderNumber} is ready.`,
      `Invoice Number: ${invoiceNumber}`,
      `Total Amount: ₹${ctx.grandTotal.toLocaleString("en-IN")}`,
      ``,
      `Your official GST invoice document is attached below.`,
    ].join("\n");

    await sendWhatsAppText({ to: phone, text: introText });

    // 2. Send official PDF document
    const result = await sendWhatsAppDocument({
      to: phone,
      documentUrl,
      filename,
      caption,
    });

    return recordNotificationLog({
      recipientPhone: formatWhatsAppPhone(phone),
      recipientEmail: ctx.order.customerEmail,
      customerName: ctx.customerName,
      orderNumber: ctx.orderNumber,
      orderId: ctx.order._id as any,
      invoiceNumber,
      notificationType: "INVOICE",
      messageType: "document",
      body: introText,
      documentUrl,
      filename,
      dispatchResult: result,
      metadata: { invoiceNumber, documentUrl, filename },
    });
  }

  /**
   * 4. Dispatch Details:
   * "Your order #KF100001 has been dispatched.
   * Courier: XYZ
   * Tracking ID: ABC123456"
   */
  static async sendDispatchDetails(
    orderOrNumber: string | IOrder,
    options?: {
      phoneOverride?: string;
      courier?: string;
      trackingNumber?: string;
      trackingUrl?: string;
      dispatchDate?: Date | string;
      expectedDeliveryDate?: Date | string;
    }
  ): Promise<INotificationLog> {
    const ctx = await resolveOrderContext(orderOrNumber);
    const phone = options?.phoneOverride || ctx.recipientPhone;

    const courier =
      options?.courier ||
      ctx.order.shipmentDetails?.courier ||
      ctx.order.codDetails?.courierPartner ||
      "Blue Dart Express";

    const trackingNumber =
      options?.trackingNumber ||
      ctx.order.shipmentDetails?.trackingNumber ||
      ctx.order.codDetails?.trackingNumber ||
      `AWB-${ctx.orderNumber}`;

    const trackingUrl =
      options?.trackingUrl ||
      ctx.order.shipmentDetails?.trackingUrl ||
      `https://www.bluedart.com/tracking?track=${encodeURIComponent(trackingNumber)}`;

    const dispatchDate =
      options?.dispatchDate ||
      ctx.order.shipmentDetails?.dispatchedAt ||
      new Date();

    const expectedDeliveryDate =
      options?.expectedDeliveryDate ||
      ctx.order.shipmentDetails?.estimatedDelivery;

    const textLines = [
      `Hello ${ctx.customerName}! 🚀`,
      ``,
      `Your order #${ctx.orderNumber} has been dispatched.`,
      ``,
      `Courier: ${courier}`,
      `Tracking ID: ${trackingNumber}`,
    ];

    if (dispatchDate) {
      textLines.push(`📅 Dispatch Date: ${new Date(dispatchDate).toLocaleDateString("en-IN")}`);
    }
    if (expectedDeliveryDate) {
      textLines.push(`📦 Expected Delivery: ${new Date(expectedDeliveryDate).toLocaleDateString("en-IN")}`);
    }

    textLines.push(`🔗 Track your order: ${trackingUrl}`);
    textLines.push(``);
    textLines.push(`Your package is securely packed in tamper-proof collectible packaging and is on its way!`);
    textLines.push(`FiguresWorld Anime Store 🎌`);

    const text = textLines.join("\n");

    const result = await sendWhatsAppText({ to: phone, text });

    return recordNotificationLog({
      recipientPhone: formatWhatsAppPhone(phone),
      recipientEmail: ctx.order.customerEmail,
      customerName: ctx.customerName,
      orderNumber: ctx.orderNumber,
      orderId: ctx.order._id as any,
      notificationType: "DISPATCH",
      messageType: "text",
      body: text,
      dispatchResult: result,
      metadata: { courier, trackingNumber, trackingUrl },
    });
  }

  /**
   * 5. Delivery Update:
   * "Your order #KF100001 has been delivered.
   * Thank you for shopping with us."
   */
  static async sendDeliveryUpdate(
    orderOrNumber: string | IOrder,
    options?: { phoneOverride?: string; deliveryNotes?: string }
  ): Promise<INotificationLog> {
    const ctx = await resolveOrderContext(orderOrNumber);
    const phone = options?.phoneOverride || ctx.recipientPhone;

    const text = [
      `Hello ${ctx.customerName}! 🎉`,
      ``,
      `Your order #${ctx.orderNumber} has been delivered.`,
      `Thank you for shopping with us.`,
      ``,
      options?.deliveryNotes ? `Delivery Note: ${options.deliveryNotes}\n` : ``,
      `We hope your new anime figures and collectibles bring your collection to life! ⚔️`,
      `Share your unboxing tag us @FiguresWorld on Instagram/Twitter.`,
      `Need help or have questions? Just reply to this message! 💬`,
    ].filter(Boolean).join("\n");

    const result = await sendWhatsAppText({ to: phone, text });

    return recordNotificationLog({
      recipientPhone: formatWhatsAppPhone(phone),
      recipientEmail: ctx.order.customerEmail,
      customerName: ctx.customerName,
      orderNumber: ctx.orderNumber,
      orderId: ctx.order._id as any,
      notificationType: "DELIVERY",
      messageType: "text",
      body: text,
      dispatchResult: result,
      metadata: { deliveredAt: new Date() },
    });
  }

  /**
   * 6. Custom Notification:
   * Direct custom message dispatched to the customer.
   */
  static async sendCustomNotification(
    orderOrNumber: string | IOrder,
    options: { message: string; phoneOverride?: string }
  ): Promise<INotificationLog> {
    const ctx = await resolveOrderContext(orderOrNumber);
    const phone = options.phoneOverride || ctx.recipientPhone;
    const text = options.message;

    const result = await sendWhatsAppText({ to: phone, text });

    return recordNotificationLog({
      recipientPhone: formatWhatsAppPhone(phone),
      recipientEmail: ctx.order.customerEmail,
      customerName: ctx.customerName,
      orderNumber: ctx.orderNumber,
      orderId: ctx.order._id as any,
      notificationType: "CUSTOM" as any,
      messageType: "text",
      body: text,
      dispatchResult: result,
      metadata: { custom: true },
    });
  }

  /**
   * Helper: Retrieve all notification logs for a specific order.
   */
  static async getOrderNotifications(orderNumber: string): Promise<any[]> {
    const { data } = await supabase
      .from("notification_logs")
      .select("*")
      .ilike("order_number", orderNumber.trim())
      .order("created_at", { ascending: false });

    return (data || []).map(mapNotificationLog);
  }

  /**
   * Helper: Update notification delivery status (e.g. from WhatsApp Webhooks).
   */
  static async updateStatusByProviderMessageId(
    providerMessageId: string,
    status: "SENT" | "DELIVERED" | "READ" | "FAILED"
  ): Promise<any | null> {
    const update: any = { status };
    if (status === "DELIVERED") update.delivered_at = new Date().toISOString();

    const { data } = await supabase
      .from("notification_logs")
      .update(update)
      .eq("id", providerMessageId)
      .select("*")
      .maybeSingle();

    return data ? mapNotificationLog(data) : null;
  }
}
