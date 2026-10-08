import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { NotificationService } from "@/lib/notifications";
import { findSupabaseOrder } from "@/lib/orders-supabase";

const sendNotificationSchema = z.object({
  type: z.enum([
    "ORDER_CONFIRMATION",
    "PAYMENT_CONFIRMATION",
    "INVOICE",
    "DISPATCH",
    "DELIVERY",
    "CUSTOM",
  ]),
  customMessage: z.string().optional(),
  phoneOverride: z.string().optional(),
});

export async function GET(
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

    const order = await findSupabaseOrder(orderNumber);
    if (!order) {
      throw new NotFoundError(`Order "${orderNumber}" not found.`);
    }

    const logs = await NotificationService.getOrderNotifications(order.order_number);

    return apiSuccess({
      orderNumber: order.order_number,
      totalNotifications: logs.length,
      notifications: logs,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

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

    const data = await validateRequestBody(req, sendNotificationSchema);
    const order = await findSupabaseOrder(orderNumber);

    if (!order) {
      throw new NotFoundError(`Order "${orderNumber}" not found.`);
    }

    let result: any = null;
    switch (data.type) {
      case "ORDER_CONFIRMATION":
        result = await NotificationService.sendOrderConfirmation(order);
        break;
      case "PAYMENT_CONFIRMATION":
        result = await NotificationService.sendPaymentConfirmation(order);
        break;
      case "INVOICE":
        result = await NotificationService.sendInvoice(order);
        break;
      case "DISPATCH":
        result = await NotificationService.sendDispatchDetails(order);
        break;
      case "DELIVERY":
        result = await NotificationService.sendDeliveryUpdate(order);
        break;
      case "CUSTOM":
        if (!data.customMessage) {
          throw new ValidationError("customMessage is required for CUSTOM notification type.");
        }
        result = await NotificationService.sendCustomNotification(order, {
          message: data.customMessage,
          phoneOverride: data.phoneOverride,
        });
        break;
    }

    return apiSuccess(
      {
        orderNumber: order.order_number,
        notification: result,
      },
      "WhatsApp notification queued successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
