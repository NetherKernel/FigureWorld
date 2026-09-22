import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Coupon } from "@/models/Coupon";
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
    await requireRole(req, "ADMIN");
    await connectToDatabase();

    const { id } = await params;
    const body = await validateRequestBody(req, updateCouponSchema);

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      throw new NotFoundError("Coupon not found");
    }

    if (body.isActive !== undefined) coupon.isActive = body.isActive;
    if (body.discountValue !== undefined) coupon.discountValue = body.discountValue;
    if (body.minimumOrderValue !== undefined) coupon.minimumOrderValue = body.minimumOrderValue;
    if (body.maximumDiscountAmount !== undefined) coupon.maximumDiscountAmount = body.maximumDiscountAmount;
    if (body.validUntil !== undefined) coupon.validUntil = body.validUntil;
    if (body.usageLimit !== undefined) coupon.usageLimit = body.usageLimit;
    if (body.description !== undefined) coupon.description = body.description;

    await coupon.save();

    return apiSuccess({ coupon }, "Coupon updated successfully");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(req, "ADMIN");
    await connectToDatabase();

    const { id } = await params;
    const deleted = await Coupon.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundError("Coupon not found");
    }

    return apiSuccess(null, "Coupon deleted successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
