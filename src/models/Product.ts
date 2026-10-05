import mongoose, { Schema, Document, Model } from "mongoose";
import { getModelProxy } from "@/lib/db";

export interface IProductImage {
  url: string;
  altText?: string;
  isPrimary: boolean;
}

export interface IProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: string;
}

export interface IProductSpecification {
  scale?: string;
  material?: string;
  heightCm?: number;
  manufacturer?: string;
  originCountry?: string;
  releaseYear?: number;
}

export interface IProduct extends Document {
  name: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number;
  compareAtPrice?: number;
  costPrice?: number;
  stock: number;
  lowStockThreshold: number;
  category: mongoose.Types.ObjectId;
  subcategory?: mongoose.Types.ObjectId;
  brand?: string;
  series?: string;
  sku: string;
  barcode?: string;
  weight: number;
  dimensions: IProductDimensions;
  images: IProductImage[];
  specifications: IProductSpecification;
  tags: string[];
  status: "draft" | "active" | "archived" | "preorder";
  isFeatured: boolean;
  isRestricted: boolean;
  ageRequirement: number;
  shippingRestrictions: string[];
  ratingAverage: number;
  reviewsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
    altText: { type: String, default: "" },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProductDimensionsSchema = new Schema<IProductDimensions>(
  {
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    unit: { type: String, default: "cm" },
  },
  { _id: false }
);

const ProductSpecificationSchema = new Schema<IProductSpecification>(
  {
    scale: { type: String, default: "1/7" },
    material: { type: String, default: "PVC / ABS" },
    heightCm: { type: Number },
    manufacturer: { type: String },
    originCountry: { type: String },
    releaseYear: { type: Number },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
      index: true,
    },
    title: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Product slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
      index: true,
    },
    discountPrice: {
      type: Number,
      min: [0, "Discount price cannot be negative"],
    },
    compareAtPrice: {
      type: Number,
      min: [0, "Compare price cannot be negative"],
    },
    costPrice: {
      type: Number,
      min: [0, "Cost price cannot be negative"],
    },
    stock: {
      type: Number,
      required: [true, "Stock count is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required"],
      index: true,
    },
    subcategory: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      index: true,
    },
    series: {
      type: String,
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      required: [true, "Product SKU is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    barcode: {
      type: String,
      trim: true,
    },
    weight: {
      type: Number,
      default: 500, // default in grams
      min: [0, "Weight cannot be negative"],
    },
    dimensions: {
      type: ProductDimensionsSchema,
      default: () => ({ length: 15, width: 15, height: 25, unit: "cm" }),
    },
    images: {
      type: [ProductImageSchema],
      default: [],
    },
    specifications: {
      type: ProductSpecificationSchema,
      default: () => ({}),
    },
    tags: {
      type: [String],
      index: true,
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "active", "archived", "preorder"],
      default: "active",
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isRestricted: {
      type: Boolean,
      default: false,
      index: true,
    },
    ageRequirement: {
      type: Number,
      default: 0,
    },
    shippingRestrictions: {
      type: [String],
      default: [],
    },
    ratingAverage: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    strictPopulate: false,
  }
);

// Pre-save hook to ensure name and title stay synced
ProductSchema.pre("save", function () {
  if (this.name && !this.title) {
    this.title = this.name;
  } else if (this.title && !this.name) {
    this.name = this.title;
  }
});

if (mongoose.models.Product && !mongoose.models.Product.schema.paths.subcategory) {
  delete (mongoose.models as any).Product;
}

const ProductModel: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export const Product = getModelProxy(ProductModel, "Product");

export default Product;
