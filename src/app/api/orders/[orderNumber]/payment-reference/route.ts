import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ValidationError, NotFoundError, ConflictError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";

const paymentRefSchema = z.object({
  transactionRef: z
    .string()
    .min(6, "Transaction reference / UTR ID must be at least 6 characters")
    .max(64, "Transaction reference cannot exceed 64 characters"),
  upiApp: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;

    if (!orderNumber) {
      throw new ValidationError("Order number is required");
    }

    const data = await validateRequestBody(req, paymentRefSchema);

    await connectToDatabase();

    const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() });

    if (!order) {
      throw new NotFoundError(`Order "${orderNumber}" not found`);
    }

    if (order.paymentMethod !== "UPI") {
      throw new ValidationError(`Order "${orderNumber}" is not configured for UPI payment.`);
    }

    const normalizedStatus = (order.paymentStatus || "").toUpperCase();

    if (normalizedStatus === "PAID") {
      throw new ConflictError("Payment for this order has already been verified and confirmed.");
    }

    if (normalizedStatus === "EXPIRED") {
      throw new ConflictError("This order payment window has expired. Please create a new order.");
    }

    // Move to UNDER_REVIEW - explicitly NOT confirmed!
    order.paymentStatus = "UNDER_REVIEW";
    order.orderStatus = "pending"; // Remains pending until admin verification!

    if (!order.paymentDetails) {
      order.paymentDetails = {};
    }

    order.paymentDetails.transactionRef = data.transactionRef.trim();
    order.paymentDetails.upiApp = data.upiApp?.trim() || "UPI App";
    order.paymentDetails.submittedAt = new Date();

    if (data.notes) {
      order.notes = data.notes.trim();
    }

    await order.save();

    return apiSuccess(
      {
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        transactionRef: order.paymentDetails.transactionRef,
        submittedAt: order.paymentDetails.submittedAt,
        message:
          "Payment reference submitted successfully. Your transaction is currently UNDER_REVIEW by our team.",
      },
      "Payment reference submitted for verification"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
