import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { NotificationService } from "@/lib/notifications";
import { generateTrackingUrl, calculateExpectedDelivery } from "@/lib/shipping";
import { findSupabaseOrder } from "@/lib/orders-supabase";

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
    const order = await findSupabaseOrder(orderNumber);

    if (!order) {
      throw new NotFoundError(`Order "${orderNumber}" not found.`);
    }

    const dispatchDate = data.dispatchDate ? new Date(data.dispatchDate) : new Date();
    const expectedDeliveryDate = data.expectedDeliveryDate
      ? new Date(data.expectedDeliveryDate)
      : calculateExpectedDelivery(dispatchDate, data.courier);

    const finalTrackingUrl =
      data.trackingUrl && data.trackingUrl.trim().length > 0
        ? data.trackingUrl.trim()
        : generateTrackingUrl(data.courier, data.trackingNumber);

    const shippingDetails = order.shipping_details || {};
    shippingDetails.courier = data.courier.trim();
    shippingDetails.trackingNumber = data.trackingNumber.trim();
    shippingDetails.trackingUrl = finalTrackingUrl;
    shippingDetails.dispatchedAt = dispatchDate.toISOString();
    shippingDetails.estimatedDelivery = expectedDeliveryDate.toISOString();
    if (data.shippingNotes) {
      shippingDetails.shippingNotes = data.shippingNotes.trim();
    }

    const codDetails = order.cod_details || {};
    if (order.payment_method === "COD" && codDetails) {
      codDetails.courierPartner = data.courier.trim();
      codDetails.trackingNumber = data.trackingNumber.trim();
      codDetails.dispatchedAt = dispatchDate.toISOString();
      if (data.autoDispatch) {
        codDetails.codStatus = "DISPATCHED";
      }
    }

    let targetStatus = order.order_status;
    const statusHistory = Array.isArray(order.status_history) ? [...order.status_history] : [];

    if (data.autoDispatch && order.order_status !== "DISPATCHED") {
      targetStatus = "DISPATCHED";
      statusHistory.push({
        status: "DISPATCHED",
        changedAt: dispatchDate.toISOString(),
        changedBy: user.userId,
        notes: `Dispatched via ${data.courier} (AWB: ${data.trackingNumber})`,
      });
    }

    // Update in Supabase orders
    await supabase
      .from("orders")
      .update({
        order_status: targetStatus,
        shipping_details: shippingDetails,
        cod_details: codDetails,
        status_history: statusHistory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    // Insert or update in Supabase shipments table
    try {
      await supabase.from("shipments").upsert({
        order_id: order.id,
        order_number: order.order_number,
        courier: data.courier.trim(),
        tracking_number: data.trackingNumber.trim(),
        tracking_url: finalTrackingUrl,
        dispatch_date: dispatchDate.toISOString(),
        expected_delivery_date: expectedDeliveryDate.toISOString(),
        status: "DISPATCHED",
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Supabase shipment upsert error:", e);
    }

    // Notify customer
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
        orderNumber: order.order_number,
        orderStatus: targetStatus,
        shipment: {
          courier: shippingDetails.courier,
          trackingNumber: shippingDetails.trackingNumber,
          trackingUrl: shippingDetails.trackingUrl,
          dispatchedAt: shippingDetails.dispatchedAt,
          estimatedDelivery: shippingDetails.estimatedDelivery,
          shippingNotes: shippingDetails.shippingNotes,
        },
      },
      `Shipment details registered and order marked as DISPATCHED.`
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = PATCH;
