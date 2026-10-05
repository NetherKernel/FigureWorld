import mongoose, { Schema, Document, Model } from "mongoose";
import { getModelProxy } from "@/lib/db";

export interface IInvoiceItem {
  product?: mongoose.Types.ObjectId;
  productTitle: string;
  productSku: string;
  hsn: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxableAmount: number;
  taxRate: number; // e.g. 18 (%)
  taxAmount: number;
  total: number;
}

export interface IInvoiceGstDetails {
  isApplicable: boolean;
  gstin: string;
  state: string;
  stateCode: string;
  hsnCode: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
}

export interface IInvoiceStoreDetails {
  name: string;
  address: string;
  gstin: string;
  pan: string;
  state: string;
  stateCode: string;
  email: string;
  phone: string;
  website: string;
}

export interface IInvoiceCustomerDetails {
  name: string;
  email: string;
  phone: string;
  billingAddress?: {
    street: string;
    landmark?: string;
    city: string;
    state: string;
    pinCode: string;
    country: string;
  };
  shippingAddress: {
    street: string;
    landmark?: string;
    city: string;
    state: string;
    pinCode: string;
    country: string;
  };
}

export interface IInvoicePricing {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingFee: number;
  grandTotal: number;
  currency: string;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  order: mongoose.Types.ObjectId;
  orderNumber: string;
  customer?: mongoose.Types.ObjectId;
  customerDetails: IInvoiceCustomerDetails;
  storeDetails: IInvoiceStoreDetails;
  gstDetails: IInvoiceGstDetails;
  items: IInvoiceItem[];
  pricing: IInvoicePricing;
  paymentMethod: "UPI" | "COD" | "CASH" | "CARD";
  paymentStatus: string;
  paymentRef?: string;
  pdfUrl: string;
  pdfPath: string;
  sentToCustomer: boolean;
  sentAt?: Date;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    productTitle: { type: String, required: true },
    productSku: { type: String, required: true },
    hsn: { type: String, default: "95030090" },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    taxableAmount: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 18 },
    taxAmount: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const InvoiceGstDetailsSchema = new Schema<IInvoiceGstDetails>(
  {
    isApplicable: { type: Boolean, default: true },
    gstin: { type: String, required: true, trim: true },
    state: { type: String, required: true },
    stateCode: { type: String, required: true },
    hsnCode: { type: String, default: "95030090" },
    cgstRate: { type: Number, default: 9 },
    sgstRate: { type: Number, default: 9 },
    igstRate: { type: Number, default: 18 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    totalTax: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const InvoiceStoreDetailsSchema = new Schema<IInvoiceStoreDetails>(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    gstin: { type: String, required: true },
    pan: { type: String, required: true },
    state: { type: String, required: true },
    stateCode: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    website: { type: String, default: "www.figuresworld.com" },
  },
  { _id: false }
);

const InvoiceCustomerDetailsSchema = new Schema<IInvoiceCustomerDetails>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    billingAddress: {
      street: { type: String },
      landmark: { type: String },
      city: { type: String },
      state: { type: String },
      pinCode: { type: String },
      country: { type: String, default: "India" },
    },
    shippingAddress: {
      street: { type: String, required: true },
      landmark: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pinCode: { type: String, required: true },
      country: { type: String, default: "India" },
    },
  },
  { _id: false }
);

const InvoicePricingSchema = new Schema<IInvoicePricing>(
  {
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    taxTotal: { type: Number, default: 0, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
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
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    customerDetails: {
      type: InvoiceCustomerDetailsSchema,
      required: true,
    },
    storeDetails: {
      type: InvoiceStoreDetailsSchema,
      required: true,
    },
    gstDetails: {
      type: InvoiceGstDetailsSchema,
      required: true,
    },
    items: {
      type: [InvoiceItemSchema],
      required: true,
    },
    pricing: {
      type: InvoicePricingSchema,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["UPI", "COD", "CASH", "CARD"],
      required: true,
    },
    paymentStatus: {
      type: String,
      required: true,
    },
    paymentRef: {
      type: String,
      trim: true,
    },
    pdfUrl: {
      type: String,
      required: true,
    },
    pdfPath: {
      type: String,
      required: true,
    },
    sentToCustomer: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Dev hot reload re-runs this file: drop the cached model so schema edits apply without a server restart
if (process.env.NODE_ENV !== "production" && mongoose.models.Invoice) mongoose.deleteModel("Invoice");

const InvoiceModel: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);

export const Invoice = getModelProxy(InvoiceModel, "Invoice");

export default Invoice;
