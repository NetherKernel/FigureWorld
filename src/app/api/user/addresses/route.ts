import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { validateRequestBody } from "@/lib/validation";
import { supabase } from "@/lib/supabase";

const addressSchema = z.object({
  type: z.enum(["shipping", "billing", "both"]).default("shipping"),
  fullName: z.string().min(2, "Full name is required").max(100),
  phone: z.string().min(5, "Contact phone is required").max(25),
  streetLine1: z.string().min(3, "Street address is required").max(200),
  streetLine2: z.string().max(200).optional(),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().min(2, "State/Province is required").max(100),
  postalCode: z.string().min(2, "Postal code is required").max(20),
  country: z.string().min(2, "Country is required").default("India"),
  isDefault: z.boolean().default(false),
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

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);

    const { data: rows, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", auth.userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to load addresses: ${error.message}`);
    }

    const addresses = (rows || []).map(mapSupabaseAddress);
    return apiSuccess({ addresses });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    const data = await validateRequestBody(req, addressSchema);

    // Check existing count to decide if default
    const { count } = await supabase
      .from("addresses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", auth.userId);

    const shouldBeDefault = data.isDefault || (count === 0);

    if (shouldBeDefault) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", auth.userId);
    }

    const { data: created, error } = await supabase
      .from("addresses")
      .insert({
        user_id: auth.userId,
        name: data.fullName,
        phone: data.phone,
        street: data.streetLine1,
        landmark: data.streetLine2 || "",
        city: data.city,
        state: data.state,
        postal_code: data.postalCode,
        country: data.country || "India",
        is_default: shouldBeDefault,
      })
      .select()
      .single();

    if (error || !created) {
      throw new Error(`Failed to save address: ${error?.message || "Unknown error"}`);
    }

    return apiSuccess({ address: mapSupabaseAddress(created) }, "Address added successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
