import { z } from "zod";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { Product } from "@/models/Product";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";

const updateStatusSchema = z.object({
  status: z.enum([
    "PENDING_PAYMENT",
    "PAYMENT_REVIEW",
    "CONFIRMED",
    "PROCESSING",
    "PACKED",
    "DISPATCHED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "RETURN_REQUESTED",
    "RETURNED",
    "REFUNDED",
    // Also accept lowercase aliases if sent by existing integrations
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ]),
  notes: z.string().optional(),
  restockInventory: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required to update order status.");
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Forbidden: Admin or Staff privileges required.");
    }

    const { orderNumber } = await params;
    if (!orderNumber) {
      throw new ValidationError("Order number or ID is required.");
    }

    const data = await validateRequestBody(req, updateStatusSchema);

    await connectToDatabase();

    const cleanIdentifier = orderNumber.trim();
    let order: any = null;

    if (mongoose.Types.ObjectId.isValid(cleanIdentifier)) {
      order = await Order.findById(cleanIdentifier);
    }
    if (!order) {
      order = await Order.findOne({
        orderNumber: { $regex: new RegExp(`^${cleanIdentifier}$`, "i") },
      });
    }

    if (!order) {
      throw new NotFoundError(`Order "${cleanIdentifier}" not found.`);
    }

    // Normalize incoming status to canonical uppercase
    let targetStatus: string = data.status.toUpperCase();
    if (targetStatus === "SHIPPED") targetStatus = "DISPATCHED";
    if (targetStatus === "PENDING") targetStatus = "PENDING_PAYMENT";

    const prevStatus = order.orderStatus;
    const isAlreadyCancelled = ["CANCELLED", "cancelled"].includes(prevStatus);

    // 1. Stock restoration if moving to CANCELLED (and wasn't already cancelled)
    if (targetStatus === "CANCELLED" && !isAlreadyCancelled) {
      const orderItems = await OrderItem.find({ order: order._id });
      for (const item of orderItems) {
        if (item.product) {
          const prod = await Product.findById(item.product);
          if (prod) {
            prod.stock += item.quantity;
            await prod.save();
          }
        }
      }
    }

    // 2. Stock restoration if moving to RETURNED (restock inventory)
    if (targetStatus === "RETURNED" && (data.restockInventory !== false)) {
      const orderItems = await OrderItem.find({ order: order._id });
      for (const item of orderItems) {
        if (item.product) {
          const prod = await Product.findById(item.product);
          if (prod) {
            prod.stock += item.quantity;
            await prod.save();
          }
        }
      }
    }

    // 3. Status-specific updates
    if (targetStatus === "DISPATCHED") {
      if (!order.shipmentDetails) {
        order.shipmentDetails = {};
      }
      if (!order.shipmentDetails.dispatchedAt) {
        order.shipmentDetails.dispatchedAt = new Date();
      }
      if (order.codDetails) {
        order.codDetails.codStatus = "DISPATCHED";
        if (!order.codDetails.dispatchedAt) {
          order.codDetails.dispatchedAt = new Date();
        }
      }
    } else if (targetStatus === "DELIVERED") {
      if (!order.shipmentDetails) {
        order.shipmentDetails = {};
      }
      order.shipmentDetails.deliveredAt = new Date();
      // If COD and payment was PENDING, doorstep delivery means cash collected
      if (order.paymentMethod === "COD" && order.paymentStatus === "PENDING") {
        order.paymentStatus = "PAID";
      }
    } else if (targetStatus === "CONFIRMED") {
      if (order.codDetails && order.codDetails.codStatus === "PENDING_VERIFICATION") {
        order.codDetails.codStatus = "VERIFIED";
        order.codDetails.verifiedAt = new Date();
        order.codDetails.verifiedBy = user.userId;
      }
    }

    // 4. Update status and append to status history
    order.orderStatus = targetStatus;
    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status: targetStatus,
      changedAt: new Date(),
      changedBy: user.userId,
      notes: data.notes || `Order status updated to ${targetStatus} by ${user.role.toLowerCase()}`,
    });

    await order.save();

    return apiSuccess(
      {
        orderNumber: order.orderNumber,
        previousStatus: prevStatus,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        statusHistory: order.statusHistory,
      },
      `Order status successfully updated to ${targetStatus}.`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
