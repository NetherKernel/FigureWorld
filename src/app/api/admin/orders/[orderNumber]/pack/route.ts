import { z } from "zod";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";

const packOrderSchema = z.object({
  notes: z.string().optional(),
  packageWeightGrams: z.number().optional(),
  boxSize: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required.");
    }
    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Forbidden: Admin or Staff privileges required.");
    }

    const { orderNumber } = await params;
    if (!orderNumber) {
      throw new ValidationError("Order number is required.");
    }

    const data = await validateRequestBody(req, packOrderSchema);

    await connectToDatabase();
    const cleanId = orderNumber.trim();

    let order: any = null;
    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      order = await Order.findById(cleanId);
    }
    if (!order) {
      order = await Order.findOne({
        orderNumber: { $regex: new RegExp(`^${cleanId}$`, "i") },
      });
    }

    if (!order) {
      throw new NotFoundError(`Order "${cleanId}" not found.`);
    }

    // Must be in CONFIRMED or PROCESSING state to pack
    const currentStatus = (order.orderStatus || "").toUpperCase();
    if (!["CONFIRMED", "PROCESSING", "confirmed", "processing"].includes(order.orderStatus)) {
      throw new ValidationError(
        `Cannot pack order in '${currentStatus}' status. Order must be CONFIRMED or PROCESSING.`
      );
    }

    order.orderStatus = "PACKED";

    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    const noteText = data.notes
      ? `Order packed by ${user.role.toLowerCase()}: ${data.notes}`
      : `Order picked, inspected, and packed into secure shipping carton.`;

    order.statusHistory.push({
      status: "PACKED",
      changedAt: new Date(),
      changedBy: user.userId,
      notes: noteText,
    });

    if (!order.shipmentDetails) {
      order.shipmentDetails = {};
    }
    if (data.boxSize) {
      order.shipmentDetails.shippingNotes = `Box Size: ${data.boxSize}${data.packageWeightGrams ? `, Weight: ${data.packageWeightGrams}g` : ""}`;
    }

    await order.save();

    return apiSuccess(
      {
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        statusHistory: order.statusHistory,
      },
      `Order #${order.orderNumber} successfully marked as PACKED.`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
