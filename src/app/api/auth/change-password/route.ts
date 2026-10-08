import { z } from "zod";
import { requireAuth, comparePassword, hashPassword } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { supabase } from "@/lib/supabase";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    const data = await validateRequestBody(req, changePasswordSchema);

    const { data: user, error } = await supabase
      .from("users")
      .select("id, password_hash")
      .eq("id", auth.userId)
      .maybeSingle();

    if (error || !user || !user.password_hash) {
      throw new NotFoundError("User not found");
    }

    const isMatch = await comparePassword(data.currentPassword, user.password_hash);
    if (!isMatch) {
      throw new ValidationError("Current password is incorrect.");
    }

    const newHash = await hashPassword(data.newPassword);
    const { error: updateErr } = await supabase
      .from("users")
      .update({ password_hash: newHash })
      .eq("id", user.id);

    if (updateErr) {
      throw new Error(`Failed to update password: ${updateErr.message}`);
    }

    return apiSuccess({ updated: true }, "Password changed successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
