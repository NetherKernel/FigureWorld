import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { findSupabaseOrder } from "@/lib/orders-supabase";

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
    const order = await findSupabaseOrder(orderNumber);

    if (!order) {
      throw new NotFoundError(`Order "${orderNumber}" not found.`);
    }

    const currentStatus = (order.order_status || "").toUpperCase();
    if (!["CONFIRMED", "PROCESSING", "confirmed", "processing"].includes(order.order_status)) {
      throw new ValidationError(
        `Cannot pack order in '${currentStatus}' status. Order must be CONFIRMED or PROCESSING.`
      );
    }

    const statusHistory = Array.isArray(order.status_history) ? [...order.status_history] : [];
    const noteText = data.notes
      ? `Order packed by ${user.role.toLowerCase()}: ${data.notes}`
      : `Order picked, inspected, and packed into secure shipping carton.`;

    statusHistory.push({
      status: "PACKED",
      changedAt: new Date().toISOString(),
      changedBy: user.userId,
      notes: noteText,
    });

    const shipmentDetails = order.shipping_details || {};
    if (data.boxSize) {
      shipmentDetails.shippingNotes = `Box Size: ${data.boxSize}${data.packageWeightGrams ? `, Weight: ${data.packageWeightGrams}g` : ""}`;
    }

    await supabase
      .from("orders")
      .update({
        order_status: "PACKED",
        shipping_details: shipmentDetails,
        status_history: statusHistory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    return apiSuccess(
      {
        orderNumber: order.order_number,
        orderStatus: "PACKED",
        statusHistory,
      },
      `Order #${order.order_number} successfully marked as PACKED.`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
