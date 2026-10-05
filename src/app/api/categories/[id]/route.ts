import mongoose from "mongoose";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Category } from "@/models/Category";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";

const complianceSchema = z.object({
  minAge: z.number().min(0).default(0),
  requiresIdVerification: z.boolean().default(false),
  disclaimerText: z.string().default(""),
  restrictedRegions: z.array(z.string()).default([]),
});

const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  parentCategory: z.string().nullable().optional(),
  displayOrder: z.number().optional(),
  isActive: z.boolean().optional(),
  isRestricted: z.boolean().optional(),
  complianceRequirements: complianceSchema.optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(req, "ADMIN");
    await connectToDatabase();

    const { id } = await params;
    const body = await validateRequestBody(req, updateCategorySchema);

    const category = await Category.findById(id);
    if (!category) {
      throw new NotFoundError("Category not found");
    }

    if (body.parentCategory !== undefined) {
      if (body.parentCategory === null || body.parentCategory === "") {
        category.parentCategory = undefined;
      } else {
        const cleanParent = body.parentCategory.trim();
        if (cleanParent === id || cleanParent === category.slug) {
          throw new ValidationError("A category cannot be its own parent category.");
        }

        let parentDoc = null;
        if (mongoose.Types.ObjectId.isValid(cleanParent)) {
          parentDoc = await Category.findById(cleanParent);
        } else {
          parentDoc = await Category.findOne({ slug: cleanParent.toLowerCase() });
        }

        if (!parentDoc) {
          throw new NotFoundError(`Parent category "${cleanParent}" not found.`);
        }
        category.parentCategory = parentDoc._id;
      }
      delete body.parentCategory;
    }

    Object.assign(category, body);
    await category.save();

    const populated = await Category.findById(category._id)
      .populate("parentCategory", "name slug")
      .lean();

    return apiSuccess({ category: populated }, "Category updated successfully");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(req, "ADMIN");
    await connectToDatabase();

    const { id } = await params;
    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundError("Category not found");
    }

    // Clear parentCategory reference in child categories
    await Category.updateMany(
      { parentCategory: deleted._id },
      { $set: { parentCategory: null } }
    );

    return apiSuccess(null, "Category deleted successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
