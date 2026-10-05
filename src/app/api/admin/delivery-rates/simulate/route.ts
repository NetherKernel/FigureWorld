import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { validateRequestBody } from "@/lib/validation";
import { calculateDeliveryFee } from "@/lib/delivery-rates";

const simulateSchema = z.object({
  subtotal: z.number().min(0),
  pincode: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  hasRestrictedOrHeavy: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    await requireRole(req, "ADMIN", "STAFF");
    const data = await validateRequestBody(req, simulateSchema);

    const calculation = await calculateDeliveryFee({
      subtotal: data.subtotal,
      address: {
        postalCode: data.pincode,
        city: data.city,
        state: data.state,
      },
      items: data.hasRestrictedOrHeavy
        ? [{ isRestricted: true, weightKg: 2.5 }]
        : [],
    });

    return apiSuccess({
      input: data,
      calculation,
      grandTotal: data.subtotal + calculation.fee,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
