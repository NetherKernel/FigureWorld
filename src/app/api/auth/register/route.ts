import { z } from "zod";
import { hashPassword, signToken, setAuthCookie, UserRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ConflictError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { supabase } from "@/lib/supabase";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const data = await validateRequestBody(req, registerSchema);

    // Check existing in Supabase
    const { data: supaExisting } = await supabase
      .from("users")
      .select("id")
      .ilike("email", data.email)
      .maybeSingle();

    if (supaExisting) {
      throw new ConflictError("An account with this email address already exists.");
    }

    const passwordHash = await hashPassword(data.password);

    // Insert into Supabase
    const { data: supaInserted, error: supaErr } = await supabase
      .from("users")
      .insert({
        name: data.name,
        email: data.email,
        password_hash: passwordHash,
        phone: data.phone || "",
        role: "CUSTOMER",
      })
      .select("id, name, email, role, phone")
      .single();

    if (supaErr || !supaInserted) {
      throw new Error(`Failed to create user in database: ${supaErr?.message || "Unknown error"}`);
    }

    const role = (supaInserted.role || "CUSTOMER").toUpperCase() as UserRole;
    const tokenPayload = {
      userId: supaInserted.id,
      email: supaInserted.email,
      name: supaInserted.name,
      role,
    };

    const token = await signToken(tokenPayload);

    const response = apiSuccess(
      {
        user: {
          id: supaInserted.id,
          name: supaInserted.name,
          email: supaInserted.email,
          role,
          phone: supaInserted.phone,
          avatar: "",
        },
        token,
      },
      "Account registered successfully",
      201
    );

    return setAuthCookie(response, token);
  } catch (error) {
    return handleApiError(error);
  }
}
