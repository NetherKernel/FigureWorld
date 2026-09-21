import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { Product } from "@/models/Product";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { createInvoiceForOrder } from "@/lib/invoice";

const codActionSchema = z.object({
  orderNumber: z.string().optional(),
  orderId: z.string().optional(),
  action: z.enum(["ACCEPT", "MARK_VERIFIED", "REJECT", "LOG_CALL", "DISPATCH", "CANCEL"]),
  callStatus: z.enum(["ANSWERED", "NO_ANSWER", "BUSY", "CALLBACK_REQUESTED"]).optional(),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
  cancellationReason: z.string().optional(),
  courierPartner: z.string().optional(),
  trackingNumber: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required for COD verification actions.");
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Forbidden: Admin or Staff privileges required to manage COD orders.");
    }

    const data = await validateRequestBody(req, codActionSchema);

    if (!data.orderNumber && !data.orderId) {
      throw new ValidationError("Either orderNumber or orderId must be provided.");
    }

    await connectToDatabase();

    const order = data.orderId
      ? await Order.findById(data.orderId)
      : await Order.findOne({ orderNumber: data.orderNumber?.toUpperCase() });

    if (!order) {
      throw new NotFoundError("Order not found.");
    }

    if (order.paymentMethod !== "COD") {
      throw new ValidationError(`Order "${order.orderNumber}" is not a Cash on Delivery order.`);
    }

    if (!order.codDetails) {
      order.codDetails = {
        codStatus: "PENDING_VERIFICATION",
        callLogs: [],
      };
    }

    if (!Array.isArray(order.codDetails.callLogs)) {
      order.codDetails.callLogs = [];
    }

    switch (data.action) {
      case "LOG_CALL": {
        if (!data.callStatus) {
          throw new ValidationError("callStatus is required when logging a customer phone call.");
        }
        order.codDetails.callLogs.push({
          calledAt: new Date(),
          calledBy: user.email || String(user.userId),
          callStatus: data.callStatus,
          notes: data.notes || `Call marked as ${data.callStatus}`,
        });
        break;
      }

      case "ACCEPT":
      case "MARK_VERIFIED": {
        // COD Verified -> Order Confirmed
        order.codDetails.codStatus = "VERIFIED";
        order.orderStatus = "confirmed";
        order.codDetails.verifiedAt = new Date();
        order.codDetails.verifiedBy = user.userId;
        if (data.notes) {
          order.notes = (order.notes ? order.notes + " | " : "") + data.notes;
        }
        break;
      }

      case "DISPATCH": {
        // Must be verified or confirmed first
        if (order.codDetails.codStatus !== "VERIFIED" && order.orderStatus !== "confirmed") {
          throw new ValidationError(
            "COD order must be verified and confirmed with the customer before dispatch."
          );
        }
        order.codDetails.codStatus = "DISPATCHED";
        order.orderStatus = "shipped";
        order.codDetails.dispatchedAt = new Date();
        order.codDetails.courierPartner = data.courierPartner || "Blue Dart Express";
        order.codDetails.trackingNumber =
          data.trackingNumber || `BD-${Date.now().toString().slice(-6)}`;
        break;
      }

      case "REJECT": {
        // COD Rejected -> Cancelled & Restore Stock
        order.codDetails.codStatus = "REJECTED";
        order.orderStatus = "cancelled";
        order.codDetails.rejectionReason =
          data.rejectionReason || data.notes || "Customer rejected COD verification or phone unreachable.";

        // Restore reserved inventory stock
        const items = await OrderItem.find({ order: order._id });
        for (const item of items) {
          if (item.product) {
            const product = await Product.findById(item.product);
            if (product) {
              product.stock += item.quantity;
              await product.save();
            }
          }
        }
        break;
      }

      case "CANCEL": {
        // Cancelled -> Restore Stock
        order.codDetails.codStatus = "CANCELLED";
        order.orderStatus = "cancelled";
        order.codDetails.cancellationReason =
          data.cancellationReason || data.notes || "COD Order cancelled by merchant or customer.";

        // Restore reserved inventory stock
        const items = await OrderItem.find({ order: order._id });
        for (const item of items) {
          if (item.product) {
            const product = await Product.findById(item.product);
            if (product) {
              product.stock += item.quantity;
              await product.save();
            }
          }
        }
        break;
      }
    }

    await order.save();

    if (data.action === "ACCEPT" || data.action === "MARK_VERIFIED") {
      try {
        await createInvoiceForOrder(order.orderNumber);
      } catch (invErr) {
        console.error("Invoice auto-generation error on COD accept:", invErr);
      }
    }

    return apiSuccess(
      {
        orderNumber: order.orderNumber,
        codDetails: order.codDetails,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
      },
      `COD action "${data.action}" processed successfully.`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
