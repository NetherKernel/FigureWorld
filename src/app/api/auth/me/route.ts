import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);

    // 1. Try Supabase user record
    try {
      const { data: supaUser, error: supaErr } = await supabase
        .from("users")
        .select("id, name, email, role, phone, created_at")
        .eq("id", auth.userId)
        .maybeSingle();

      if (!supaErr && supaUser) {
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
      }
    } catch {
      // Continue to MongoDB fallback
    }

    // 2. Try MongoDB User record
    try {
      await connectToDatabase();
      const user = await User.findById(auth.userId).populate("addresses");
      if (user) {
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
      }
    } catch {
      // Continue to token fallback
    }

    // 3. Fallback: Authenticated token payload is authoritative
    return apiSuccess({
      user: {
        id: auth.userId,
        name: auth.name,
        email: auth.email,
        role: auth.role,
        phone: "",
        avatar: "",
        addresses: [],
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

