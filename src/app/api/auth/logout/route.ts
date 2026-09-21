import { clearAuthCookie } from "@/lib/auth";
import { apiSuccess } from "@/lib/api-response";

export async function POST() {
  const response = apiSuccess({ loggedOut: true }, "Logged out successfully");
  return clearAuthCookie(response);
}
