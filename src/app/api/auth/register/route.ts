import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword, signToken, setAuthCookie } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ConflictError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const data = await validateRequestBody(req, registerSchema);

    await connectToDatabase();

    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new ConflictError("An account with this email address already exists.");
    }

    const passwordHash = await hashPassword(data.password);

    const newUser = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
      phone: data.phone || "",
      role: "CUSTOMER",
      isActive: true,
    });

    const tokenPayload = {
      userId: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    };

    const token = await signToken(tokenPayload);

    const response = apiSuccess(
      {
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          phone: newUser.phone,
        },
        token,
      },
      "Registration successful",
      201
    );

    return setAuthCookie(response, token);
  } catch (error) {
    return handleApiError(error);
  }
}
