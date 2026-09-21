import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProductImage {
  url: string;
  altText?: string;
  isPrimary: boolean;
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
  title: string;
  slug: string;
  description: string;
  sku: string;
  barcode?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  stock: number;
  lowStockThreshold: number;
  category: mongoose.Types.ObjectId;
  series?: string;
  brand?: string;
  images: IProductImage[];
  specifications: IProductSpecification;
  tags: string[];
  status: "draft" | "active" | "archived" | "preorder";
  ratingAverage: number;
  reviewsCount: number;
  isFeatured: boolean;
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
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
      maxlength: [200, "Product title cannot exceed 200 characters"],
      index: true,
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
    sku: {
      type: String,
      required: [true, "Product SKU is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
      index: true,
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
    series: {
      type: String,
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      index: true,
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
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
