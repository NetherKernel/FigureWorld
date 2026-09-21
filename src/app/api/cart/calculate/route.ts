import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/models/Product";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { validateRequestBody } from "@/lib/validation";

const calculateCartSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1, "Product ID is required"),
      quantity: z.number().int().min(1, "Quantity must be at least 1"),
      // Even if client passes a price, we do NOT use it.
      clientPrice: z.number().optional(),
    })
  ),
});

export interface IVerifiedCartItem {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  image: string;
  unitPrice: number;
  originalPrice: number;
  hasDiscount: boolean;
  requestedQuantity: number;
  validQuantity: number;
  itemTotal: number;
  stock: number;
  stockStatus: "in_stock" | "insufficient_stock" | "out_of_stock" | "item_unavailable";
  stockWarning?: string;
  isRestricted: boolean;
  ageRequirement?: number;
  shippingRestrictions?: string[];
}

export async function POST(req: Request) {
  try {
    const data = await validateRequestBody(req, calculateCartSchema);

    await connectToDatabase();

    const verifiedItems: IVerifiedCartItem[] = [];
    const stockWarnings: string[] = [];

    let subtotal = 0;

    for (const item of data.items) {
      // Look up authoritative product record from database
      const product = await Product.findById(item.productId);

      if (!product || product.status === "archived") {
        verifiedItems.push({
          productId: item.productId,
          name: "Unavailable Item",
          slug: "",
          sku: "N/A",
          image: "",
          unitPrice: 0,
          originalPrice: 0,
          hasDiscount: false,
          requestedQuantity: item.quantity,
          validQuantity: 0,
          itemTotal: 0,
          stock: 0,
          stockStatus: "item_unavailable",
          stockWarning: "This product is no longer available in our store catalog.",
          isRestricted: false,
        });
        stockWarnings.push(`An item in your cart is no longer available.`);
        continue;
      }

      // CRITICAL: ALWAYS use price from DB, never trust client-provided price!
      const effectivePrice =
        product.discountPrice !== undefined && product.discountPrice !== null && product.discountPrice < product.price
          ? product.discountPrice
          : product.price;

      // Stock validation
      let validQuantity = item.quantity;
      let stockStatus: "in_stock" | "insufficient_stock" | "out_of_stock" = "in_stock";
      let stockWarning: string | undefined = undefined;

      const availableStock = Math.max(0, product.stock || 0);

      if (availableStock === 0) {
        validQuantity = 0;
        stockStatus = "out_of_stock";
        stockWarning = `"${product.name}" is currently out of stock.`;
        stockWarnings.push(stockWarning);
      } else if (item.quantity > availableStock) {
        validQuantity = availableStock;
        stockStatus = "insufficient_stock";
        stockWarning = `Only ${availableStock} units available for "${product.name}". Quantity was adjusted.`;
        stockWarnings.push(stockWarning);
      }

      const itemTotal = effectivePrice * validQuantity;
      subtotal += itemTotal;

      const primaryImage =
        product.images?.find((img: any) => img.isPrimary)?.url ||
        product.images?.[0]?.url ||
        "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400";

      verifiedItems.push({
        productId: product._id.toString(),
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        image: primaryImage,
        unitPrice: effectivePrice,
        originalPrice: product.price,
        hasDiscount: Boolean(product.discountPrice && product.discountPrice < product.price),
        requestedQuantity: item.quantity,
        validQuantity,
        itemTotal,
        stock: availableStock,
        stockStatus,
        stockWarning,
        isRestricted: Boolean(product.isRestricted),
        ageRequirement: product.ageRequirement || 0,
        shippingRestrictions: product.shippingRestrictions || [],
      });
    }

    // Authoritative Shipping Calculation:
    // Flat ₹100 when cart has items (as specified in user example: Subtotal ₹4,998 + Shipping ₹100 = Total ₹5,098)
    const shippingFee = subtotal > 0 ? 100 : 0;
    const grandTotal = subtotal + shippingFee;

    const summary = {
      subtotal,
      shipping: shippingFee,
      total: grandTotal,
      currency: "INR",
      itemCount: verifiedItems.reduce((acc, it) => acc + it.validQuantity, 0),
      hasStockIssues: stockWarnings.length > 0,
      hasRestrictedItems: verifiedItems.some((it) => it.isRestricted && it.validQuantity > 0),
    };

    return apiSuccess(
      {
        items: verifiedItems,
        summary,
        stockWarnings,
      },
      "Cart calculated and validated by server",
      200
    );
  } catch (error) {
    return handleApiError(error);
  }
}
