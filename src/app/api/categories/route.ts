import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Category } from "@/models/Category";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ConflictError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";

const complianceSchema = z.object({
  minAge: z.number().min(0).default(0),
  requiresIdVerification: z.boolean().default(false),
  disclaimerText: z.string().default(""),
  restrictedRegions: z.array(z.string()).default([]),
});

const createCategorySchema = z.object({
  name: z.string().min(2, "Category name is required").max(80),
  slug: z.string().min(2, "Category slug is required").toLowerCase().trim(),
  description: z.string().max(500).optional(),
  image: z.string().optional(),
  displayOrder: z.number().default(0),
  isActive: z.boolean().default(true),
  isRestricted: z.boolean().default(false),
  complianceRequirements: complianceSchema.optional(),
});

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const restrictedOnly = searchParams.get("isRestricted");

    const filter: Record<string, unknown> = { isActive: true };
    if (restrictedOnly === "true") filter.isRestricted = true;
    if (restrictedOnly === "false") filter.isRestricted = false;

    const categories = await Category.find(filter).sort({ displayOrder: 1, name: 1 });

    return apiSuccess({ categories });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    // Admin or Staff role required to create categories
    await requireRole(req, "ADMIN", "STAFF");

    const data = await validateRequestBody(req, createCategorySchema);

    await connectToDatabase();

    const existing = await Category.findOne({ slug: data.slug });
    if (existing) {
      throw new ConflictError("A category with this slug already exists.");
    }

    const newCategory = await Category.create(data);

    return apiSuccess({ category: newCategory }, "Category created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
