import mongoose, { Schema, Document, Model } from "mongoose";
import { getModelProxy } from "@/lib/db";

export type NotificationChannel = "WHATSAPP" | "EMAIL" | "SMS";

export type NotificationType =
  | "ORDER_CONFIRMATION"
  | "PAYMENT_CONFIRMATION"
  | "INVOICE"
  | "DISPATCH"
  | "DELIVERY"
  | "CUSTOM";

export type NotificationStatus =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED";

export interface INotificationLog extends Document {
  recipientPhone: string;
  recipientEmail?: string;
  customerName: string;
  orderNumber: string;
  orderId?: mongoose.Types.ObjectId;
  invoiceNumber?: string;
  channel: NotificationChannel;
  notificationType: NotificationType;
  messageType: "text" | "document" | "template";
  body?: string;
  documentUrl?: string;
  filename?: string;
  providerMessageId?: string;
  status: NotificationStatus;
  error?: string;
  metadata?: Record<string, any>;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    recipientPhone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    recipientEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    orderNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    invoiceNumber: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["WHATSAPP", "EMAIL", "SMS"],
      default: "WHATSAPP",
      index: true,
    },
    notificationType: {
      type: String,
      enum: [
        "ORDER_CONFIRMATION",
        "PAYMENT_CONFIRMATION",
        "INVOICE",
        "DISPATCH",
        "DELIVERY",
        "CUSTOM",
      ],
      required: true,
      index: true,
    },
    messageType: {
      type: String,
      enum: ["text", "document", "template"],
      default: "text",
    },
    body: {
      type: String,
    },
    documentUrl: {
      type: String,
    },
    filename: {
      type: String,
    },
    providerMessageId: {
      type: String,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["QUEUED", "SENT", "DELIVERED", "READ", "FAILED"],
      default: "SENT",
      index: true,
    },
    error: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast order-level timeline and recipient history lookups
NotificationLogSchema.index({ orderNumber: 1, createdAt: -1 });
NotificationLogSchema.index({ recipientPhone: 1, createdAt: -1 });

const NotificationLogModel: Model<INotificationLog> =
  mongoose.models.NotificationLog ||
  mongoose.model<INotificationLog>("NotificationLog", NotificationLogSchema);

export const NotificationLog = getModelProxy(NotificationLogModel, "NotificationLog");

export default NotificationLog;
