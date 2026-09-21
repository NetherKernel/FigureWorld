import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  phone: z.string().max(25).optional(),
  avatar: z.string().url().or(z.string().length(0)).optional(),
});

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);

    await connectToDatabase();

    const user = await User.findById(auth.userId).populate("addresses");
    if (!user) {
      throw new NotFoundError("User not found");
    }

    return apiSuccess({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
      addresses: user.addresses,
      createdAt: user.createdAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth(req);
    const data = await validateRequestBody(req, updateProfileSchema);

    await connectToDatabase();

    const updateFields: Record<string, unknown> = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.phone !== undefined) updateFields.phone = data.phone;
    if (data.avatar !== undefined) updateFields.avatar = data.avatar;

    const updatedUser = await User.findByIdAndUpdate(
      auth.userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      throw new NotFoundError("User not found");
    }

    return apiSuccess({
      id: updatedUser._id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      avatar: updatedUser.avatar,
    }, "Profile updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
