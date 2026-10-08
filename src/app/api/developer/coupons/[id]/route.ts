import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";

const updateCouponSchema = z.object({
  isActive: z.boolean().optional(),
  discountValue: z.number().positive().optional(),
  minimumOrderValue: z.number().min(0).optional(),
  maximumDiscountAmount: z.number().positive().optional(),
  validUntil: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  usageLimit: z.number().positive().optional(),
  description: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(req, "DEVELOPER");

    const { id } = await params;
    const body = await validateRequestBody(req, updateCouponSchema);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let checkQuery = supabase.from("coupons").select("*");
    if (isUuid) {
      checkQuery = checkQuery.eq("id", id);
    } else {
      checkQuery = checkQuery.eq("code", id.toUpperCase());
    }

    const { data: coupon, error } = await checkQuery.maybeSingle();
    if (error || !coupon) {
      throw new NotFoundError("Coupon not found");
    }

    const updateFields: Record<string, any> = {};
    if (body.isActive !== undefined) updateFields.is_active = body.isActive;
    if (body.discountValue !== undefined) updateFields.discount_value = body.discountValue;
    if (body.minimumOrderValue !== undefined) updateFields.min_order_amount = body.minimumOrderValue;
    if (body.maximumDiscountAmount !== undefined) updateFields.max_discount_amount = body.maximumDiscountAmount;
    if (body.validUntil !== undefined) updateFields.end_date = body.validUntil.toISOString();
    if (body.usageLimit !== undefined) updateFields.usage_limit = body.usageLimit;
    if (body.description !== undefined) updateFields.description = body.description;

    const { data: updated, error: updErr } = await supabase
      .from("coupons")
      .update(updateFields)
      .eq("id", coupon.id)
      .select("*")
      .single();

    if (updErr) throw updErr;

    return apiSuccess({ coupon: updated }, "Coupon updated successfully");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(req, "DEVELOPER");

    const { id } = await params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let delQuery = supabase.from("coupons").delete();
    if (isUuid) {
      delQuery = delQuery.eq("id", id);
    } else {
      delQuery = delQuery.eq("code", id.toUpperCase());
    }

    const { error } = await delQuery;
    if (error) {
      throw new NotFoundError("Coupon not found");
    }

    return apiSuccess(null, "Coupon deleted successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
