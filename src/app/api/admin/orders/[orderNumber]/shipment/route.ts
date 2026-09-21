import { z } from "zod";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { Address } from "@/models/Address";
import { Shipment } from "@/models/Shipment";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { NotificationService } from "@/lib/notifications";
import { generateTrackingUrl, calculateExpectedDelivery } from "@/lib/shipping";

const updateShipmentSchema = z.object({
  courier: z.string().min(2, "Courier name is required"),
  trackingNumber: z.string().min(3, "Tracking number must be at least 3 characters"),
  dispatchDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  trackingUrl: z.string().optional(),
  shippingNotes: z.string().optional(),
  autoDispatch: z.boolean().default(true),
  notifyCustomer: z.boolean().default(true),
  provider: z.enum(["MANUAL", "SHIPROCKET", "DELHIVERY", "BLUEDART", "DTDC"]).default("MANUAL"),
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

    // 1. Resolve Dispatch Date
    const dispatchDate = data.dispatchDate ? new Date(data.dispatchDate) : new Date();

    // 2. Resolve Expected Delivery Date
    const expectedDeliveryDate = data.expectedDeliveryDate
      ? new Date(data.expectedDeliveryDate)
      : calculateExpectedDelivery(dispatchDate, data.courier);

    // 3. Resolve Dynamic Tracking URL
    const finalTrackingUrl =
      data.trackingUrl && data.trackingUrl.trim().length > 0
        ? data.trackingUrl.trim()
        : generateTrackingUrl(data.courier, data.trackingNumber);

    // 4. Update Order Shipment Details
    order.shipmentDetails.courier = data.courier.trim();
    order.shipmentDetails.trackingNumber = data.trackingNumber.trim();
    order.shipmentDetails.trackingUrl = finalTrackingUrl;
    order.shipmentDetails.dispatchedAt = dispatchDate;
    order.shipmentDetails.estimatedDelivery = expectedDeliveryDate;
    if (data.shippingNotes) {
      order.shipmentDetails.shippingNotes = data.shippingNotes.trim();
    }

    // 5. Sync with COD details if COD order
    if (order.paymentMethod === "COD" && order.codDetails) {
      order.codDetails.courierPartner = data.courier.trim();
      order.codDetails.trackingNumber = data.trackingNumber.trim();
      order.codDetails.dispatchedAt = dispatchDate;
      if (data.autoDispatch) {
        order.codDetails.codStatus = "DISPATCHED";
      }
    }

    // 6. Transition Order Status to DISPATCHED
    if (data.autoDispatch && order.orderStatus !== "DISPATCHED") {
      order.orderStatus = "DISPATCHED";
      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        status: "DISPATCHED",
        changedAt: dispatchDate,
        changedBy: user.userId,
        notes: `Dispatched via ${data.courier} (AWB: ${data.trackingNumber})`,
      });
    }

    await order.save();

    // 7. Resolve Customer Address for Shipment model record
    let addressDoc: any = null;
    if (order.shippingAddress) {
      if (typeof order.shippingAddress === "object" && (order.shippingAddress as any).fullName) {
        addressDoc = order.shippingAddress;
      } else {
        addressDoc = await Address.findById(order.shippingAddress);
      }
    }

    // 8. Create or Update Canonical Shipment Record in MongoDB
    try {
      await Shipment.findOneAndUpdate(
        { orderNumber: order.orderNumber },
        {
          $set: {
            order: order._id,
            orderNumber: order.orderNumber,
            trackingNumber: data.trackingNumber.trim(),
            courierName: data.courier.trim(),
            trackingUrl: finalTrackingUrl,
            dispatchDate,
            expectedDeliveryDate,
            shippedAt: dispatchDate,
            status: "DISPATCHED",
            provider: data.provider,
            customerName: addressDoc?.fullName || order.customerEmail,
            customerPhone: addressDoc?.phone || "",
            shippingNotes: data.shippingNotes || "",
          },
          $push: {
            events: {
              timestamp: dispatchDate,
              status: "DISPATCHED",
              location: "FiguresWorld Warehouse, Mumbai",
              description: `Handed over to carrier ${data.courier}. AWB: ${data.trackingNumber}`,
            },
          },
        },
        { upsert: true, new: true }
      );
    } catch (shipmentErr) {
      console.error("Failed to sync Shipment record:", shipmentErr);
    }

    // 9. Automatically Notify Customer
    if (data.notifyCustomer !== false) {
      try {
        await NotificationService.sendDispatchDetails(order, {
          courier: data.courier.trim(),
          trackingNumber: data.trackingNumber.trim(),
          trackingUrl: finalTrackingUrl,
          dispatchDate,
          expectedDeliveryDate,
        });
      } catch (notifErr) {
        console.error("WhatsApp dispatch notification error:", notifErr);
      }
    }

    return apiSuccess(
      {
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        shipment: {
          courier: order.shipmentDetails.courier,
          trackingNumber: order.shipmentDetails.trackingNumber,
          trackingUrl: order.shipmentDetails.trackingUrl,
          dispatchedAt: order.shipmentDetails.dispatchedAt,
          estimatedDelivery: order.shipmentDetails.estimatedDelivery,
          shippingNotes: order.shipmentDetails.shippingNotes,
        },
      },
      `Shipment details registered and order marked as DISPATCHED.`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
