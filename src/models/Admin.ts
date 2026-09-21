import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAdmin extends Document {
  user: mongoose.Types.ObjectId;
  superAdmin: boolean;
  permissions: string[];
  department?: string;
  lastLogin?: Date;
  status: "active" | "suspended" | "pending";
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    superAdmin: {
      type: Boolean,
      default: false,
    },
    permissions: {
      type: [String],
      default: ["manage_products", "manage_orders", "view_analytics"],
    },
    department: {
      type: String,
      trim: true,
    },
    lastLogin: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "pending"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Admin: Model<IAdmin> =
  mongoose.models.Admin || mongoose.model<IAdmin>("Admin", AdminSchema);

export default Admin;
