import { z } from "zod";
import { comparePassword, signToken, setAuthCookie, UserRole } from "@/lib/auth";
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

    const { data: supaUser, error: supaErr } = await supabase
      .from("users")
      .select("id, email, password_hash, name, role, phone")
      .ilike("email", data.email)
      .maybeSingle();

    if (supaErr || !supaUser || !supaUser.password_hash) {
      throw new UnauthorizedError("Invalid email or password.");
    }

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
  } catch (error) {
    return handleApiError(error);
  }
}
