import mongoose, { Schema, Document, Model } from "mongoose";

export interface IResult extends Document {
  operation: string;
  category: "auth" | "order" | "inventory" | "payment" | "system" | "webhook";
  status: "success" | "failure" | "warning";
  statusCode?: number;
  message: string;
  data?: Record<string, unknown>;
  error?: Record<string, unknown>;
  performedBy?: mongoose.Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  executionTimeMs?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ResultSchema = new Schema<IResult>(
  {
    operation: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["auth", "order", "inventory", "payment", "system", "webhook"],
      default: "system",
      index: true,
    },
    status: {
      type: String,
      enum: ["success", "failure", "warning"],
      required: true,
      index: true,
    },
    statusCode: {
      type: Number,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
    },
    error: {
      type: Schema.Types.Mixed,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    executionTimeMs: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

export const Result: Model<IResult> =
  mongoose.models.Result || mongoose.model<IResult>("Result", ResultSchema);

export default Result;
