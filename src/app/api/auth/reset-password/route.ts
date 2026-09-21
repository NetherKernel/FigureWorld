import crypto from "crypto";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: Request) {
  try {
    const data = await validateRequestBody(req, resetPasswordSchema);

    await connectToDatabase();

    const hashedToken = crypto.createHash("sha256").update(data.token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+passwordHash +resetPasswordToken +resetPasswordExpires");

    if (!user) {
      throw new ValidationError("Invalid or expired password reset token. Please request a new one.");
    }

    user.passwordHash = await hashPassword(data.password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return apiSuccess({ reset: true }, "Password has been successfully reset. You can now log in.");
  } catch (error) {
    return handleApiError(error);
  }
}
