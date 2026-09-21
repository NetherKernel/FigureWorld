import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);

    await connectToDatabase();

    const user = await User.findById(auth.userId).populate("addresses");
    if (!user) {
      throw new NotFoundError("User not found");
    }

    return apiSuccess({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        addresses: user.addresses,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
