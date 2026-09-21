import { z } from "zod";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { Address } from "@/models/Address";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ValidationError, ConflictError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";

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
  ageConfirmed: z.boolean().default(false),
});

export async function POST(req: Request) {
  try {
    const data = await validateRequestBody(req, checkoutSchema);

    // If UPI selected, ensure valid UPI ID
    if (data.paymentMethod === "UPI") {
      if (!data.upiId || !data.upiId.includes("@")) {
        throw new ValidationError("Valid UPI ID (e.g. user@bank or mobile@upi) is required for UPI payment.");
      }
    }

    await connectToDatabase();

    // Check optional authenticated user session
    const currentUser = await getAuthenticatedUser(req);

    // 1. Fetch live products from DB, validate stock, and verify 18+ destination restrictions
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

      // Restricted Products: Eligibility and Destination Restrictions
      if (product.isRestricted) {
        containsRestrictedGoods = true;

        // Eligibility verification
        if (!data.ageConfirmed) {
          throw new ValidationError(
            `Age eligibility confirmation required: "${product.name}" is an 18+ age-restricted product. You must verify that you are at least 18 years old.`
          );
        }

        // Destination restrictions verification
        // Get category compliance restrictions as well
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

      // Effective unit price (Never trust React!)
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

    // 2. Authoritative Delivery Calculation (Flat ₹100 as specified in Sprint 5 & Sprint 6)
    const shippingFee = 100;
    const grandTotal = subtotal + shippingFee;

    // 3. Create Shipping Address Record
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

    // 4. Generate Unique Order Number
    const orderNumber = `FW-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    // 5. Create Order Record
    const newOrder = await Order.create({
      orderNumber,
      customer: currentUser?.userId || undefined,
      customerEmail: data.customer.email,
      items: [], // Will populate with OrderItem IDs
      pricing: {
        subtotal,
        discountTotal: 0,
        taxTotal: 0,
        shippingFee,
        grandTotal,
        currency: "INR",
      },
      shippingAddress: shippingAddress._id,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentMethod === "UPI" ? "paid" : "pending",
      orderStatus: "processing",
      complianceVerified: containsRestrictedGoods,
      notes: data.paymentMethod === "UPI" ? `Paid via UPI ID: ${data.upiId}` : "Cash on Delivery",
      placedAt: new Date(),
    });

    // 6. Create OrderItems linked to newOrder
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

      // 7. Inventory stock decrement
      itemData.productDoc.stock = Math.max(0, itemData.productDoc.stock - itemData.quantity);
      await itemData.productDoc.save();
    }

    newOrder.items = orderItemIds;
    await newOrder.save();

    // 8. Estimate delivery timeline (3-5 business days)
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
      },
      "Order placed successfully",
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
