import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { requireAuth, comparePassword, hashPassword } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    const data = await validateRequestBody(req, changePasswordSchema);

    await connectToDatabase();

    const user = await User.findById(auth.userId).select("+passwordHash");
    if (!user || !user.passwordHash) {
      throw new NotFoundError("User not found");
    }

    const isMatch = await comparePassword(data.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new ValidationError("Current password is incorrect.");
    }

    user.passwordHash = await hashPassword(data.newPassword);
    await user.save();

    return apiSuccess({ updated: true }, "Password changed successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
