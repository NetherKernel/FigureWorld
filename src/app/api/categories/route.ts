import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { supabase, mapSupabaseCategory } from "@/lib/supabase";

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
    const { searchParams } = new URL(req.url);
    const restrictedOnly = searchParams.get("isRestricted");
    const parentOnly = searchParams.get("parentOnly") === "true" || searchParams.get("level") === "root";
    const parentCategory = searchParams.get("parentCategory");
    const asTree = searchParams.get("tree") === "true";

    const { data: rawCats, error } = await supabase
      .from("categories")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      throw new Error(`Failed to load categories: ${error.message}`);
    }

    const allCategories = (rawCats || []).map((c) => {
      const mapped = mapSupabaseCategory(c);
      const parent = rawCats?.find((p) => p.id === c.parent_category_id);
      return {
        ...mapped,
        parentCategory: parent
          ? { _id: parent.id, id: parent.id, name: parent.name, slug: parent.slug }
          : null,
      };
    });

    if (asTree) {
      const roots = allCategories.filter((c: any) => !c.parentCategory);
      const tree = roots.map((root: any) => {
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

      return apiSuccess({ categories: tree });
    }

    let filtered = allCategories.filter((c: any) => c.isActive);

    if (restrictedOnly === "true") filtered = filtered.filter((c: any) => c.isRestricted);
    if (restrictedOnly === "false") filtered = filtered.filter((c: any) => !c.isRestricted);

    if (parentCategory) {
      const parent = rawCats?.find(
        (p) => p.id === parentCategory || p.slug === parentCategory.toLowerCase().trim()
      );
      if (!parent) return apiSuccess({ categories: [] });
      filtered = filtered.filter(
        (c: any) =>
          c.parentCategory &&
          (c.parentCategory.id === parent.id || c.parentCategory._id === parent.id)
      );
    } else if (parentOnly) {
      filtered = filtered.filter((c: any) => !c.parentCategory);
    }

    return apiSuccess({ categories: filtered });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(req, "ADMIN", "STAFF");

    const data = await validateRequestBody(req, createCategorySchema);

    // Check slug uniqueness in Supabase
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();

    if (existing) {
      throw new ConflictError("A category with this slug already exists.");
    }

    // Resolve parent category
    let parentSupaId: string | null = null;
    if (data.parentCategory && data.parentCategory.trim()) {
      const cleanParent = data.parentCategory.trim();
      const isParentUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanParent);

      let pQuery = supabase.from("categories").select("id, slug");
      if (isParentUuid) {
        pQuery = pQuery.eq("id", cleanParent);
      } else {
        pQuery = pQuery.eq("slug", cleanParent.toLowerCase());
      }
      const { data: supaP } = await pQuery.maybeSingle();
      if (supaP) {
        parentSupaId = supaP.id;
      }
    }

    const { data: supaCat, error: supaErr } = await supabase
      .from("categories")
      .insert({
        name: data.name,
        slug: data.slug,
        description: data.description || "",
        image: data.image || null,
        parent_category_id: parentSupaId,
        display_order: data.displayOrder ?? 0,
        is_active: data.isActive ?? true,
        is_restricted: Boolean(data.isRestricted),
        compliance_requirements: data.complianceRequirements || {},
      })
      .select()
      .single();

    if (supaErr || !supaCat) {
      throw new Error(`Failed to create category in Supabase: ${supaErr?.message || "Unknown error"}`);
    }

    const created = mapSupabaseCategory(supaCat);
    return apiSuccess({ category: created }, "Category created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
