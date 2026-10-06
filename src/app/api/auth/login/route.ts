import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { User, UserRole } from "@/models/User";
import { comparePassword, signToken, setAuthCookie } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { supabase } from "@/lib/supabase";

const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
  try {
    const data = await validateRequestBody(req, loginSchema);

    // 1. Try Supabase user authentication
    try {
      const { data: supaUser, error: supaErr } = await supabase
        .from("users")
        .select("id, email, password_hash, name, role, phone")
        .ilike("email", data.email)
        .maybeSingle();

      if (!supaErr && supaUser && supaUser.password_hash) {
        const isMatch = await comparePassword(data.password, supaUser.password_hash);
        if (!isMatch) {
          throw new UnauthorizedError("Invalid email or password.");
        }

        const role = (supaUser.role || "CUSTOMER").toUpperCase() as UserRole;
        const tokenPayload = {
          userId: supaUser.id,
          email: supaUser.email,
          name: supaUser.name || "Collector",
          role,
        };

        const token = await signToken(tokenPayload);

        const response = apiSuccess(
          {
            user: {
              id: supaUser.id,
              name: supaUser.name || "Collector",
              email: supaUser.email,
              role,
              phone: supaUser.phone || "",
              avatar: "",
            },
            token,
          },
          "Logged in successfully"
        );

        return setAuthCookie(response, token);
      }
    } catch (supaError) {
      if (supaError instanceof UnauthorizedError) {
        throw supaError;
      }
      // Continue to MongoDB fallback
    }

    // 2. Fallback to MongoDB / In-Memory store
    try {
      await connectToDatabase();
      const user = await User.findOne({ email: data.email }).select("+passwordHash");
      if (user && user.passwordHash) {
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
      }
    } catch (mongoError) {
      if (mongoError instanceof UnauthorizedError) {
        throw mongoError;
      }
    }

    throw new UnauthorizedError("Invalid email or password.");
  } catch (error) {
    return handleApiError(error);
  }
}
