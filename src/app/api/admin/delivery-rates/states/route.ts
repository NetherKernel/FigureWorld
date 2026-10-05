import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { validateRequestBody } from "@/lib/validation";
import { getDeliverySettings, saveDeliverySettings, ALL_INDIAN_STATES } from "@/lib/delivery-rates";
import { logAdminAudit } from "@/lib/audit";
import { ValidationError } from "@/lib/errors";

const addStateRateSchema = z.object({
  state: z.string().min(2).trim(),
  fee: z.number().min(0),
  estimatedDays: z.string().default("2-4 Days"),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const authUser = await requireRole(req, "ADMIN", "STAFF");
    const data = await validateRequestBody(req, addStateRateSchema);

    const settings = await getDeliverySettings();
    const existingStates = Array.isArray(settings.stateRates)
      ? [...settings.stateRates]
      : [];

    const existingIndex = existingStates.findIndex(
      (s) => s.state.toLowerCase() === data.state.toLowerCase()
    );

    if (existingIndex >= 0) {
      existingStates[existingIndex] = {
        ...existingStates[existingIndex],
        ...data,
      };
    } else {
      existingStates.push(data);
    }

    const updated = await saveDeliverySettings(
      { stateRates: existingStates },
      authUser.email
    );

    await logAdminAudit({
      action: existingIndex >= 0 ? "UPDATE_STATE_DELIVERY_RATE" : "ADD_STATE_DELIVERY_RATE",
      actor: authUser,
      resource: {
        type: "STATE_DELIVERY_RATE",
        identifier: data.state,
      },
      details: {
        state: data.state,
        fee: data.fee,
        estimatedDays: data.estimatedDays,
      },
      req,
    });

    return apiSuccess(
      {
        stateRate: data,
        totalStateRates: existingStates.length,
        settings: updated,
      },
      `Delivery fee for state "${data.state}" configured at ₹${data.fee}`,
      existingIndex >= 0 ? 200 : 201
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const authUser = await requireRole(req, "ADMIN");
    const { searchParams } = new URL(req.url);
    const state = searchParams.get("state")?.trim();

    if (!state) {
      throw new ValidationError("Query parameter 'state' is required");
    }

    const settings = await getDeliverySettings();
    const existingStates = Array.isArray(settings.stateRates)
      ? [...settings.stateRates]
      : [];

    const filtered = existingStates.filter(
      (s) => s.state.toLowerCase() !== state.toLowerCase()
    );

    if (filtered.length === existingStates.length) {
      throw new ValidationError(`State rate for "${state}" not found`);
    }

    const updated = await saveDeliverySettings(
      { stateRates: filtered },
      authUser.email
    );

    await logAdminAudit({
      action: "DELETE_STATE_DELIVERY_RATE",
      actor: authUser,
      resource: {
        type: "STATE_DELIVERY_RATE",
        identifier: state,
      },
      details: { state },
      req,
    });

    return apiSuccess(
      {
        deletedState: state,
        remainingStateRates: filtered.length,
        settings: updated,
      },
      `Removed delivery rate for "${state}"`
    );
  } catch (err) {
    return handleApiError(err);
  }
}

// 1-Click Seed All Indian States with sensible defaults
export async function PUT(req: Request) {
  try {
    const authUser = await requireRole(req, "ADMIN");
    const settings = await getDeliverySettings();

    const existingStates = Array.isArray(settings.stateRates)
      ? [...settings.stateRates]
      : [];

    const existingMap = new Map(
      existingStates.map((s) => [s.state.toLowerCase(), s])
    );

    // Merge in all Indian states without overwriting existing custom configurations
    const merged = [...existingStates];
    let addedCount = 0;

    for (const item of ALL_INDIAN_STATES) {
      if (!existingMap.has(item.state.toLowerCase())) {
        merged.push({
          state: item.state,
          fee: item.defaultFee,
          estimatedDays: item.defaultDays,
          isActive: true,
          notes: `${item.zone} Zone Rate`,
        });
        addedCount++;
      }
    }

    const updated = await saveDeliverySettings(
      { stateRates: merged },
      authUser.email
    );

    await logAdminAudit({
      action: "SEED_ALL_INDIAN_STATE_RATES",
      actor: authUser,
      resource: {
        type: "STATE_DELIVERY_RATES",
        identifier: "ALL_INDIAN_STATES",
      },
      details: { addedCount, total: merged.length },
      req,
    });

    return apiSuccess(
      {
        addedCount,
        totalStateRates: merged.length,
        settings: updated,
      },
      `Successfully synced ${merged.length} Indian states & Union Territories (${addedCount} newly added)`
    );
  } catch (err) {
    return handleApiError(err);
  }
}
