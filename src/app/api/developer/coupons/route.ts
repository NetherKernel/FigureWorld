import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Coupon } from "@/models/Coupon";
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
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").toUpperCase().trim();

    const coupons = await Coupon.find({}).sort({ createdAt: -1 });

    let filtered = coupons;
    if (query) {
      filtered = coupons.filter(
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
    await connectToDatabase();

    const data = await validateRequestBody(req, createCouponSchema);

    const existing = await Coupon.findOne({ code: data.code });
    if (existing) {
      throw new ConflictError(`Coupon code "${data.code}" already exists.`);
    }

    const newCoupon = await Coupon.create(data);

    await logAdminAudit({
      action: "COUPON_CREATE",
      actor: user,
      resource: {
        type: "COUPON",
        id: newCoupon._id.toString(),
        identifier: newCoupon.code,
      },
      details: {
        code: newCoupon.code,
        discountType: newCoupon.discountType,
        discountValue: newCoupon.discountValue,
      },
      req,
    });

    return apiSuccess({ coupon: newCoupon }, "Coupon created successfully", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
