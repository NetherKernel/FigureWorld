import mongoose, { Schema, Document, Model } from "mongoose";
import { getModelProxy } from "@/lib/db";

export interface ICategoryCompliance {
  minAge: number;
  requiresIdVerification: boolean;
  disclaimerText: string;
  restrictedRegions: string[];
}

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentCategory?: mongoose.Types.ObjectId;
  displayOrder: number;
  isActive: boolean;
  isRestricted: boolean;
  complianceRequirements: ICategoryCompliance;
  createdAt: Date;
  updatedAt: Date;
}

const CategoryComplianceSchema = new Schema<ICategoryCompliance>(
  {
    minAge: { type: Number, default: 0 },
    requiresIdVerification: { type: Boolean, default: false },
    disclaimerText: { type: String, default: "" },
    restrictedRegions: { type: [String], default: [] },
  },
  { _id: false }
);

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [80, "Category name cannot exceed 80 characters"],
    },
    slug: {
      type: String,
      required: [true, "Category slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    image: {
      type: String,
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isRestricted: {
      type: Boolean,
      default: false,
      index: true,
    },
    complianceRequirements: {
      type: CategoryComplianceSchema,
      default: () => ({
        minAge: 0,
        requiresIdVerification: false,
        disclaimerText: "",
        restrictedRegions: [],
      }),
    },
  },
  {
    timestamps: true,
  }
);

const CategoryModel: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);

export const Category = getModelProxy(CategoryModel, "Category");

export default Category;
