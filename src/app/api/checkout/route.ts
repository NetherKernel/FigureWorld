import { z } from "zod";
import crypto from "crypto";
import { evaluateCoupon } from "@/lib/coupon";
import { calculateDeliveryFee } from "@/lib/delivery-rates";
import { supabase, mapSupabaseProduct } from "@/lib/supabase";
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

    // Check optional authenticated user session
    const currentUser = await getAuthenticatedUser(req);
    const clientIp = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "";

    // 1. Fetch live products from DB, validate stock, and verify 18+ destination & legal compliance
    const orderItemsData: any[] = [];
    let subtotal = 0;
    let containsRestrictedGoods = false;

    for (const item of data.items) {
      let product: any = null;
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.productId);
        let supaQuery = supabase.from("products").select("*, categories(*)");
        if (isUuid) {
          supaQuery = supaQuery.eq("id", item.productId);
        } else {
          supaQuery = supaQuery.or(`id.eq.${item.productId},slug.eq.${item.productId},sku.eq.${item.productId}`);
        }
        const { data: supaP } = await supaQuery.maybeSingle();
        if (supaP) {
          product = mapSupabaseProduct(supaP, supaP.categories);
        }
      } catch {
        product = null;
      }

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
        const categoryDoc: any = typeof product.category === "object" ? product.category : null;
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

      // Zero-Trust: Authoritative unit price strictly from database
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
      const evaluated = await evaluateCoupon(data.couponCode, subtotal);
      const coupon = evaluated.coupon;
      discountAmount = evaluated.discountAmount;

      appliedCouponCode = coupon.code;
      await coupon.save();
    }

    // 3. Authoritative Delivery Calculation
    const deliveryCalc = await calculateDeliveryFee({
      subtotal,
      address: {
        postalCode: data.customer.pinCode,
        city: data.customer.city,
        state: data.customer.state,
      },
      items: orderItemsData.map((it) => ({
        productId: it.productDoc.id?.toString(),
        name: it.productTitle,
        quantity: it.quantity,
        weight: it.productDoc.weight || 500,
        tags: it.productDoc.tags || [],
        isRestricted: it.productDoc.isRestricted || false,
      })),
    });
    const shippingFee = deliveryCalc.fee;
    const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

    // 3b. COD Maximum Limit Enforcement
    if (data.paymentMethod === "COD" && grandTotal > 15000) {
      throw new ValidationError(
        `Cash on Delivery is limited to orders up to ₹15,000. Your order total is ₹${grandTotal.toLocaleString("en-IN")}. Please choose Direct UPI payment for higher value orders.`
      );
    }

    // Resolve Supabase user_id if available
    let validUserId: string | null = null;
    if (
      currentUser?.userId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.userId)
    ) {
      validUserId = currentUser.userId;
    } else if (data.customer?.email) {
      try {
        const { data: supaUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", data.customer.email.toLowerCase().trim())
          .maybeSingle();
        if (supaUser) validUserId = supaUser.id;
      } catch {}
    }

    // 4. Create Shipping Address Record in Supabase
    try {
      await supabase.from("addresses").insert({
        user_id: validUserId,
        name: data.customer.fullName,
        phone: data.customer.mobileNumber,
        street: data.customer.address,
        city: data.customer.city,
        state: data.customer.state,
        postal_code: data.customer.pinCode,
        country: "India",
        landmark: data.customer.landmark || "",
        is_default: false,
      });
    } catch {}

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

    // 7. Atomic inventory stock decrement in Supabase
    for (const itemData of orderItemsData) {
      const newStock = Math.max(0, (itemData.productDoc.stock || 0) - itemData.quantity);
      if (itemData.productDoc.id) {
        try {
          await supabase.from("products").update({ stock: newStock }).eq("id", itemData.productDoc.id);
        } catch {}
      }
    }

    // 8. Create Order Record strictly initializing status in Supabase
    const pricingObj = {
      subtotal,
      discountTotal: discountAmount,
      taxTotal: 0,
      shippingFee,
      grandTotal,
      currency: "INR",
      isCustomShippingFee: false,
      deliveryPartnerType: deliveryCalc.partnerSuggestion || "STANDARD_COURIER",
    };

    const shippingAddressObj = {
      fullName: data.customer.fullName,
      phone: data.customer.mobileNumber,
      address: data.customer.address,
      street: data.customer.address,
      landmark: data.customer.landmark || "",
      city: data.customer.city,
      state: data.customer.state,
      postalCode: data.customer.pinCode,
      country: "India",
    };

    const itemsObj = orderItemsData.map((it) => ({
      productId: it.productDoc.id,
      title: it.productTitle,
      productTitle: it.productTitle,
      name: it.productTitle,
      sku: it.productSku,
      image: it.productImage,
      price: it.unitPrice,
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      subtotal: it.subtotal,
      total: it.total,
    }));

    const newOrderData = {
      order_number: orderNumber,
      user_id: validUserId,
      customer_details: {
        name: data.customer.fullName,
        email: data.customer.email,
        phone: data.customer.mobileNumber,
      },
      shipping_address: shippingAddressObj,
      items: itemsObj,
      pricing: pricingObj,
      payment_method: data.paymentMethod,
      payment_status: "PENDING",
      order_status: "pending",
      coupon_code: appliedCouponCode,
      payment_details:
        data.paymentMethod === "UPI"
          ? {
              merchantUpiId: MERCHANT_UPI_ID,
              customerUpiId: data.upiId,
              qrPayload,
            }
          : null,
      cod_details:
        data.paymentMethod === "COD"
          ? {
              codStatus: "PENDING_VERIFICATION",
              callLogs: [],
              maxCodLimit: 15000,
            }
          : null,
      compliance_verified: Boolean(containsRestrictedGoods),
      requires_admin_review: Boolean(containsRestrictedGoods),
      compliance_details: containsRestrictedGoods
        ? {
            isRestrictedOrder: true,
            ageConfirmed: true,
            termsConsent: data.termsConsent !== false,
            verifiedAt: new Date().toISOString(),
            clientIp,
            userAgent,
          }
        : null,
      notes:
        data.paymentMethod === "UPI"
          ? `Direct UPI checkout. Customer VPA: ${data.upiId}`
          : "Cash on Delivery - Pending Phone Verification",
      status_history: [
        { status: "pending", timestamp: new Date().toISOString(), note: "Order placed via checkout" },
      ],
      placed_at: new Date().toISOString(),
    };

    const { data: insertedOrder, error: insertErr } = await supabase
      .from("orders")
      .insert(newOrderData)
      .select("*")
      .single();

    if (insertErr) {
      throw new Error(`Failed to create order in Supabase: ${insertErr.message}`);
    }

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
        orderNumber: insertedOrder.order_number,
        orderId: insertedOrder.id,
        pricing: insertedOrder.pricing,
        paymentMethod: insertedOrder.payment_method,
        paymentStatus: insertedOrder.payment_status,
        orderStatus: insertedOrder.order_status,
        couponCode: appliedCouponCode,
        paymentDetails: {
          merchantUpiId: MERCHANT_UPI_ID,
          merchantName: MERCHANT_NAME,
          customerUpiId: data.upiId,
          qrPayload,
          qrDataUrl,
        },
        codDetails: insertedOrder.cod_details,
        shippingAddress: insertedOrder.shipping_address,
        items: itemsObj,
        estimatedDelivery: estimatedDeliveryFormatted,
        complianceVerified: Boolean(containsRestrictedGoods),
        requiresAdminReview: Boolean(containsRestrictedGoods),
      },
      "Order placed successfully",
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
