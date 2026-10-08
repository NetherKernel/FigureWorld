import mongoose from "mongoose";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { supabase, mapSupabaseCategory } from "@/lib/supabase";

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
    await requireRole(req, "ADMIN", "STAFF");
    const { id } = await params;
    const cleanId = id.trim();
    const body = await validateRequestBody(req, updateCategorySchema);

    let updatedCategory: any = null;
    let foundSlug: string | null = null;
    let parentSupaId: string | null | undefined = undefined;

    // If parentCategory is specified, resolve it
    if (body.parentCategory !== undefined) {
      if (!body.parentCategory || body.parentCategory.trim() === "") {
        parentSupaId = null;
      } else {
        const cleanParent = body.parentCategory.trim();
        const isParentUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanParent);
        if (isParentUuid) {
          parentSupaId = cleanParent;
        } else {
          // Look up parent in Supabase by slug
          const { data: supaParent } = await supabase
            .from("categories")
            .select("id")
            .eq("slug", cleanParent.toLowerCase())
            .maybeSingle();
          if (supaParent) {
            parentSupaId = supaParent.id;
          }
        }
      }
    }

    // 1. Update in Supabase
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      let supaQuery = supabase.from("categories").select("id, slug");
      if (isUuid) {
        supaQuery = supaQuery.eq("id", cleanId);
      } else {
        supaQuery = supaQuery.eq("slug", cleanId.toLowerCase());
      }
      const { data: supaExisting } = await supaQuery.maybeSingle();

      if (supaExisting) {
        foundSlug = supaExisting.slug;
        const supaUpdates: Record<string, any> = {};
        if (body.name !== undefined) supaUpdates.name = body.name;
        if (body.slug !== undefined) supaUpdates.slug = body.slug;
        if (body.description !== undefined) supaUpdates.description = body.description;
        if (body.displayOrder !== undefined) supaUpdates.display_order = body.displayOrder;
        if (body.isActive !== undefined) supaUpdates.is_active = body.isActive;
        if (body.isRestricted !== undefined) supaUpdates.is_restricted = body.isRestricted;
        if (body.complianceRequirements !== undefined) supaUpdates.compliance_requirements = body.complianceRequirements;
        if (parentSupaId !== undefined) supaUpdates.parent_category_id = parentSupaId;

        const { data: supaUpdated } = await supabase
          .from("categories")
          .update(supaUpdates)
          .eq("id", supaExisting.id)
          .select()
          .maybeSingle();

        if (supaUpdated) {
          updatedCategory = mapSupabaseCategory(supaUpdated);
        }
      }
    } catch (supaErr) {
      console.error("Error updating category in Supabase:", supaErr);
    }

    // 2. Update in MongoDB
    try {
      await connectToDatabase();
      const isObjectId = mongoose.Types.ObjectId.isValid(cleanId) && /^[0-9a-fA-F]{24}$/.test(cleanId);
      let mongoFilter: any = null;
      if (isObjectId) {
        mongoFilter = { _id: cleanId };
      } else if (foundSlug) {
        mongoFilter = { slug: foundSlug.toLowerCase() };
      } else {
        mongoFilter = { slug: cleanId.toLowerCase() };
      }

      const mongoCategory = await Category.findOne(mongoFilter);
      if (mongoCategory) {
        if (body.name !== undefined) mongoCategory.name = body.name;
        if (body.slug !== undefined) mongoCategory.slug = body.slug;
        if (body.description !== undefined) mongoCategory.description = body.description;
        if (body.image !== undefined) mongoCategory.image = body.image;
        if (body.displayOrder !== undefined) mongoCategory.displayOrder = body.displayOrder;
        if (body.isActive !== undefined) mongoCategory.isActive = body.isActive;
        if (body.isRestricted !== undefined) mongoCategory.isRestricted = body.isRestricted;
        if (body.complianceRequirements !== undefined) mongoCategory.complianceRequirements = body.complianceRequirements;

        if (body.parentCategory !== undefined) {
          if (!body.parentCategory || body.parentCategory.trim() === "") {
            mongoCategory.parentCategory = undefined;
          } else {
            const cleanParent = body.parentCategory.trim();
            let parentDoc = null;
            if (mongoose.Types.ObjectId.isValid(cleanParent) && /^[0-9a-fA-F]{24}$/.test(cleanParent)) {
              parentDoc = await Category.findById(cleanParent);
            } else {
              parentDoc = await Category.findOne({ slug: cleanParent.toLowerCase() });
            }
            if (parentDoc) {
              mongoCategory.parentCategory = parentDoc._id;
            }
          }
        }

        await mongoCategory.save();
        if (!updatedCategory) {
          updatedCategory = await Category.findById(mongoCategory._id)
            .populate("parentCategory", "name slug")
            .lean();
        }
      }
    } catch (mongoErr) {
      console.error("Error updating category in MongoDB:", mongoErr);
    }

    if (!updatedCategory) {
      throw new NotFoundError("Category not found");
    }

    return apiSuccess({ category: updatedCategory }, "Category updated successfully");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(req, "ADMIN", "STAFF");
    const { id } = await params;
    const cleanId = id.trim();

    let deletedFromSupabase = false;
    let deletedFromMongo = false;
    let foundSlug: string | null = null;

    // 1. Delete from Supabase
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      let supaQuery = supabase.from("categories").select("id, slug");
      if (isUuid) {
        supaQuery = supaQuery.eq("id", cleanId);
      } else {
        supaQuery = supaQuery.eq("slug", cleanId.toLowerCase());
      }
      const { data: supaCat } = await supaQuery.maybeSingle();

      if (supaCat) {
        foundSlug = supaCat.slug;
        // Unlink child subcategories in Supabase
        await supabase
          .from("categories")
          .update({ parent_category_id: null })
          .eq("parent_category_id", supaCat.id);

        // Unlink products referencing this category in Supabase
        await supabase
          .from("products")
          .update({ category_id: null })
          .eq("category_id", supaCat.id);

        const { error: delErr } = await supabase.from("categories").delete().eq("id", supaCat.id);
        if (!delErr) {
          deletedFromSupabase = true;
        }
      }
    } catch (supaErr) {
      console.error("Error deleting category from Supabase:", supaErr);
    }

    // 2. Delete from MongoDB
    try {
      await connectToDatabase();
      const isObjectId = mongoose.Types.ObjectId.isValid(cleanId) && /^[0-9a-fA-F]{24}$/.test(cleanId);
      let mongoFilter: any = null;

      if (isObjectId) {
        mongoFilter = { _id: cleanId };
      } else if (foundSlug) {
        mongoFilter = { slug: foundSlug.toLowerCase() };
      } else {
        mongoFilter = { slug: cleanId.toLowerCase() };
      }

      const mongoDeleted = await Category.findOneAndDelete(mongoFilter);
      if (mongoDeleted) {
        deletedFromMongo = true;
        // Clear parentCategory reference in child categories
        await Category.updateMany(
          { parentCategory: mongoDeleted._id },
          { $set: { parentCategory: null } }
        );
        // Clear category and subcategory in products
        await Product.updateMany(
          { category: mongoDeleted._id },
          { $set: { category: null } }
        );
        await Product.updateMany(
          { subcategory: mongoDeleted._id },
          { $set: { subcategory: null } }
        );

        if (!foundSlug && mongoDeleted.slug) {
          foundSlug = mongoDeleted.slug;
          try {
            await supabase.from("categories").delete().eq("slug", mongoDeleted.slug);
          } catch {}
        }
      }
    } catch (mongoErr) {
      console.error("Error deleting category from MongoDB:", mongoErr);
    }

    if (!deletedFromSupabase && !deletedFromMongo) {
      throw new NotFoundError("Category not found");
    }

    return apiSuccess({ deleted: true }, "Category deleted successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
