import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { comparePassword, signToken, setAuthCookie } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";

const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
  try {
    const data = await validateRequestBody(req, loginSchema);

    await connectToDatabase();

    const user = await User.findOne({ email: data.email }).select("+passwordHash");
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    if (user.isActive === false) {
      throw new UnauthorizedError("Your account has been deactivated. Please contact support.");
    }

    const isMatch = await comparePassword(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = await signToken(tokenPayload);

    const response = apiSuccess(
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar,
        },
        token,
      },
      "Logged in successfully"
    );

    return setAuthCookie(response, token);
  } catch (error) {
    return handleApiError(error);
  }
}
