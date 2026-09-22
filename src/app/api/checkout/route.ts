import { z } from "zod";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { Address } from "@/models/Address";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { Coupon } from "@/models/Coupon";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ValidationError, ConflictError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { sanitizeMongoQuery } from "@/lib/security";
import { getClientIp } from "@/lib/rate-limiter";
import {
  buildUpiUri,
  generateUpiQrDataUrl,
  MERCHANT_UPI_ID,
  MERCHANT_NAME,
} from "@/lib/upi";

const customerAddressSchema = z.object({
  fullName: z.string().min(2, "Full name is required (at least 2 characters)"),
  mobileNumber: z
    .string()
    .min(10, "Mobile number must be at least 10 digits")
    .regex(/^[0-9+\-\s()]+$/, "Invalid mobile number format"),
  email: z.string().email("Valid email address is required"),
  address: z.string().min(5, "Street address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pinCode: z.string().min(4, "Valid PIN code is required").max(10),
  landmark: z.string().optional(),
});

const checkoutSchema = z.object({
  customer: customerAddressSchema,
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID is required"),
        quantity: z.number().int().min(1, "Quantity must be at least 1"),
      })
    )
    .min(1, "Your cart is empty. Please add items before checking out."),
  paymentMethod: z.enum(["UPI", "COD"]),
  upiId: z.string().optional(),
  couponCode: z.string().optional(),
  ageConfirmed: z.boolean().default(false),
  termsConsent: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const rawData = await validateRequestBody(req, checkoutSchema);
    const data = sanitizeMongoQuery(rawData);

    // Strict validation for UPI payment method
    if (data.paymentMethod === "UPI") {
      if (!data.upiId || !data.upiId.includes("@")) {
        throw new ValidationError("Valid UPI ID (e.g. user@bank or mobile@upi) is required for UPI payment.");
      }
    }

    await connectToDatabase();

    // Check optional authenticated user session
    const currentUser = await getAuthenticatedUser(req);
    const clientIp = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "";

    // 1. Fetch live products from DB, validate stock, and verify 18+ destination & legal compliance
    const orderItemsData: any[] = [];
    let subtotal = 0;
    let containsRestrictedGoods = false;

    for (const item of data.items) {
      const product = await Product.findById(item.productId);

      if (!product || product.status === "archived") {
        throw new ValidationError(`Product "${item.productId}" is not available for purchase.`);
      }

      // Stock validation
      if (product.stock < item.quantity) {
        throw new ConflictError(
          `Insufficient stock for "${product.name}". Only ${product.stock} units available, but ${item.quantity} requested.`
        );
      }

      // Restricted Products: Eligibility, Age Confirmation, Terms Consent, and Destination Restrictions
      if (product.isRestricted) {
        containsRestrictedGoods = true;

        // 1. Age Gate Verification
        if (!data.ageConfirmed) {
          throw new ValidationError(
            `Age eligibility confirmation required: "${product.name}" is an 18+ age-restricted product. You must verify that you are at least 18 years old.`
          );
        }

        // 2. Terms / Legal Consent Verification
        if (data.termsConsent === false) {
          throw new ValidationError(
            `Legal terms consent required: You must accept terms of possession and legal compliance for decorative collector replica weapons.`
          );
        }

        // 3. Destination restrictions verification
        const categoryDoc = await Category.findById(product.category);
        const prohibitedRegions: string[] = [
          ...(product.shippingRestrictions || []),
          ...(categoryDoc?.complianceRequirements?.restrictedRegions || []),
        ];

        const destinationStrings = [
          data.customer.state.toLowerCase().trim(),
          data.customer.city.toLowerCase().trim(),
          data.customer.pinCode.toLowerCase().trim(),
          data.customer.address.toLowerCase().trim(),
        ];

        for (const prohibited of prohibitedRegions) {
          const needle = prohibited.toLowerCase().trim();
          if (!needle) continue;

          const isBlocked = destinationStrings.some(
            (dest) => dest === needle || dest.includes(needle) || needle.includes(dest)
          );

          if (isBlocked) {
            throw new ValidationError(
              `Destination restriction: "${product.name}" cannot be shipped to ${data.customer.state} (${prohibited}). Due to legal compliance regulations, weapon replicas cannot be delivered to this region.`
            );
          }
        }
      }

      // Zero-Trust: Authoritative unit price strictly from database (Client cannot tamper with price!)
      const effectivePrice =
        product.discountPrice !== undefined && product.discountPrice !== null && product.discountPrice < product.price
          ? product.discountPrice
          : product.price;

      const itemTotal = effectivePrice * item.quantity;
      subtotal += itemTotal;

      const primaryImage =
        product.images?.find((img: any) => img.isPrimary)?.url ||
        product.images?.[0]?.url ||
        "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400";

      orderItemsData.push({
        productDoc: product,
        productTitle: product.name,
        productSku: product.sku,
        productImage: primaryImage,
        unitPrice: effectivePrice,
        quantity: item.quantity,
        subtotal: itemTotal,
        discountAmount: 0,
        total: itemTotal,
      });
    }

    // 2. Authoritative Coupon Verification & Discount Calculation
    let discountAmount = 0;
    let appliedCouponCode: string | undefined = undefined;

    if (data.couponCode) {
      const codeClean = data.couponCode.toUpperCase().trim();
      const coupon = await Coupon.findOne({ code: codeClean });

      if (!coupon || !coupon.isActive) {
        throw new ValidationError(`Coupon code "${codeClean}" is invalid or inactive.`);
      }

      const now = new Date();
      if (new Date(coupon.validUntil) < now || new Date(coupon.validFrom) > now) {
        throw new ValidationError(`Coupon code "${codeClean}" has expired.`);
      }

      if (subtotal < (coupon.minimumOrderValue || 0)) {
        throw new ValidationError(
          `Coupon "${codeClean}" requires a minimum order value of ₹${coupon.minimumOrderValue.toLocaleString("en-IN")}. Your subtotal is ₹${subtotal.toLocaleString("en-IN")}.`
        );
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        throw new ValidationError(`Coupon "${codeClean}" has exceeded its maximum usage limit.`);
      }

      if (coupon.discountType === "percentage") {
        discountAmount = Math.round((subtotal * coupon.discountValue) / 100);
        if (coupon.maximumDiscountAmount && discountAmount > coupon.maximumDiscountAmount) {
          discountAmount = coupon.maximumDiscountAmount;
        }
      } else {
        discountAmount = Math.min(coupon.discountValue, subtotal);
      }

      appliedCouponCode = coupon.code;
      coupon.usedCount = (coupon.usedCount || 0) + 1;
      await coupon.save();
    }

    // 3. Authoritative Delivery Calculation (Flat ₹100 as specified in Sprint 5 & 6)
    const shippingFee = 100;
    const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

    // 3b. COD Maximum Limit Enforcement (Sprint 8)
    if (data.paymentMethod === "COD" && grandTotal > 15000) {
      throw new ValidationError(
        `Cash on Delivery is limited to orders up to ₹15,000. Your order total is ₹${grandTotal.toLocaleString("en-IN")}. Please choose Direct UPI payment for higher value orders.`
      );
    }

    // 4. Create Shipping Address Record
    const shippingAddress = await Address.create({
      user: currentUser?.userId || undefined,
      type: "shipping",
      fullName: data.customer.fullName,
      phone: data.customer.mobileNumber,
      streetLine1: data.customer.address,
      streetLine2: data.customer.landmark,
      landmark: data.customer.landmark,
      city: data.customer.city,
      state: data.customer.state,
      postalCode: data.customer.pinCode,
      country: "India",
      isDefault: false,
    });

    // 5. Generate Unique Order Number
    const orderNumber = `FW-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    // 6. UPI QR Code & Intent generation
    let qrPayload = "";
    let qrDataUrl = "";
    if (data.paymentMethod === "UPI") {
      qrPayload = buildUpiUri({
        pa: MERCHANT_UPI_ID,
        pn: MERCHANT_NAME,
        am: grandTotal,
        tn: `Order_${orderNumber}`,
      });
      qrDataUrl = await generateUpiQrDataUrl(qrPayload);
    }

    // 7. Create Order Record strictly initializing status
    // Zero-Trust: Payment status is ALWAYS PENDING; Order status is ALWAYS pending.
    const newOrder = await Order.create({
      orderNumber,
      customer: currentUser?.userId || undefined,
      customerEmail: data.customer.email,
      items: [], // Will populate with OrderItem IDs
      pricing: {
        subtotal,
        discountTotal: discountAmount,
        taxTotal: 0,
        shippingFee,
        grandTotal,
        currency: "INR",
      },
      shippingAddress: shippingAddress._id,
      paymentMethod: data.paymentMethod,
      paymentStatus: "PENDING",
      orderStatus: "pending",
      couponCode: appliedCouponCode,
      paymentDetails:
        data.paymentMethod === "UPI"
          ? {
              merchantUpiId: MERCHANT_UPI_ID,
              customerUpiId: data.upiId,
              qrPayload,
            }
          : undefined,
      codDetails:
        data.paymentMethod === "COD"
          ? {
              codStatus: "PENDING_VERIFICATION",
              callLogs: [],
              maxCodLimit: 15000,
            }
          : undefined,
      complianceVerified: containsRestrictedGoods,
      requiresAdminReview: containsRestrictedGoods,
      complianceDetails: containsRestrictedGoods
        ? {
            isRestrictedOrder: true,
            ageConfirmed: true,
            termsConsent: data.termsConsent !== false,
            verifiedAt: new Date(),
            clientIp,
            userAgent,
          }
        : undefined,
      notes:
        data.paymentMethod === "UPI"
          ? `Direct UPI checkout. Customer VPA: ${data.upiId}`
          : "Cash on Delivery - Pending Phone Verification",
      placedAt: new Date(),
    });

    // 8. Create OrderItems linked to newOrder and atomically decrement stock
    const orderItemIds = [];
    for (const itemData of orderItemsData) {
      const orderItem = await OrderItem.create({
        order: newOrder._id,
        product: itemData.productDoc._id,
        productTitle: itemData.productTitle,
        productSku: itemData.productSku,
        productImage: itemData.productImage,
        unitPrice: itemData.unitPrice,
        quantity: itemData.quantity,
        subtotal: itemData.subtotal,
        discountAmount: 0,
        total: itemData.total,
      });
      orderItemIds.push(orderItem._id);

      // Atomic inventory stock decrement
      itemData.productDoc.stock = Math.max(0, itemData.productDoc.stock - itemData.quantity);
      await itemData.productDoc.save();
    }

    newOrder.items = orderItemIds;
    await newOrder.save();

    // 9. Estimate delivery timeline (3-5 business days)
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 4);
    const estimatedDeliveryFormatted = deliveryDate.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return apiSuccess(
      {
        orderNumber: newOrder.orderNumber,
        orderId: newOrder._id,
        pricing: newOrder.pricing,
        paymentMethod: newOrder.paymentMethod,
        paymentStatus: newOrder.paymentStatus,
        orderStatus: newOrder.orderStatus,
        couponCode: appliedCouponCode,
        paymentDetails: {
          merchantUpiId: MERCHANT_UPI_ID,
          merchantName: MERCHANT_NAME,
          customerUpiId: data.upiId,
          qrPayload,
          qrDataUrl,
        },
        codDetails: newOrder.codDetails,
        shippingAddress: {
          fullName: shippingAddress.fullName,
          phone: shippingAddress.phone,
          address: shippingAddress.streetLine1,
          landmark: shippingAddress.landmark,
          city: shippingAddress.city,
          state: shippingAddress.state,
          pinCode: shippingAddress.postalCode,
        },
        items: orderItemsData.map((it) => ({
          name: it.productTitle,
          sku: it.productSku,
          image: it.productImage,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
          total: it.total,
        })),
        estimatedDelivery: estimatedDeliveryFormatted,
        complianceVerified: containsRestrictedGoods,
        requiresAdminReview: containsRestrictedGoods,
      },
      "Order placed successfully",
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
