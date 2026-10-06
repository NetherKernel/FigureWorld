import mongoose from "mongoose";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Category } from "@/models/Category";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
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
  parentCategory: z.string().nullable().optional(),
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
    const parentOnly = searchParams.get("parentOnly") === "true" || searchParams.get("level") === "root";
    const parentCategory = searchParams.get("parentCategory");
    const asTree = searchParams.get("tree") === "true";

    const filter: Record<string, unknown> = { isActive: true };
    if (restrictedOnly === "true") filter.isRestricted = true;
    if (restrictedOnly === "false") filter.isRestricted = false;

    // Filter by specific parent category
    if (parentCategory) {
      if (mongoose.Types.ObjectId.isValid(parentCategory)) {
        filter.parentCategory = parentCategory;
      } else {
        const parentDoc = await Category.findOne({ slug: parentCategory.toLowerCase().trim() });
        if (!parentDoc) {
          return apiSuccess({ categories: [] });
        }
        filter.parentCategory = parentDoc._id;
      }
    } else if (parentOnly) {
      filter.parentCategory = null;
    }

    // If tree view is requested, fetch all and build tree structure
    if (asTree) {
      const allCategories = await Category.find({ isActive: true })
        .populate("parentCategory", "name slug")
        .sort({ displayOrder: 1, name: 1 })
        .lean();

      const roots = allCategories.filter((c: any) => !c.parentCategory);
      const tree = roots.map((root: any) => {
        const subcategories = allCategories.filter(
          (c: any) =>
            c.parentCategory &&
            (c.parentCategory._id?.toString() === root._id.toString() ||
              c.parentCategory?.toString() === root._id.toString())
        );
        return {
          ...root,
          subcategories,
          subcategoriesCount: subcategories.length,
        };
      });

      return apiSuccess({ categories: tree });
    }

    const categories = await Category.find(filter)
      .populate("parentCategory", "name slug")
      .sort({ displayOrder: 1, name: 1 })
      .lean();

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

    // Validate parent category if provided
    let parentCategoryId: mongoose.Types.ObjectId | undefined = undefined;
    if (data.parentCategory && data.parentCategory.trim()) {
      const cleanParent = data.parentCategory.trim();
      let parentDoc = null;
      if (mongoose.Types.ObjectId.isValid(cleanParent)) {
        parentDoc = await Category.findById(cleanParent);
      } else {
        parentDoc = await Category.findOne({ slug: cleanParent.toLowerCase() });
      }

      if (!parentDoc) {
        throw new NotFoundError(`Parent category "${cleanParent}" not found.`);
      }
      parentCategoryId = parentDoc._id as mongoose.Types.ObjectId;
    }

    const { parentCategory: _ignored, ...categoryData } = data;
    const newCategory: any = await Category.create({
      ...categoryData,
      ...(parentCategoryId ? { parentCategory: parentCategoryId } : {}),
    });

    const populated = await Category.findById(newCategory._id)
      .populate("parentCategory", "name slug")
      .lean();

    return apiSuccess({ category: populated }, "Category created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
