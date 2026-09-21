import mongoose, { Schema, Document, Model } from "mongoose";

export interface IShipmentUpdate {
  timestamp: Date;
  status: string;
  location?: string;
  description: string;
}

export interface IShipment extends Document {
  order: mongoose.Types.ObjectId;
  trackingNumber: string;
  carrier: "fedex" | "ups" | "dhl" | "usps" | "other";
  shippingMethod: string;
  status: "pending" | "manifested" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "returned";
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  shippedAt?: Date;
  events: IShipmentUpdate[];
  createdAt: Date;
  updatedAt: Date;
}

const ShipmentUpdateSchema = new Schema<IShipmentUpdate>(
  {
    timestamp: { type: Date, default: Date.now },
    status: { type: String, required: true },
    location: { type: String },
    description: { type: String, required: true },
  },
  { _id: false }
);

const ShipmentSchema = new Schema<IShipment>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    carrier: {
      type: String,
      enum: ["fedex", "ups", "dhl", "usps", "other"],
      required: true,
    },
    shippingMethod: {
      type: String,
      default: "Standard Ground",
    },
    status: {
      type: String,
      enum: ["pending", "manifested", "in_transit", "out_for_delivery", "delivered", "failed", "returned"],
      default: "pending",
      index: true,
    },
    estimatedDeliveryDate: {
      type: Date,
    },
    actualDeliveryDate: {
      type: Date,
    },
    shippedAt: {
      type: Date,
    },
    events: {
      type: [ShipmentUpdateSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Shipment: Model<IShipment> =
  mongoose.models.Shipment || mongoose.model<IShipment>("Shipment", ShipmentSchema);

export default Shipment;
