import mongoose, { Schema, Document, Model } from "mongoose";
import { getModelProxy } from "@/lib/db";

export interface IAuditLog extends Document {
  action: string;
  actor: {
    userId: string;
    email: string;
    name: string;
    role: string;
  };
  resource: {
    type: string;
    id?: string;
    identifier?: string;
  };
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: [true, "Audit action is required"],
      trim: true,
      index: true,
    },
    actor: {
      userId: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
    },
    resource: {
      type: { type: String, required: true, uppercase: true },
      id: { type: String },
      identifier: { type: String, index: true },
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ "actor.email": 1, timestamp: -1 });
AuditLogSchema.index({ "resource.identifier": 1, timestamp: -1 });

const AuditLogModel: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export const AuditLog = getModelProxy(AuditLogModel, "AuditLog");

export default AuditLog;
