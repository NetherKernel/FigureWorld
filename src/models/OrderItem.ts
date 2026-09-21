import mongoose, { Schema, Document, Model } from "mongoose";
import { getModelProxy } from "@/lib/db";

export interface IOrderItem extends Document {
  order: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  productTitle: string;
  productSku: string;
  productImage?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

export const OrderItemSchema = new Schema<IOrderItem>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productTitle: {
      type: String,
      required: true,
    },
    productSku: {
      type: String,
      required: true,
    },
    productImage: {
      type: String,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const OrderItemModel: Model<IOrderItem> =
  mongoose.models.OrderItem || mongoose.model<IOrderItem>("OrderItem", OrderItemSchema);

export const OrderItem = getModelProxy(OrderItemModel, "OrderItem");

export default OrderItem;
