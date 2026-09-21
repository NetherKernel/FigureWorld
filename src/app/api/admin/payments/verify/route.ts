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

const verifyPaymentSchema = z.object({
  orderNumber: z.string().optional(),
  orderId: z.string().optional(),
  action: z.enum(["CONFIRM", "REJECT", "EXPIRE", "REFUND"]),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required for payment verification.");
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Forbidden: Admin or Staff privileges required to verify payments.");
    }

    const data = await validateRequestBody(req, verifyPaymentSchema);

    if (!data.orderNumber && !data.orderId) {
      throw new ValidationError("Either orderNumber or orderId must be provided.");
    }

    await connectToDatabase();

    const order = data.orderId
      ? await Order.findById(data.orderId)
      : await Order.findOne({ orderNumber: data.orderNumber?.toUpperCase() });

    if (!order) {
      throw new NotFoundError(`Order not found.`);
    }

    if (!order.paymentDetails) {
      order.paymentDetails = {};
    }

    if (data.action === "CONFIRM") {
      // Payment confirmed -> Order confirmed
      order.paymentStatus = "PAID";
      order.orderStatus = "confirmed";
      order.paymentDetails.verifiedAt = new Date();
      order.paymentDetails.verifiedBy = user.userId;
      if (data.notes) {
        order.paymentDetails.verificationNotes = data.notes;
      }
    } else if (data.action === "REJECT") {
      // Payment failed/rejected -> Order cancelled & inventory restored
      order.paymentStatus = "FAILED";
      order.orderStatus = "cancelled";
      order.paymentDetails.rejectionReason =
        data.rejectionReason || data.notes || "Transaction reference could not be verified with bank.";

      // Restore inventory stock
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
    } else if (data.action === "EXPIRE") {
      // Payment expired -> Order cancelled & inventory restored
      order.paymentStatus = "EXPIRED";
      order.orderStatus = "cancelled";
      order.paymentDetails.rejectionReason = "Payment session expired without valid transaction reference.";

      // Restore inventory stock
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
    } else if (data.action === "REFUND") {
      order.paymentStatus = "REFUNDED";
      order.orderStatus = "refunded";
      if (data.notes) {
        order.paymentDetails.verificationNotes = `Refunded: ${data.notes}`;
      }
    }

    await order.save();

    if (data.action === "CONFIRM") {
      try {
        await createInvoiceForOrder(order.orderNumber);
      } catch (invErr) {
        console.error("Invoice auto-generation error:", invErr);
      }
    }

    return apiSuccess(
      {
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        paymentDetails: order.paymentDetails,
      },
      `Payment ${data.action} processed successfully.`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
