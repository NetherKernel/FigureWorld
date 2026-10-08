import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);

    const { data: supaUser, error: supaErr } = await supabase
      .from("users")
      .select("id, name, email, role, phone, created_at")
      .eq("id", auth.userId)
      .maybeSingle();

    if (supaErr || !supaUser) {
      throw new NotFoundError("User not found");
    }

    const { data: supaAddresses } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", supaUser.id);

    return apiSuccess({
      user: {
        id: supaUser.id,
        name: supaUser.name || auth.name,
        email: supaUser.email,
        role: supaUser.role,
        phone: supaUser.phone || "",
        avatar: "",
        addresses: supaAddresses || [],
        createdAt: supaUser.created_at,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
