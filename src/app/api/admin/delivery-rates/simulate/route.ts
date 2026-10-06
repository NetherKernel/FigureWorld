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
  weightClassification: z.enum(["LIGHT", "LARGE"]).optional(),
  itemCount: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    await requireRole(req, "ADMIN", "STAFF");
    const data = await validateRequestBody(req, simulateSchema);

    const isLarge = data.weightClassification === "LARGE" || data.hasRestrictedOrHeavy === true;

    const calculation = await calculateDeliveryFee({
      subtotal: data.subtotal,
      address: {
        postalCode: data.pincode,
        city: data.city,
        state: data.state,
      },
      items: isLarge
        ? [{ name: "Simulated Heavy Statue / Order", weightKg: 3.0, tags: ["statue", "resin"] }]
        : [{ name: "Simulated Light Item (Katana / Figure)", weightKg: 0.8, tags: ["katana", "keychain"] }],
    });

    return apiSuccess({
      input: data,
      calculation,
      fee: calculation.fee,
      grandTotal: data.subtotal + calculation.fee,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
