import mongoose, { Schema, Document, Model } from "mongoose";
import { getModelProxy } from "@/lib/db";

export interface IShipmentUpdate {
  timestamp: Date;
  status: string;
  location?: string;
  description: string;
}

export interface IShipment extends Document {
  order: mongoose.Types.ObjectId;
  orderNumber: string;
  trackingNumber: string;
  courierName: string;
  carrier?: string;
  trackingUrl?: string;
  shippingMethod: string;
  status:
    | "pending"
    | "manifested"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "failed"
    | "returned"
    | "DISPATCHED"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED";
  dispatchDate?: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  shippedAt?: Date;
  customerName?: string;
  customerPhone?: string;
  shippingNotes?: string;
  provider: "MANUAL" | "SHIPROCKET" | "DELHIVERY" | "BLUEDART" | "DTDC";
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
    orderNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    trackingNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    courierName: {
      type: String,
      required: true,
      trim: true,
      default: "Blue Dart Express",
    },
    carrier: {
      type: String,
      default: "other",
    },
    trackingUrl: {
      type: String,
      trim: true,
    },
    shippingMethod: {
      type: String,
      default: "Standard Express",
    },
    status: {
      type: String,
      default: "in_transit",
      index: true,
    },
    dispatchDate: {
      type: Date,
      default: Date.now,
    },
    expectedDeliveryDate: {
      type: Date,
    },
    actualDeliveryDate: {
      type: Date,
    },
    shippedAt: {
      type: Date,
      default: Date.now,
    },
    customerName: {
      type: String,
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
    },
    shippingNotes: {
      type: String,
      trim: true,
    },
    provider: {
      type: String,
      enum: ["MANUAL", "SHIPROCKET", "DELHIVERY", "BLUEDART", "DTDC"],
      default: "MANUAL",
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

ShipmentSchema.index({ trackingNumber: 1 });
ShipmentSchema.index({ orderNumber: 1, createdAt: -1 });

const ShipmentModel: Model<IShipment> =
  mongoose.models.Shipment || mongoose.model<IShipment>("Shipment", ShipmentSchema);

export const Shipment = getModelProxy(ShipmentModel, "Shipment");

export default Shipment;
