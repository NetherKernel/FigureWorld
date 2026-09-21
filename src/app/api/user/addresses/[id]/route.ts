import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Address } from "@/models/Address";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";

const updateAddressSchema = z.object({
  type: z.enum(["shipping", "billing", "both"]).optional(),
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().min(5).max(25).optional(),
  streetLine1: z.string().min(3).max(200).optional(),
  streetLine2: z.string().max(200).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(100).optional(),
  postalCode: z.string().min(2).max(20).optional(),
  country: z.string().min(2).optional(),
  isDefault: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const data = await validateRequestBody(req, updateAddressSchema);

    await connectToDatabase();

    const address = await Address.findOne({ _id: id, user: auth.userId });
    if (!address) {
      throw new NotFoundError("Address not found or does not belong to you.");
    }

    if (data.isDefault) {
      await Address.updateMany({ user: auth.userId }, { $set: { isDefault: false } });
    }

    Object.assign(address, data);
    await address.save();

    return apiSuccess({ address }, "Address updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    await connectToDatabase();

    const address = await Address.findOneAndDelete({ _id: id, user: auth.userId });
    if (!address) {
      throw new NotFoundError("Address not found or does not belong to you.");
    }

    // Remove from User addresses array
    await User.findByIdAndUpdate(auth.userId, {
      $pull: { addresses: address._id },
    });

    // If deleted address was default, set another address as default
    if (address.isDefault) {
      const remainingAddress = await Address.findOne({ user: auth.userId }).sort({ createdAt: -1 });
      if (remainingAddress) {
        remainingAddress.isDefault = true;
        await remainingAddress.save();
      }
    }

    return apiSuccess({ deleted: true }, "Address deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
