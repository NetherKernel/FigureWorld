import mongoose, { Schema, Document, Model } from "mongoose";
import { getModelProxy } from "@/lib/db";

export interface IOrderPricing {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingFee: number;
  grandTotal: number;
  currency: string;
}

export interface IUpiPaymentDetails {
  merchantUpiId?: string;
  customerUpiId?: string;
  transactionRef?: string;
  upiApp?: string;
  qrPayload?: string;
  submittedAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId | string;
  verificationNotes?: string;
  rejectionReason?: string;
}

export type PaymentStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "REFUNDED"
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface IOrder extends Document {
  orderNumber: string;
  customer?: mongoose.Types.ObjectId;
  customerEmail: string;
  items: mongoose.Types.ObjectId[];
  pricing: IOrderPricing;
  shippingAddress: mongoose.Types.ObjectId;
  billingAddress?: mongoose.Types.ObjectId;
  paymentMethod: "UPI" | "COD";
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  paymentDetails?: IUpiPaymentDetails;
  complianceVerified: boolean;
  couponCode?: string;
  notes?: string;
  placedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderPricingSchema = new Schema<IOrderPricing>(
  {
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    taxTotal: { type: Number, default: 0, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
  },
  { _id: false }
);

const UpiPaymentDetailsSchema = new Schema<IUpiPaymentDetails>(
  {
    merchantUpiId: { type: String, trim: true },
    customerUpiId: { type: String, trim: true },
    transactionRef: { type: String, trim: true, index: true },
    upiApp: { type: String, trim: true },
    qrPayload: { type: String },
    submittedAt: { type: Date },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.Mixed },
    verificationNotes: { type: String },
    rejectionReason: { type: String },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    items: [
      {
        type: Schema.Types.ObjectId,
        ref: "OrderItem",
      },
    ],
    pricing: {
      type: OrderPricingSchema,
      required: true,
    },
    shippingAddress: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    billingAddress: {
      type: Schema.Types.ObjectId,
      ref: "Address",
    },
    paymentMethod: {
      type: String,
      enum: ["UPI", "COD"],
      default: "UPI",
    },
    paymentStatus: {
      type: String,
      enum: [
        "PENDING",
        "UNDER_REVIEW",
        "PAID",
        "FAILED",
        "EXPIRED",
        "REFUNDED",
        "pending",
        "paid",
        "failed",
        "refunded",
      ],
      default: "PENDING",
      index: true,
    },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending",
      index: true,
    },
    paymentDetails: {
      type: UpiPaymentDetailsSchema,
      default: () => ({}),
    },
    complianceVerified: {
      type: Boolean,
      default: false,
    },
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    notes: {
      type: String,
    },
    placedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const OrderModel: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export const Order = getModelProxy(OrderModel, "Order");

export default Order;
