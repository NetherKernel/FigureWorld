import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { Address } from "@/models/Address";
import { OrderItem } from "@/models/OrderItem";
import { Invoice } from "@/models/Invoice";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { logAdminAudit } from "@/lib/audit";
import { buildUpiUri, generateUpiQrDataUrl } from "@/lib/upi";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required to view order details.");
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Forbidden: Admin or Staff privileges required.");
    }

    const { orderNumber } = await params;
    if (!orderNumber) {
      throw new ValidationError("Order number or ID is required.");
    }

    await connectToDatabase();

    const cleanIdentifier = orderNumber.trim();
    let order: any = null;

    // Lookup by ObjectId if valid, or by orderNumber (case-insensitive)
    if (mongoose.Types.ObjectId.isValid(cleanIdentifier)) {
      order = await Order.findById(cleanIdentifier)
        .populate("shippingAddress")
        .populate("billingAddress")
        .populate({
          path: "customer",
          select: "name email phone role",
        });
    }

    if (!order) {
      order = await Order.findOne({
        orderNumber: { $regex: new RegExp(`^${cleanIdentifier}$`, "i") },
      })
        .populate("shippingAddress")
        .populate("billingAddress")
        .populate({
          path: "customer",
          select: "name email phone role",
        });
    }

    if (!order) {
      throw new NotFoundError(`Order "${cleanIdentifier}" not found.`);
    }

    // Fetch order items
    const items = await OrderItem.find({ order: order._id }).lean();

    // Harmonize shipment details (fallback to codDetails if COD)
    const courier =
      order.shipmentDetails?.courier ||
      order.codDetails?.courierPartner ||
      "";
    const trackingNumber =
      order.shipmentDetails?.trackingNumber ||
      order.codDetails?.trackingNumber ||
      "";
    const dispatchedAt =
      order.shipmentDetails?.dispatchedAt ||
      order.codDetails?.dispatchedAt ||
      null;

    const shippingAddress = order.shippingAddress
      ? {
          _id: order.shippingAddress._id?.toString(),
          fullName: order.shippingAddress.fullName,
          phone: order.shippingAddress.phone,
          streetLine1: order.shippingAddress.streetLine1,
          streetLine2: order.shippingAddress.streetLine2,
          landmark: order.shippingAddress.landmark,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          postalCode: order.shippingAddress.postalCode,
          country: order.shippingAddress.country || "India",
        }
      : null;

    return apiSuccess({
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
      customer: order.customer
        ? {
            id: order.customer._id?.toString(),
            name: order.customer.name,
            email: order.customer.email,
            phone: order.customer.phone,
          }
        : {
            name: shippingAddress?.fullName || "Guest Customer",
            email: order.customerEmail,
            phone: shippingAddress?.phone || "N/A",
          },
      shippingAddress,
      items: items.map((it: any) => ({
        _id: it._id?.toString(),
        product: it.product?.toString(),
        productTitle: it.productTitle,
        productSku: it.productSku,
        productImage: it.productImage,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        subtotal: it.subtotal,
        discountAmount: it.discountAmount || 0,
        total: it.total,
      })),
      pricing: order.pricing,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      paymentDetails: order.paymentDetails || null,
      codDetails: order.codDetails || null,
      shipment: {
        courier,
        trackingNumber,
        trackingUrl: order.shipmentDetails?.trackingUrl || "",
        dispatchedAt,
        estimatedDelivery: order.shipmentDetails?.estimatedDelivery || null,
        deliveredAt: order.shipmentDetails?.deliveredAt || null,
        shippingNotes: order.shipmentDetails?.shippingNotes || "",
      },
      statusHistory: order.statusHistory || [],
      invoiceNumber: order.invoiceNumber || null,
      invoiceId: order.invoiceId ? order.invoiceId.toString() : null,
      complianceVerified: order.complianceVerified || false,
      notes: order.notes || "",
      placedAt: order.placedAt || order.createdAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required.");
    }
    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Admin or Staff privileges required.");
    }

    const { orderNumber } = await params;
    if (!orderNumber) {
      throw new ValidationError("Order identifier is required.");
    }

    const body = await req.json();
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

    // Handle Custom Delivery Fee adjustment
    if (body.customShippingFee !== undefined) {
      const newShippingFee = Number(body.customShippingFee);
      if (isNaN(newShippingFee) || newShippingFee < 0) {
        throw new ValidationError("customShippingFee must be a non-negative number.");
      }

      const oldShippingFee = order.pricing.shippingFee;
      const oldGrandTotal = order.pricing.grandTotal;
      const subtotal = order.pricing.subtotal || 0;
      const discountTotal = order.pricing.discountTotal || 0;
      const taxTotal = order.pricing.taxTotal || 0;
      const newGrandTotal = Math.max(0, subtotal - discountTotal + taxTotal + newShippingFee);

      if (!order.pricing.isCustomShippingFee && order.pricing.originalShippingFee === undefined) {
        order.pricing.originalShippingFee = oldShippingFee;
      }

      order.pricing.shippingFee = newShippingFee;
      order.pricing.grandTotal = newGrandTotal;
      order.pricing.isCustomShippingFee = true;
      if (body.reason) {
        order.pricing.shippingFeeAdjustmentReason = body.reason;
        order.deliveryAdjustmentNotes = body.reason;
      }
      if (body.partnerType) {
        order.pricing.deliveryPartnerType = body.partnerType;
        order.deliveryPartnerType = body.partnerType;
      }

      // If pending UPI, recompute QR payload
      if (
        order.paymentMethod === "UPI" &&
        (order.paymentStatus === "PENDING" || order.paymentStatus === "pending")
      ) {
        const upiPayload = buildUpiUri({
          pa: order.paymentDetails?.merchantUpiId,
          am: newGrandTotal,
          tn: `Order_${order.orderNumber}`,
        });
        if (!order.paymentDetails) order.paymentDetails = {};
        order.paymentDetails.qrPayload = upiPayload;
      }

      // Sync invoice
      await Invoice.updateOne(
        { order: order._id },
        {
          $set: {
            "pricing.shippingFee": newShippingFee,
            "pricing.grandTotal": newGrandTotal,
          },
        }
      );

      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        status: order.orderStatus,
        changedAt: new Date(),
        changedBy: user.userId,
        notes: `Delivery cost adjusted to ₹${newShippingFee} (${body.reason || "Admin update"})`,
      });

      order.markModified("pricing");
      order.markModified("paymentDetails");
      order.markModified("statusHistory");
      await order.save();

      await logAdminAudit({
        action: "CUSTOMIZE_ORDER_DELIVERY_FEE",
        actor: user,
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
          reason: body.reason,
        },
        req,
      });

      return apiSuccess({
        orderNumber: order.orderNumber,
        pricing: order.pricing,
      }, "Order delivery fee customized successfully");
    }

    // Generic notes update if provided
    if (body.notes !== undefined) {
      order.notes = body.notes;
      await order.save();
      return apiSuccess({ orderNumber: order.orderNumber, notes: order.notes });
    }

    return apiSuccess({ orderNumber: order.orderNumber });
  } catch (error) {
    return handleApiError(error);
  }
}
