import { seedAuthData } from "@/lib/seed";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const result = await seedAuthData();
    return apiSuccess(result, "Auth seed completed successfully");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST() {
  try {
    const result = await seedAuthData();
    return apiSuccess(result, "Auth seed completed successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
