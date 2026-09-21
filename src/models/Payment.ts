import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPayment extends Document {
  order: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  provider: "stripe" | "paypal" | "razorpay" | "cash_on_delivery";
  transactionId?: string;
  paymentMethod?: string;
  status: "pending" | "authorized" | "captured" | "failed" | "refunded";
  gatewayResponse?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    provider: {
      type: String,
      enum: ["stripe", "paypal", "razorpay", "cash_on_delivery"],
      required: true,
    },
    transactionId: {
      type: String,
      trim: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "authorized", "captured", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    gatewayResponse: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);

export default Payment;
