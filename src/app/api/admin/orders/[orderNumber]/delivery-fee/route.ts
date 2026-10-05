import mongoose from "mongoose";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { Invoice } from "@/models/Invoice";
import { Address } from "@/models/Address";
import { OrderItem } from "@/models/OrderItem";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { validateRequestBody } from "@/lib/validation";
import { logAdminAudit } from "@/lib/audit";
import { buildUpiUri, generateUpiQrDataUrl } from "@/lib/upi";
import { NotFoundError, ValidationError } from "@/lib/errors";

const customizeDeliveryFeeSchema = z.object({
  customShippingFee: z.number().min(0, "Delivery fee cannot be negative"),
  reason: z.string().min(2, "Reason for delivery fee customization is required"),
  partnerType: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    await requireRole(req, "ADMIN", "STAFF");
    const { orderNumber } = await params;
    if (!orderNumber) {
      throw new ValidationError("Order identifier is required.");
    }

    await connectToDatabase();
    const cleanId = orderNumber.trim();

    let order: any = null;
    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      order = await Order.findById(cleanId)
        .populate("shippingAddress")
        .populate({ path: "customer", select: "name email phone" });
    }

    if (!order) {
      order = await Order.findOne({
        orderNumber: { $regex: new RegExp(`^${cleanId}$`, "i") },
      })
        .populate("shippingAddress")
        .populate({ path: "customer", select: "name email phone" });
    }

    if (!order) {
      throw new NotFoundError(`Order "${cleanId}" not found.`);
    }

    const items = await OrderItem.find({ order: order._id }).lean();

    return apiSuccess({
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
      customer: order.customer,
      shippingAddress: order.shippingAddress,
      pricing: order.pricing,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      deliveryPartnerType: order.deliveryPartnerType || order.pricing.deliveryPartnerType || "LOCAL_COURIER",
      itemsCount: items.length,
      items: items.map((it: any) => ({
        productTitle: it.productTitle,
        quantity: it.quantity,
        total: it.total,
      })),
      upiQrDataUrl: order.paymentDetails?.qrPayload
        ? await generateUpiQrDataUrl(order.paymentDetails.qrPayload)
        : null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const authUser = await requireRole(req, "ADMIN");
    const { orderNumber } = await params;
    if (!orderNumber) {
      throw new ValidationError("Order identifier is required.");
    }

    const data = await validateRequestBody(req, customizeDeliveryFeeSchema);

    await connectToDatabase();
    const cleanId = orderNumber.trim();

    let order: any = null;
    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      order = await Order.findById(cleanId).populate("shippingAddress");
    }

    if (!order) {
      order = await Order.findOne({
        orderNumber: { $regex: new RegExp(`^${cleanId}$`, "i") },
      }).populate("shippingAddress");
    }

    if (!order) {
      throw new NotFoundError(`Order "${cleanId}" not found.`);
    }

    const oldShippingFee = order.pricing.shippingFee;
    const oldGrandTotal = order.pricing.grandTotal;
    const newShippingFee = data.customShippingFee;

    // Recalculate Grand Total
    const subtotal = order.pricing.subtotal || 0;
    const discountTotal = order.pricing.discountTotal || 0;
    const taxTotal = order.pricing.taxTotal || 0;
    const newGrandTotal = Math.max(0, subtotal - discountTotal + taxTotal + newShippingFee);

    // Save previous fee if not already customized
    if (!order.pricing.isCustomShippingFee && order.pricing.originalShippingFee === undefined) {
      order.pricing.originalShippingFee = oldShippingFee;
    }

    order.pricing.shippingFee = newShippingFee;
    order.pricing.grandTotal = newGrandTotal;
    order.pricing.isCustomShippingFee = true;
    order.pricing.shippingFeeAdjustmentReason = data.reason;
    if (data.partnerType) {
      order.pricing.deliveryPartnerType = data.partnerType;
      order.deliveryPartnerType = data.partnerType;
    }
    order.deliveryAdjustmentNotes = data.reason;

    // If UPI payment is pending, recalculate UPI Intent & QR payload so the customer pays exact amount
    let updatedQrDataUrl = null;
    if (
      order.paymentMethod === "UPI" &&
      (order.paymentStatus === "PENDING" || order.paymentStatus === "pending")
    ) {
      const upiPayload = buildUpiUri({
        pa: order.paymentDetails?.merchantUpiId,
        am: newGrandTotal,
        tn: `Order_${order.orderNumber}`,
      });

      if (!order.paymentDetails) {
        order.paymentDetails = {};
      }
      order.paymentDetails.qrPayload = upiPayload;
      updatedQrDataUrl = await generateUpiQrDataUrl(upiPayload);
    }

    // Sync any linked Invoice record
    await Invoice.updateOne(
      { order: order._id },
      {
        $set: {
          "pricing.shippingFee": newShippingFee,
          "pricing.grandTotal": newGrandTotal,
        },
      }
    );

    // Append to statusHistory
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status: order.orderStatus,
      changedAt: new Date(),
      changedBy: authUser.userId,
      notes: `Delivery cost adjusted by Admin from ₹${oldShippingFee} to ₹${newShippingFee} (${data.reason})`,
    });

    order.markModified("pricing");
    order.markModified("paymentDetails");
    order.markModified("statusHistory");
    await order.save();

    await logAdminAudit({
      action: "CUSTOMIZE_ORDER_DELIVERY_FEE",
      actor: authUser,
      resource: {
        type: "ORDER",
        id: order._id.toString(),
        identifier: order.orderNumber,
      },
      details: {
        orderNumber: order.orderNumber,
        oldShippingFee,
        newShippingFee,
        oldGrandTotal,
        newGrandTotal,
        partnerType: data.partnerType,
        reason: data.reason,
      },
      req,
    });

    return apiSuccess(
      {
        orderNumber: order.orderNumber,
        pricing: order.pricing,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        qrPayload: order.paymentDetails?.qrPayload,
        qrDataUrl: updatedQrDataUrl,
      },
      `Delivery fee for order ${order.orderNumber} successfully updated to ₹${newShippingFee} (Grand Total: ₹${newGrandTotal})`
    );
  } catch (err) {
    return handleApiError(err);
  }
}
