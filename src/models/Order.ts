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

export interface ICodCallLog {
  calledAt: Date;
  calledBy: string;
  callStatus: "ANSWERED" | "NO_ANSWER" | "BUSY" | "CALLBACK_REQUESTED";
  notes?: string;
}

export type CodStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "DISPATCHED"
  | "REJECTED"
  | "CANCELLED";

export interface ICodDetails {
  codStatus: CodStatus;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId | string;
  callLogs: ICodCallLog[];
  rejectionReason?: string;
  cancellationReason?: string;
  courierPartner?: string;
  trackingNumber?: string;
  dispatchedAt?: Date;
  maxCodLimit?: number;
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

export type CanonicalOrderStatus =
  | "PENDING_PAYMENT"
  | "PAYMENT_REVIEW"
  | "CONFIRMED"
  | "PROCESSING"
  | "PACKED"
  | "DISPATCHED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURN_REQUESTED"
  | "RETURNED"
  | "REFUNDED";

export type OrderStatus =
  | CanonicalOrderStatus
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface IShipmentDetails {
  courier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  dispatchedAt?: Date;
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  shippingNotes?: string;
}

export interface IOrderStatusHistory {
  status: string;
  changedAt: Date;
  changedBy?: mongoose.Types.ObjectId | string;
  notes?: string;
}

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
  codDetails?: ICodDetails;
  shipmentDetails?: IShipmentDetails;
  statusHistory?: IOrderStatusHistory[];
  invoiceNumber?: string;
  invoiceId?: mongoose.Types.ObjectId;
  complianceVerified: boolean;
  requiresAdminReview?: boolean;
  complianceDetails?: Record<string, unknown>;
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

const CodCallLogSchema = new Schema<ICodCallLog>(
  {
    calledAt: { type: Date, default: Date.now },
    calledBy: { type: String, required: true },
    callStatus: {
      type: String,
      enum: ["ANSWERED", "NO_ANSWER", "BUSY", "CALLBACK_REQUESTED"],
      required: true,
    },
    notes: { type: String },
  },
  { _id: false }
);

const CodDetailsSchema = new Schema<ICodDetails>(
  {
    codStatus: {
      type: String,
      enum: [
        "PENDING_VERIFICATION",
        "VERIFIED",
        "DISPATCHED",
        "REJECTED",
        "CANCELLED",
      ],
      default: "PENDING_VERIFICATION",
      index: true,
    },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.Mixed },
    callLogs: { type: [CodCallLogSchema], default: () => [] },
    rejectionReason: { type: String },
    cancellationReason: { type: String },
    courierPartner: { type: String },
    trackingNumber: { type: String },
    dispatchedAt: { type: Date },
    maxCodLimit: { type: Number, default: 15000 },
  },
  { _id: false }
);

const ShipmentDetailsSchema = new Schema<IShipmentDetails>(
  {
    courier: { type: String, trim: true },
    trackingNumber: { type: String, trim: true, index: true },
    trackingUrl: { type: String, trim: true },
    dispatchedAt: { type: Date },
    estimatedDelivery: { type: Date },
    deliveredAt: { type: Date },
    shippingNotes: { type: String },
  },
  { _id: false }
);

const OrderStatusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.Mixed },
    notes: { type: String },
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
        "PENDING_PAYMENT",
        "PAYMENT_REVIEW",
        "CONFIRMED",
        "PROCESSING",
        "PACKED",
        "DISPATCHED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
        "RETURN_REQUESTED",
        "RETURNED",
        "REFUNDED",
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
    codDetails: {
      type: CodDetailsSchema,
      default: () => ({}),
    },
    shipmentDetails: {
      type: ShipmentDetailsSchema,
      default: () => ({}),
    },
    statusHistory: {
      type: [OrderStatusHistorySchema],
      default: () => [],
    },
    invoiceNumber: {
      type: String,
      trim: true,
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
    },
    complianceVerified: {
      type: Boolean,
      default: false,
    },
    requiresAdminReview: {
      type: Boolean,
      default: false,
    },
    complianceDetails: {
      type: Schema.Types.Mixed,
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
