import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { validateRequestBody } from "@/lib/validation";
import { getDeliverySettings, saveDeliverySettings } from "@/lib/delivery-rates";
import { logAdminAudit } from "@/lib/audit";
import { ValidationError } from "@/lib/errors";

const addPincodeSchema = z.object({
  pincode: z.string().min(2).max(10).trim(),
  areaName: z.string().min(2).trim(),
  fee: z.number().min(0),
  estimatedDays: z.string().default("Same Day / 4 Hours"),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const authUser = await requireRole(req, "ADMIN", "STAFF");
    const data = await validateRequestBody(req, addPincodeSchema);

    const settings = await getDeliverySettings();
    const existingPincodes = Array.isArray(settings.pincodeRates)
      ? [...settings.pincodeRates]
      : [];

    const existingIndex = existingPincodes.findIndex(
      (p) => p.pincode.toLowerCase() === data.pincode.toLowerCase()
    );

    if (existingIndex >= 0) {
      existingPincodes[existingIndex] = {
        ...existingPincodes[existingIndex],
        ...data,
      };
    } else {
      existingPincodes.unshift(data);
    }

    const updated = await saveDeliverySettings(
      { pincodeRates: existingPincodes },
      authUser.email
    );

    await logAdminAudit({
      action: existingIndex >= 0 ? "UPDATE_PINCODE_DELIVERY_RATE" : "ADD_PINCODE_DELIVERY_RATE",
      actor: authUser,
      resource: {
        type: "PINCODE_DELIVERY_RATE",
        identifier: data.pincode,
      },
      details: {
        pincode: data.pincode,
        fee: data.fee,
        areaName: data.areaName,
      },
      req,
    });

    return apiSuccess(
      { pincodeRates: updated.pincodeRates },
      `Delivery fee for pincode ${data.pincode} (${data.areaName}) saved at ₹${data.fee}`
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const authUser = await requireRole(req, "ADMIN");
    const { searchParams } = new URL(req.url);
    const pincode = searchParams.get("pincode")?.trim();

    if (!pincode) {
      throw new ValidationError("Pincode query parameter is required.");
    }

    const settings = await getDeliverySettings();
    const filtered = (settings.pincodeRates || []).filter(
      (p: any) => p.pincode.toLowerCase() !== pincode.toLowerCase()
    );

    const updated = await saveDeliverySettings(
      { pincodeRates: filtered },
      authUser.email
    );

    await logAdminAudit({
      action: "DELETE_PINCODE_DELIVERY_RATE",
      actor: authUser,
      resource: {
        type: "PINCODE_DELIVERY_RATE",
        identifier: pincode,
      },
      req,
    });

    return apiSuccess(
      { pincodeRates: updated.pincodeRates },
      `Custom delivery rate for pincode ${pincode} removed`
    );
  } catch (err) {
    return handleApiError(err);
  }
}
