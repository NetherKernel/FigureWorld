import { z } from "zod";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { NotificationLog } from "@/models/NotificationLog";
import { NotificationService } from "@/lib/notifications";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";

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

    await connectToDatabase();
    const cleanNumber = orderNumber.trim();

    // Verify order exists
    let order: any = null;
    if (mongoose.Types.ObjectId.isValid(cleanNumber)) {
      order = await Order.findById(cleanNumber);
    }
    if (!order) {
      order = await Order.findOne({
        orderNumber: { $regex: new RegExp(`^${cleanNumber}$`, "i") },
      });
    }

    if (!order) {
      throw new NotFoundError(`Order "${cleanNumber}" not found.`);
    }

    const logs = await NotificationService.getOrderNotifications(order.orderNumber);

    return apiSuccess({
      orderNumber: order.orderNumber,
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

    await connectToDatabase();
    const cleanNumber = orderNumber.trim();

    let order: any = null;
    if (mongoose.Types.ObjectId.isValid(cleanNumber)) {
      order = await Order.findById(cleanNumber);
    }
    if (!order) {
      order = await Order.findOne({
        orderNumber: { $regex: new RegExp(`^${cleanNumber}$`, "i") },
      });
    }

    if (!order) {
      throw new NotFoundError(`Order "${cleanNumber}" not found.`);
    }

    let dispatchedLog: any = null;

    switch (data.type) {
      case "ORDER_CONFIRMATION":
        dispatchedLog = await NotificationService.sendOrderConfirmation(order, {
          phoneOverride: data.phoneOverride,
          customNote: data.customMessage,
        });
        break;

      case "PAYMENT_CONFIRMATION":
        dispatchedLog = await NotificationService.sendPaymentConfirmation(order, {
          phoneOverride: data.phoneOverride,
        });
        break;

      case "INVOICE":
        dispatchedLog = await NotificationService.sendInvoice(order, undefined, {
          phoneOverride: data.phoneOverride,
        });
        break;

      case "DISPATCH":
        dispatchedLog = await NotificationService.sendDispatchDetails(order, {
          phoneOverride: data.phoneOverride,
        });
        break;

      case "DELIVERY":
        dispatchedLog = await NotificationService.sendDeliveryUpdate(order, {
          phoneOverride: data.phoneOverride,
          deliveryNotes: data.customMessage,
        });
        break;

      case "CUSTOM":
        if (!data.customMessage) {
          throw new ValidationError("customMessage is required for CUSTOM notifications.");
        }
        // Custom WhatsApp message
        dispatchedLog = await NotificationService.sendOrderConfirmation(order, {
          phoneOverride: data.phoneOverride,
          customNote: data.customMessage,
        });
        break;
    }

    return apiSuccess(
      {
        orderNumber: order.orderNumber,
        notification: dispatchedLog,
      },
      `WhatsApp ${data.type} notification sent successfully.`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
