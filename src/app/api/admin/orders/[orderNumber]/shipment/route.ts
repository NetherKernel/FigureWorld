import { z } from "zod";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";

const updateShipmentSchema = z.object({
  courier: z.string().min(2, "Courier name is required"),
  trackingNumber: z.string().min(3, "Tracking number must be at least 3 characters"),
  trackingUrl: z.string().optional(),
  shippingNotes: z.string().optional(),
  autoDispatch: z.boolean().default(false),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required to update shipment details.");
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Forbidden: Admin or Staff privileges required.");
    }

    const { orderNumber } = await params;
    if (!orderNumber) {
      throw new ValidationError("Order number or ID is required.");
    }

    const data = await validateRequestBody(req, updateShipmentSchema);

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

    if (!order.shipmentDetails) {
      order.shipmentDetails = {};
    }

    // Default tracking URL if not provided
    let finalTrackingUrl = data.trackingUrl;
    if (!finalTrackingUrl && data.courier.toLowerCase().includes("blue dart")) {
      finalTrackingUrl = `https://www.bluedart.com/tracking?track=${encodeURIComponent(data.trackingNumber)}`;
    } else if (!finalTrackingUrl && data.courier.toLowerCase().includes("delhivery")) {
      finalTrackingUrl = `https://www.delhivery.com/track/package/${encodeURIComponent(data.trackingNumber)}`;
    }

    order.shipmentDetails.courier = data.courier.trim();
    order.shipmentDetails.trackingNumber = data.trackingNumber.trim();
    order.shipmentDetails.trackingUrl = finalTrackingUrl;
    if (data.shippingNotes) {
      order.shipmentDetails.shippingNotes = data.shippingNotes;
    }
    if (!order.shipmentDetails.dispatchedAt) {
      order.shipmentDetails.dispatchedAt = new Date();
    }

    // Sync with COD details if COD order
    if (order.paymentMethod === "COD" && order.codDetails) {
      order.codDetails.courierPartner = data.courier.trim();
      order.codDetails.trackingNumber = data.trackingNumber.trim();
      if (!order.codDetails.dispatchedAt) {
        order.codDetails.dispatchedAt = new Date();
      }
      if (data.autoDispatch) {
        order.codDetails.codStatus = "DISPATCHED";
      }
    }

    // Auto-advance to DISPATCHED if requested
    if (data.autoDispatch && order.orderStatus !== "DISPATCHED") {
      order.orderStatus = "DISPATCHED";
      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        status: "DISPATCHED",
        changedAt: new Date(),
        changedBy: user.userId,
        notes: `Dispatched via ${data.courier} (AWB: ${data.trackingNumber})`,
      });
    }

    await order.save();

    return apiSuccess(
      {
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        shipment: {
          courier: order.shipmentDetails.courier,
          trackingNumber: order.shipmentDetails.trackingNumber,
          trackingUrl: order.shipmentDetails.trackingUrl,
          dispatchedAt: order.shipmentDetails.dispatchedAt,
          shippingNotes: order.shipmentDetails.shippingNotes,
        },
      },
      "Shipment details updated successfully."
    );
  } catch (error) {
    return handleApiError(error);
  }
}
