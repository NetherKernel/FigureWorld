import { supabase } from "@/lib/supabase";
import { ValidationError } from "@/lib/errors";

/**
 * Validate a coupon code against a subtotal and compute its discount.
 * Shared by the cart preview (/api/cart/calculate) and order placement (/api/checkout)
 * Queries Supabase PostgreSQL directly.
 */
export async function evaluateCoupon(rawCode: string, subtotal: number) {
  const codeClean = rawCode.toUpperCase().trim();

  const { data: coupon, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", codeClean)
    .maybeSingle();

  if (error || !coupon || !coupon.is_active) {
    throw new ValidationError(`Coupon code "${codeClean}" is invalid or inactive.`);
  }

  const now = new Date();
  if (coupon.end_date && new Date(coupon.end_date) < now) {
    throw new ValidationError(`Coupon code "${codeClean}" has expired.`);
  }
  if (coupon.start_date && new Date(coupon.start_date) > now) {
    throw new ValidationError(`Coupon code "${codeClean}" has expired.`);
  }

  const minOrder = Number(coupon.min_order_amount || 0);
  if (subtotal < minOrder) {
    throw new ValidationError(
      `Coupon "${codeClean}" requires a minimum order value of ₹${minOrder.toLocaleString("en-IN")}. Your subtotal is ₹${subtotal.toLocaleString("en-IN")}.`
    );
  }

  const usageLimit = coupon.usage_limit;
  const usedCount = Number(coupon.used_count || 0);
  if (usageLimit && usedCount >= usageLimit) {
    throw new ValidationError(`Coupon "${codeClean}" has exceeded its maximum usage limit.`);
  }

  let discountAmount: number;
  const discountVal = Number(coupon.discount_value || 0);
  const maxDiscount = coupon.max_discount_amount ? Number(coupon.max_discount_amount) : null;

  if (coupon.discount_type === "percentage") {
    discountAmount = Math.round((subtotal * discountVal) / 100);
    if (maxDiscount && discountAmount > maxDiscount) {
      discountAmount = maxDiscount;
    }
  } else {
    discountAmount = Math.min(discountVal, subtotal);
  }

  return {
    coupon: {
      ...coupon,
      code: coupon.code,
      usedCount,
      save: async () => {
        await supabase
          .from("coupons")
          .update({ used_count: usedCount + 1 })
          .eq("id", coupon.id);
      },
    },
    discountAmount,
  };
}
