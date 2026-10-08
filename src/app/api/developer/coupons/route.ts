import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ConflictError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { logAdminAudit } from "@/lib/audit";

const createCouponSchema = z.object({
  code: z.string().min(3, "Coupon code must be at least 3 characters").max(30).toUpperCase().trim(),
  description: z.string().max(200).optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().positive("Discount value must be greater than 0"),
  minimumOrderValue: z.number().min(0).default(0),
  maximumDiscountAmount: z.number().positive().optional(),
  validFrom: z.string().optional().transform((v) => (v ? new Date(v) : new Date())),
  validUntil: z.string().transform((v) => new Date(v)),
  usageLimit: z.number().positive().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(req: Request) {
  try {
    await requireRole(req, "DEVELOPER");

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").toUpperCase().trim();

    const { data: coupons, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const mapped = (coupons || []).map((c: any) => ({
      _id: c.id,
      id: c.id,
      code: c.code,
      description: c.description,
      discountType: c.discount_type,
      discountValue: Number(c.discount_value),
      minimumOrderValue: Number(c.min_order_amount || 0),
      maximumDiscountAmount: c.max_discount_amount ? Number(c.max_discount_amount) : undefined,
      validFrom: c.start_date,
      validUntil: c.end_date,
      usageLimit: c.usage_limit,
      usedCount: Number(c.used_count || 0),
      isActive: Boolean(c.is_active),
      createdAt: c.created_at,
    }));

    let filtered = mapped;
    if (query) {
      filtered = mapped.filter(
        (c: any) =>
          c.code.includes(query) ||
          (c.description && c.description.toUpperCase().includes(query))
      );
    }

    const activeCount = filtered.filter((c: any) => c.isActive && new Date(c.validUntil) >= new Date()).length;

    return apiSuccess({
      coupons: filtered,
      metrics: {
        totalCoupons: filtered.length,
        activeCoupons: activeCount,
        inactiveCoupons: filtered.length - activeCount,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(req, "DEVELOPER");
    const data = await validateRequestBody(req, createCouponSchema);

    const { data: existing } = await supabase
      .from("coupons")
      .select("id")
      .eq("code", data.code)
      .maybeSingle();

    if (existing) {
      throw new ConflictError(`Coupon code "${data.code}" already exists.`);
    }

    const { data: newCoupon, error: insErr } = await supabase
      .from("coupons")
      .insert({
        code: data.code,
        description: data.description || "",
        discount_type: data.discountType,
        discount_value: data.discountValue,
        min_order_amount: data.minimumOrderValue,
        max_discount_amount: data.maximumDiscountAmount || null,
        start_date: data.validFrom.toISOString(),
        end_date: data.validUntil.toISOString(),
        usage_limit: data.usageLimit || null,
        used_count: 0,
        is_active: data.isActive,
      })
      .select("*")
      .single();

    if (insErr) throw insErr;

    await logAdminAudit({
      action: "COUPON_CREATE",
      actor: user,
      resource: {
        type: "COUPON",
        id: newCoupon.id,
        identifier: newCoupon.code,
      },
      details: {
        code: newCoupon.code,
        discountType: newCoupon.discount_type,
        discountValue: newCoupon.discount_value,
      },
      req,
    });

    return apiSuccess({ coupon: newCoupon }, "Coupon created successfully", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
