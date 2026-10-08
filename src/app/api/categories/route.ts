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

import { supabase, mapSupabaseCategory } from "@/lib/supabase";

async function getCategoriesFromSupabase(searchParams: URLSearchParams) {
  try {
    const restrictedOnly = searchParams.get("isRestricted");
    const parentOnly = searchParams.get("parentOnly") === "true" || searchParams.get("level") === "root";
    const parentCategory = searchParams.get("parentCategory");
    const asTree = searchParams.get("tree") === "true";

    const { data: rawCats, error } = await supabase
      .from("categories")
      .select("*")
      .order("display_order", { ascending: true });

    if (error || !rawCats || rawCats.length === 0) {
      return null;
    }

    const allCategories = rawCats.map((c) => {
      const mapped = mapSupabaseCategory(c);
      const parent = rawCats.find((p) => p.id === c.parent_category_id);
      return {
        ...mapped,
        parentCategory: parent ? { _id: parent.id, id: parent.id, name: parent.name, slug: parent.slug } : null,
      };
    });

    if (asTree) {
      const roots = allCategories.filter((c: any) => !c.parentCategory);
      return roots.map((root: any) => {
        const subcategories = allCategories.filter(
          (c: any) =>
            c.parentCategory &&
            (c.parentCategory.id === root.id || c.parentCategory._id === root.id)
        );
        return {
          ...root,
          subcategories,
          subcategoriesCount: subcategories.length,
        };
      });
    }

    let filtered = allCategories.filter((c: any) => c.isActive);

    if (restrictedOnly === "true") filtered = filtered.filter((c: any) => c.isRestricted);
    if (restrictedOnly === "false") filtered = filtered.filter((c: any) => !c.isRestricted);

    if (parentCategory) {
      const parent = rawCats.find(
        (p) => p.id === parentCategory || p.slug === parentCategory.toLowerCase().trim()
      );
      if (!parent) return [];
      filtered = filtered.filter(
        (c: any) => c.parentCategory && (c.parentCategory.id === parent.id || c.parentCategory._id === parent.id)
      );
    } else if (parentOnly) {
      filtered = filtered.filter((c: any) => !c.parentCategory);
    }

    return filtered;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // 1. Try Supabase categories first
    const supaResult = await getCategoriesFromSupabase(searchParams);
    if (supaResult !== null) {
      return apiSuccess({ categories: supaResult });
    }

    // 2. Fallback to MongoDB
    await connectToDatabase();

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

    // Resolve parent category for both databases if provided
    let parentCategoryId: mongoose.Types.ObjectId | undefined = undefined;
    let parentSupaId: string | null = null;

    if (data.parentCategory && data.parentCategory.trim()) {
      const cleanParent = data.parentCategory.trim();
      const isParentUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanParent);
      const isParentObjectId = mongoose.Types.ObjectId.isValid(cleanParent) && /^[0-9a-fA-F]{24}$/.test(cleanParent);

      let parentSlug: string | null = null;

      if (isParentUuid) {
        parentSupaId = cleanParent;
        const { data: supaP } = await supabase.from("categories").select("id, slug").eq("id", cleanParent).maybeSingle();
        if (supaP) {
          parentSlug = supaP.slug;
        }
      } else if (isParentObjectId) {
        const pDoc = await Category.findById(cleanParent);
        if (pDoc) {
          parentCategoryId = pDoc._id as mongoose.Types.ObjectId;
          parentSlug = pDoc.slug;
        }
      } else {
        parentSlug = cleanParent.toLowerCase();
      }

      if (parentSlug) {
        if (!parentCategoryId) {
          const mongoP = await Category.findOne({ slug: parentSlug });
          if (mongoP) {
            parentCategoryId = mongoP._id as mongoose.Types.ObjectId;
          }
        }
        if (!parentSupaId) {
          const { data: supaP } = await supabase.from("categories").select("id").eq("slug", parentSlug).maybeSingle();
          if (supaP) {
            parentSupaId = supaP.id;
          }
        }
      }
    }

    // 1. Create in Supabase
    let supaCreatedCategory: any = null;
    try {
      const { data: supaCat, error: supaErr } = await supabase
        .from("categories")
        .insert({
          name: data.name,
          slug: data.slug,
          description: data.description || "",
          parent_category_id: parentSupaId || null,
          display_order: data.displayOrder ?? 0,
          is_active: data.isActive ?? true,
          is_restricted: Boolean(data.isRestricted),
          compliance_requirements: data.complianceRequirements || null,
        })
        .select()
        .maybeSingle();

      if (!supaErr && supaCat) {
        supaCreatedCategory = mapSupabaseCategory(supaCat);
      } else if (supaErr) {
        console.error("Error creating category in Supabase:", supaErr);
      }
    } catch (supaErr) {
      console.error("Error saving category to Supabase:", supaErr);
    }

    // 2. Create in MongoDB
    const { parentCategory: _ignored, ...categoryData } = data;
    const newCategory: any = await Category.create({
      ...categoryData,
      ...(parentCategoryId ? { parentCategory: parentCategoryId } : {}),
    });

    const populated = await Category.findById(newCategory._id)
      .populate("parentCategory", "name slug")
      .lean();

    const result = supaCreatedCategory || populated;

    return apiSuccess({ category: result }, "Category created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}

