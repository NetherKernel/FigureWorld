import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
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

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    let supaQuery = supabase.from("categories").select("id, slug");
    if (isUuid) {
      supaQuery = supaQuery.eq("id", cleanId);
    } else {
      supaQuery = supaQuery.eq("slug", cleanId.toLowerCase());
    }
    const { data: supaExisting } = await supaQuery.maybeSingle();

    if (!supaExisting) {
      throw new NotFoundError("Category not found");
    }

    let parentSupaId: string | null | undefined = undefined;
    if (body.parentCategory !== undefined) {
      if (!body.parentCategory || body.parentCategory.trim() === "") {
        parentSupaId = null;
      } else {
        const cleanParent = body.parentCategory.trim();
        const isParentUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanParent);
        if (isParentUuid) {
          parentSupaId = cleanParent;
        } else {
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

    const supaUpdates: Record<string, any> = {};
    if (body.name !== undefined) supaUpdates.name = body.name;
    if (body.slug !== undefined) supaUpdates.slug = body.slug;
    if (body.description !== undefined) supaUpdates.description = body.description;
    if (body.image !== undefined) supaUpdates.image = body.image;
    if (body.displayOrder !== undefined) supaUpdates.display_order = body.displayOrder;
    if (body.isActive !== undefined) supaUpdates.is_active = body.isActive;
    if (body.isRestricted !== undefined) supaUpdates.is_restricted = body.isRestricted;
    if (body.complianceRequirements !== undefined)
      supaUpdates.compliance_requirements = body.complianceRequirements;
    if (parentSupaId !== undefined) supaUpdates.parent_category_id = parentSupaId;

    const { data: supaUpdated, error } = await supabase
      .from("categories")
      .update(supaUpdates)
      .eq("id", supaExisting.id)
      .select()
      .single();

    if (error || !supaUpdated) {
      throw new Error(`Failed to update category: ${error?.message || "Unknown error"}`);
    }

    const updated = mapSupabaseCategory(supaUpdated);
    return apiSuccess({ category: updated }, "Category updated successfully");
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

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    let supaQuery = supabase.from("categories").select("id, slug");
    if (isUuid) {
      supaQuery = supaQuery.eq("id", cleanId);
    } else {
      supaQuery = supaQuery.eq("slug", cleanId.toLowerCase());
    }
    const { data: supaCat } = await supaQuery.maybeSingle();

    if (!supaCat) {
      throw new NotFoundError("Category not found");
    }

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

    const { error: delErr } = await supabase
      .from("categories")
      .delete()
      .eq("id", supaCat.id);

    if (delErr) {
      throw new Error(`Failed to delete category from Supabase: ${delErr.message}`);
    }

    return apiSuccess({ deleted: true }, "Category deleted successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
