import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { validateRequestBody } from "@/lib/validation";
import { getDeliverySettings, saveDeliverySettings } from "@/lib/delivery-rates";
import { logAdminAudit } from "@/lib/audit";

const updateDeliverySettingsSchema = z.object({
  defaultBaseFee: z.number().min(0).optional(),
  freeShippingThreshold: z.number().min(0).optional(),
  isFreeShippingActive: z.boolean().optional(),
  enableLocalDelivery: z.boolean().optional(),
  localCity: z.string().min(2).optional(),
  localCityFee: z.number().min(0).optional(),
  localCityEstDays: z.string().optional(),
  enableRegionalDelivery: z.boolean().optional(),
  regionalState: z.string().min(2).optional(),
  regionalStateFee: z.number().min(0).optional(),
  regionalStateEstDays: z.string().optional(),
  nationalFee: z.number().min(0).optional(),
  nationalEstDays: z.string().optional(),
  heavyItemSurcharge: z.number().min(0).optional(),
  pincodeRates: z
    .array(
      z.object({
        pincode: z.string().min(2).max(10),
        areaName: z.string().min(1),
        fee: z.number().min(0),
        estimatedDays: z.string().default("1-2 Days"),
        isActive: z.boolean().default(true),
        notes: z.string().optional(),
      })
    )
    .optional(),
  stateRates: z
    .array(
      z.object({
        state: z.string().min(2),
        fee: z.number().min(0),
        estimatedDays: z.string().default("2-4 Days"),
        isActive: z.boolean().default(true),
        notes: z.string().optional(),
      })
    )
    .optional(),
  partnerPresets: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(["PORTER", "DUNZO", "LOCAL_RIDER", "STANDARD_COURIER", "OTHER"]),
        baseRate: z.number().min(0),
        description: z.string().optional(),
      })
    )
    .optional(),
});

export async function GET(req: Request) {
  try {
    const authUser = await requireRole(req, "ADMIN", "STAFF");
    const settings = await getDeliverySettings();

    const activePincodes = Array.isArray(settings.pincodeRates)
      ? settings.pincodeRates.filter((p: any) => p.isActive).length
      : 0;

    const activeStateRates = Array.isArray(settings.stateRates)
      ? settings.stateRates.filter((s: any) => s.isActive).length
      : 0;

    return apiSuccess({
      settings,
      stats: {
        totalPincodeOverrides: settings.pincodeRates?.length || 0,
        activePincodeOverrides: activePincodes,
        totalStateRates: settings.stateRates?.length || 0,
        activeStateRates,
        localDeliveryEnabled: Boolean(settings.enableLocalDelivery),
        regionalDeliveryEnabled: Boolean(settings.enableRegionalDelivery),
        currentBaseRate: settings.defaultBaseFee,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const authUser = await requireRole(req, "ADMIN");
    const data = await validateRequestBody(req, updateDeliverySettingsSchema);

    const updated = await saveDeliverySettings(data, authUser.email);

    await logAdminAudit({
      action: "UPDATE_DELIVERY_SETTINGS",
      actor: authUser,
      resource: {
        type: "DELIVERY_SETTINGS",
        identifier: "STORE_DELIVERY_RULES",
      },
      details: {
        updatedFields: Object.keys(data),
        data,
      },
      req,
    });

    return apiSuccess(
      { settings: updated },
      "Delivery cost configuration and local courier rules updated successfully"
    );
  } catch (err) {
    return handleApiError(err);
  }
}
