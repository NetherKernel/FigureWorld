import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { supabase } from "@/lib/supabase";

const updateAddressSchema = z.object({
  type: z.enum(["shipping", "billing", "both"]).optional(),
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().min(5).max(25).optional(),
  streetLine1: z.string().min(3).max(200).optional(),
  streetLine2: z.string().max(200).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(100).optional(),
  postalCode: z.string().min(2).max(20).optional(),
  country: z.string().min(2).optional(),
  isDefault: z.boolean().optional(),
});

function mapSupabaseAddress(a: any) {
  if (!a) return null;
  return {
    _id: a.id,
    id: a.id,
    user: a.user_id,
    fullName: a.name,
    phone: a.phone,
    streetLine1: a.street,
    streetLine2: a.landmark || "",
    landmark: a.landmark || "",
    city: a.city,
    state: a.state,
    postalCode: a.postal_code,
    country: a.country || "India",
    isDefault: Boolean(a.is_default),
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const data = await validateRequestBody(req, updateAddressSchema);

    const { data: address } = await supabase
      .from("addresses")
      .select("*")
      .eq("id", id)
      .eq("user_id", auth.userId)
      .maybeSingle();

    if (!address) {
      throw new NotFoundError("Address not found or does not belong to you.");
    }

    if (data.isDefault) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", auth.userId);
    }

    const updates: Record<string, any> = {};
    if (data.fullName !== undefined) updates.name = data.fullName;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.streetLine1 !== undefined) updates.street = data.streetLine1;
    if (data.streetLine2 !== undefined) updates.landmark = data.streetLine2;
    if (data.city !== undefined) updates.city = data.city;
    if (data.state !== undefined) updates.state = data.state;
    if (data.postalCode !== undefined) updates.postal_code = data.postalCode;
    if (data.country !== undefined) updates.country = data.country;
    if (data.isDefault !== undefined) updates.is_default = data.isDefault;

    const { data: updated, error } = await supabase
      .from("addresses")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update address: ${error?.message || "Unknown error"}`);
    }

    return apiSuccess({ address: mapSupabaseAddress(updated) }, "Address updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    const { data: address } = await supabase
      .from("addresses")
      .select("*")
      .eq("id", id)
      .eq("user_id", auth.userId)
      .maybeSingle();

    if (!address) {
      throw new NotFoundError("Address not found or does not belong to you.");
    }

    const { error: delErr } = await supabase
      .from("addresses")
      .delete()
      .eq("id", id);

    if (delErr) {
      throw new Error(`Failed to delete address: ${delErr.message}`);
    }

    // If deleted address was default, set another address as default
    if (address.is_default) {
      const { data: remaining } = await supabase
        .from("addresses")
        .select("id")
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (remaining) {
        await supabase
          .from("addresses")
          .update({ is_default: true })
          .eq("id", remaining.id);
      }
    }

    return apiSuccess({ deleted: true }, "Address deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
