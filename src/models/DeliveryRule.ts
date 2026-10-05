import mongoose, { Schema, Document, Model } from "mongoose";
import { getModelProxy } from "@/lib/db";

export interface IPincodeRate {
  pincode: string;
  areaName: string;
  fee: number;
  estimatedDays: string;
  isActive: boolean;
  notes?: string;
}

export interface IStateRate {
  state: string;
  fee: number;
  estimatedDays: string;
  isActive: boolean;
  notes?: string;
}

export interface IDeliveryPartnerPreset {
  id: string;
  name: string;
  type: "PORTER" | "DUNZO" | "LOCAL_RIDER" | "STANDARD_COURIER" | "OTHER";
  baseRate: number;
  description: string;
}

export interface IDeliveryRule extends Document {
  defaultBaseFee: number;
  freeShippingThreshold: number;
  isFreeShippingActive: boolean;
  enableLocalDelivery: boolean;
  localCity: string;
  localCityFee: number;
  localCityEstDays: string;
  enableRegionalDelivery: boolean;
  regionalState: string;
  regionalStateFee: number;
  regionalStateEstDays: string;
  nationalFee: number;
  nationalEstDays: string;
  heavyItemSurcharge: number;
  pincodeRates: IPincodeRate[];
  stateRates: IStateRate[];
  partnerPresets: IDeliveryPartnerPreset[];
  updatedBy?: string;
  updatedAt: Date;
  createdAt: Date;
}

const PincodeRateSchema = new Schema<IPincodeRate>(
  {
    pincode: { type: String, required: true, trim: true },
    areaName: { type: String, required: true, trim: true },
    fee: { type: Number, required: true, min: 0 },
    estimatedDays: { type: String, default: "1-2 Days" },
    isActive: { type: Boolean, default: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const StateRateSchema = new Schema<IStateRate>(
  {
    state: { type: String, required: true, trim: true },
    fee: { type: Number, required: true, min: 0 },
    estimatedDays: { type: String, default: "2-4 Days" },
    isActive: { type: Boolean, default: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const DeliveryPartnerPresetSchema = new Schema<IDeliveryPartnerPreset>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["PORTER", "DUNZO", "LOCAL_RIDER", "STANDARD_COURIER", "OTHER"],
      default: "LOCAL_RIDER",
    },
    baseRate: { type: Number, required: true, min: 0 },
    description: { type: String },
  },
  { _id: false }
);

const DeliveryRuleSchema = new Schema<IDeliveryRule>(
  {
    defaultBaseFee: { type: Number, default: 100, min: 0 },
    freeShippingThreshold: { type: Number, default: 1999, min: 0 },
    isFreeShippingActive: { type: Boolean, default: false },
    enableLocalDelivery: { type: Boolean, default: false },
    localCity: { type: String, default: "Mumbai", trim: true },
    localCityFee: { type: Number, default: 50, min: 0 },
    localCityEstDays: { type: String, default: "Same Day / 4 Hours" },
    enableRegionalDelivery: { type: Boolean, default: false },
    regionalState: { type: String, default: "Maharashtra", trim: true },
    regionalStateFee: { type: Number, default: 80, min: 0 },
    regionalStateEstDays: { type: String, default: "1-2 Days" },
    nationalFee: { type: Number, default: 100, min: 0 },
    nationalEstDays: { type: String, default: "3-5 Days" },
    heavyItemSurcharge: { type: Number, default: 0, min: 0 },
    pincodeRates: { type: [PincodeRateSchema], default: [] },
    stateRates: { type: [StateRateSchema], default: [] },
    partnerPresets: {
      type: [DeliveryPartnerPresetSchema],
      default: [
        {
          id: "porter-bike",
          name: "Porter Bike Delivery",
          type: "PORTER",
          baseRate: 45,
          description: "Intra-city 2-wheeler direct rider (up to 10km)",
        },
        {
          id: "dunzo-express",
          name: "Dunzo Express Local",
          type: "DUNZO",
          baseRate: 55,
          description: "Fast 60-90 min hyperlocal drop",
        },
        {
          id: "inhouse-rider",
          name: "Store Local Rider",
          type: "LOCAL_RIDER",
          baseRate: 35,
          description: "Own delivery boy for nearby neighborhoods",
        },
        {
          id: "bluedart-air",
          name: "Standard Air Express",
          type: "STANDARD_COURIER",
          baseRate: 100,
          description: "All-India courier partner (BlueDart / Delhivery / DTDC)",
        },
      ],
    },
    updatedBy: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes
DeliveryRuleSchema.index({ "pincodeRates.pincode": 1 });

const DeliveryRuleModel: Model<IDeliveryRule> =
  mongoose.models.DeliveryRule ||
  mongoose.model<IDeliveryRule>("DeliveryRule", DeliveryRuleSchema);

export const DeliveryRule: Model<IDeliveryRule> = getModelProxy(DeliveryRuleModel, "DeliveryRule");

export default DeliveryRule;
