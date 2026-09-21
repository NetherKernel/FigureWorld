import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Address } from "@/models/Address";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { validateRequestBody } from "@/lib/validation";

const addressSchema = z.object({
  type: z.enum(["shipping", "billing", "both"]).default("shipping"),
  fullName: z.string().min(2, "Full name is required").max(100),
  phone: z.string().min(5, "Contact phone is required").max(25),
  streetLine1: z.string().min(3, "Street address is required").max(200),
  streetLine2: z.string().max(200).optional(),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().min(2, "State/Province is required").max(100),
  postalCode: z.string().min(2, "Postal code is required").max(20),
  country: z.string().min(2, "Country is required").default("United States"),
  isDefault: z.boolean().default(false),
});

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);

    await connectToDatabase();

    const addresses = await Address.find({ user: auth.userId }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    return apiSuccess({ addresses });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    const data = await validateRequestBody(req, addressSchema);

    await connectToDatabase();

    // Check if this is the user's first address, make it default automatically if so
    const existingCount = await Address.countDocuments({ user: auth.userId });
    const isFirstAddress = existingCount === 0;
    const shouldBeDefault = data.isDefault || isFirstAddress;

    if (shouldBeDefault) {
      await Address.updateMany({ user: auth.userId }, { $set: { isDefault: false } });
    }

    const newAddress = await Address.create({
      ...data,
      user: auth.userId,
      isDefault: shouldBeDefault,
    });

    // Link into User addresses array
    await User.findByIdAndUpdate(auth.userId, {
      $addToSet: { addresses: newAddress._id },
    });

    return apiSuccess({ address: newAddress }, "Address added successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
