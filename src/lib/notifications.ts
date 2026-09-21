import mongoose from "mongoose";
import { connectToDatabase } from "./db";
import { Order, IOrder } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { Address } from "@/models/Address";
import { Invoice, IInvoice } from "@/models/Invoice";
import {
  NotificationLog,
  INotificationLog,
  NotificationType,
} from "@/models/NotificationLog";
import {
  formatWhatsAppPhone,
  sendWhatsAppText,
  sendWhatsAppDocument,
  IWhatsAppDispatchResult,
} from "./whatsapp";
import { createInvoiceForOrder } from "./invoice";
import { logger } from "./logger";
import { env } from "./env";

interface IResolvedOrderContext {
  order: IOrder;
  address: any;
  items: any[];
  recipientPhone: string;
  customerName: string;
  orderNumber: string;
  grandTotal: number;
}

/**
 * Resolves full context for an order by orderNumber, ObjectId, or existing IOrder object.
 */
async function resolveOrderContext(
  orderOrNumber: string | IOrder
): Promise<IResolvedOrderContext> {
  await connectToDatabase();

  let order: any = null;

  if (typeof orderOrNumber === "string") {
    const clean = orderOrNumber.trim();
    if (mongoose.Types.ObjectId.isValid(clean)) {
      order = await Order.findById(clean);
    }
    if (!order) {
      order = await Order.findOne({
        orderNumber: { $regex: new RegExp(`^${clean}$`, "i") },
      });
    }
    if (!order) {
      throw new Error(`Order "${clean}" not found for notification.`);
    }
  } else {
    order = orderOrNumber;
  }

  // Populate shipping address
  let address: any = null;
  if (order.shippingAddress) {
    if (typeof order.shippingAddress === "object" && (order.shippingAddress as any).phone) {
      address = order.shippingAddress;
    } else {
      address = await Address.findById(order.shippingAddress);
    }
  }

  // Populate items
  let items: any[] = [];
  if (order.items && order.items.length > 0) {
    if (typeof order.items[0] === "object" && (order.items[0] as any).productTitle) {
      items = order.items;
    } else {
      items = await OrderItem.find({ order: order._id });
    }
  }

  const recipientPhone =
    address?.phone ||
    order.customerEmail || // fallback string if no phone
    "";

  const customerName =
    address?.fullName ||
    order.customerEmail?.split("@")[0] ||
    "Valued Customer";

  return {
    order,
    address,
    items,
    recipientPhone,
    customerName,
    orderNumber: order.orderNumber,
    grandTotal: order.pricing?.grandTotal || 0,
  };
}

/**
 * Persists an outbound notification into MongoDB NotificationLog.
 */
async function recordNotificationLog(params: {
  recipientPhone: string;
  recipientEmail?: string;
  customerName: string;
  orderNumber: string;
  orderId?: mongoose.Types.ObjectId;
  invoiceNumber?: string;
  notificationType: NotificationType;
  messageType: "text" | "document" | "template";
  body?: string;
  documentUrl?: string;
  filename?: string;
  dispatchResult: IWhatsAppDispatchResult;
  metadata?: Record<string, any>;
}): Promise<INotificationLog> {
  try {
    await connectToDatabase();
    const log = await NotificationLog.create({
      recipientPhone: params.recipientPhone,
      recipientEmail: params.recipientEmail,
      customerName: params.customerName,
      orderNumber: params.orderNumber,
      orderId: params.orderId,
      invoiceNumber: params.invoiceNumber,
      channel: "WHATSAPP",
      notificationType: params.notificationType,
      messageType: params.messageType,
      body: params.body,
      documentUrl: params.documentUrl,
      filename: params.filename,
      providerMessageId: params.dispatchResult.messageId,
      status: params.dispatchResult.status || (params.dispatchResult.success ? "SENT" : "FAILED"),
      error: params.dispatchResult.error,
      metadata: params.metadata || {},
      sentAt: params.dispatchResult.sentAt || new Date(),
    });
    return log;
  } catch (err: any) {
    logger.error("Failed to save NotificationLog:", { error: err.message });
    // Return mock log document representation if DB write fails
    return {
      recipientPhone: params.recipientPhone,
      customerName: params.customerName,
      orderNumber: params.orderNumber,
      channel: "WHATSAPP",
      notificationType: params.notificationType,
      messageType: params.messageType,
      providerMessageId: params.dispatchResult.messageId,
      status: params.dispatchResult.status,
      sentAt: params.dispatchResult.sentAt,
    } as any;
  }
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
        invoice = await Invoice.findOne({ invoiceNumber: invoiceOrNumber.trim() });
      } else {
        invoice = invoiceOrNumber;
      }
    }

    if (!invoice && ctx.order.invoiceNumber) {
      invoice = await Invoice.findOne({ invoiceNumber: ctx.order.invoiceNumber });
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
   * Helper: Retrieve all notification logs for a specific order.
   */
  static async getOrderNotifications(orderNumber: string): Promise<INotificationLog[]> {
    await connectToDatabase();
    return NotificationLog.find({
      orderNumber: { $regex: new RegExp(`^${orderNumber.trim()}$`, "i") },
    }).sort({ createdAt: -1 });
  }

  /**
   * Helper: Update notification delivery status (e.g. from WhatsApp Webhooks).
   */
  static async updateStatusByProviderMessageId(
    providerMessageId: string,
    status: "SENT" | "DELIVERED" | "READ" | "FAILED"
  ): Promise<INotificationLog | null> {
    await connectToDatabase();
    const update: any = { status };
    if (status === "DELIVERED") update.deliveredAt = new Date();
    if (status === "READ") update.readAt = new Date();

    return NotificationLog.findOneAndUpdate(
      { providerMessageId },
      { $set: update },
      { new: true }
    );
  }
}
