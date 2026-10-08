import crypto from "crypto";
import { z } from "zod";
import { hashPassword } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { supabase } from "@/lib/supabase";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: Request) {
  try {
    const data = await validateRequestBody(req, resetPasswordSchema);

    const hashedToken = crypto.createHash("sha256").update(data.token).digest("hex");

    const { data: user } = await supabase
      .from("users")
      .select("id, reset_password_expires")
      .eq("reset_password_token", hashedToken)
      .maybeSingle();

    if (!user || (user.reset_password_expires && new Date(user.reset_password_expires) <= new Date())) {
      throw new ValidationError("Invalid or expired password reset token. Please request a new one.");
    }

    const passwordHash = await hashPassword(data.password);

    await supabase
      .from("users")
      .update({
        password_hash: passwordHash,
        reset_password_token: null,
        reset_password_expires: null,
      })
      .eq("id", user.id);

    return apiSuccess({ reset: true }, "Password has been successfully reset. You can now log in.");
  } catch (error) {
    return handleApiError(error);
  }
}
