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

export interface IOrder extends Document {
  orderNumber: string;
  customer?: mongoose.Types.ObjectId;
  customerEmail: string;
  items: mongoose.Types.ObjectId[];
  pricing: IOrderPricing;
  shippingAddress: mongoose.Types.ObjectId;
  billingAddress?: mongoose.Types.ObjectId;
  paymentMethod: "UPI" | "COD";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  orderStatus: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
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
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"],
      default: "processing",
      index: true,
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
