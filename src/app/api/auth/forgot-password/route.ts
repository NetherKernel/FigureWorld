import crypto from "crypto";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { validateRequestBody } from "@/lib/validation";
import { env } from "@/lib/env";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
});

export async function POST(req: Request) {
  try {
    const data = await validateRequestBody(req, forgotPasswordSchema);

    await connectToDatabase();

    const user = await User.findOne({ email: data.email });
    if (!user) {
      // Return success to avoid account enumeration
      return apiSuccess(
        { sent: true },
        "If an account exists with that email, password reset instructions have been generated."
      );
    }

    // Generate unhashed random token for the user link
    const rawToken = crypto.randomBytes(32).toString("hex");

    // Hash token before storing in DB
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour validity
    await user.save();

    const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${rawToken}`;

    return apiSuccess(
      {
        sent: true,
        resetToken: rawToken,
        resetUrl,
      },
      "Password reset token generated successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
