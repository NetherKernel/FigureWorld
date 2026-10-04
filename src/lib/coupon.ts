import { Coupon } from "@/models/Coupon";
import { ValidationError } from "@/lib/errors";

/**
 * Validate a coupon code against a subtotal and compute its discount.
 * Shared by the cart preview (/api/cart/calculate) and order placement (/api/checkout)
 * so both always agree. Throws ValidationError with a customer-facing message.
 * Does NOT increment usage — the caller does that when the order is actually placed.
 */
export async function evaluateCoupon(rawCode: string, subtotal: number) {
  const codeClean = rawCode.toUpperCase().trim();
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

  let discountAmount: number;
  if (coupon.discountType === "percentage") {
    discountAmount = Math.round((subtotal * coupon.discountValue) / 100);
    if (coupon.maximumDiscountAmount && discountAmount > coupon.maximumDiscountAmount) {
      discountAmount = coupon.maximumDiscountAmount;
    }
  } else {
    discountAmount = Math.min(coupon.discountValue, subtotal);
  }

  return { coupon, discountAmount };
}
