import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { supabase } from "@/lib/supabase";

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  phone: z.string().max(25).optional(),
  avatar: z.string().url().or(z.string().length(0)).optional(),
});

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);

    const { data: supaUser, error } = await supabase
      .from("users")
      .select("id, name, email, role, phone, created_at")
      .eq("id", auth.userId)
      .maybeSingle();

    if (error || !supaUser) {
      throw new NotFoundError("User not found");
    }

    const { data: addresses } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", supaUser.id);

    return apiSuccess({
      id: supaUser.id,
      name: supaUser.name,
      email: supaUser.email,
      role: supaUser.role,
      phone: supaUser.phone,
      avatar: "",
      addresses: addresses || [],
      createdAt: supaUser.created_at,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth(req);
    const data = await validateRequestBody(req, updateProfileSchema);

    const updateFields: Record<string, unknown> = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.phone !== undefined) updateFields.phone = data.phone;

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update(updateFields)
      .eq("id", auth.userId)
      .select("id, name, email, role, phone")
      .single();

    if (error || !updatedUser) {
      throw new NotFoundError("User not found");
    }

    return apiSuccess(
      {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        avatar: "",
      },
      "Profile updated successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
