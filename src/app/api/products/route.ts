import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ConflictError, ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { supabase, mapSupabaseProduct } from "@/lib/supabase";

const imageSchema = z.object({
  url: z.string().min(1, "Image URL is required"),
  altText: z.string().default(""),
  isPrimary: z.boolean().default(false),
});

const dimensionsSchema = z.object({
  length: z.number().min(0).default(0),
  width: z.number().min(0).default(0),
  height: z.number().min(0).default(0),
  unit: z.string().default("cm"),
});

const createProductSchema = z.object({
  name: z.string().min(2, "Product name is required").max(200),
  slug: z.string().min(2, "Product slug is required").toLowerCase().trim(),
  description: z.string().min(5, "Description is required"),
  price: z.number().min(0, "Price must be positive"),
  discountPrice: z.number().min(0).optional(),
  stock: z.number().int().min(0).default(0),
  category: z.string().min(1, "Category ID is required"),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  sku: z.string().min(2, "SKU is required").toUpperCase().trim(),
  weight: z.number().min(0).default(500),
  dimensions: dimensionsSchema.optional(),
  images: z.array(imageSchema).default([]),
  status: z.enum(["draft", "active", "archived", "preorder"]).default("active"),
  isFeatured: z.boolean().default(false),
  isRestricted: z.boolean().default(false),
  ageRequirement: z.number().min(0).default(0),
  shippingRestrictions: z.array(z.string()).default([]),
});

async function getProductsFromSupabase(searchParams: URLSearchParams) {
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const brand = searchParams.get("brand");
  const search = searchParams.get("search");
  const status = searchParams.get("status") || "active";
  const isFeatured = searchParams.get("isFeatured");
  const isRestricted = searchParams.get("isRestricted");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const sort = searchParams.get("sort") || "newest";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "100", 10)));

  let query = supabase
    .from("products")
    .select("*, categories(id, name, slug)");

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (isFeatured === "true") {
    query = query.eq("is_featured", true);
  }
  if (isRestricted === "true") {
    query = query.eq("is_restricted", true);
  } else if (isRestricted === "false") {
    query = query.eq("is_restricted", false);
  }
  if (brand) {
    query = query.ilike("brand", `%${brand}%`);
  }

  const { data: rawProducts, error } = await query;
  if (error || !rawProducts) {
    return {
      products: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  let products = rawProducts.map((p) => mapSupabaseProduct(p, p.categories));

  // Category filter
  if (category) {
    const catClean = category.trim().toLowerCase();
    const isCatUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category.trim());

    let catQuery = supabase.from("categories").select("id, slug");
    if (isCatUuid) {
      catQuery = catQuery.eq("id", category.trim());
    } else {
      catQuery = catQuery.eq("slug", catClean);
    }
    const { data: parentCat } = await catQuery.maybeSingle();

    if (parentCat) {
      const { data: childCats } = await supabase
        .from("categories")
        .select("id, slug")
        .eq("parent_category_id", parentCat.id);

      const allCatSlugs = new Set<string>([parentCat.slug.toLowerCase()]);
      const allCatIds = new Set<string>([parentCat.id]);
      if (childCats) {
        for (const cc of childCats) {
          allCatSlugs.add(cc.slug.toLowerCase());
          allCatIds.add(cc.id);
        }
      }

      products = products.filter((p: any) => {
        const pCatSlug = p.category?.slug?.toLowerCase();
        const pCatId = p.category?.id || p.category?._id;
        return allCatSlugs.has(pCatSlug) || allCatIds.has(pCatId);
      });
    } else {
      products = products.filter((p: any) => {
        const pCatSlug = p.category?.slug?.toLowerCase();
        const pCatId = p.category?.id || p.category?._id;
        return pCatSlug === catClean || pCatId === category;
      });
    }
  }

  // Subcategory filter
  if (subcategory) {
    const subLower = subcategory.toLowerCase().trim();
    products = products.filter(
      (p: any) =>
        p.category?.slug === subLower ||
        p.category?.id === subcategory ||
        p.tags?.some((t: string) => t.toLowerCase().includes(subLower))
    );
  }

  // Search filter
  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    products = products.filter(
      (p: any) =>
        p.name?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term)
    );
  }

  // On sale filter
  if (searchParams.get("onSale") === "true") {
    products = products.filter((p: any) => p.discountPrice && p.discountPrice > 0);
  }
  // In stock filter
  if (searchParams.get("inStock") === "true") {
    products = products.filter((p: any) => p.stock > 0);
  }
  const minRating = parseFloat(searchParams.get("minRating") || "");
  if (!Number.isNaN(minRating) && minRating > 0) {
    products = products.filter((p: any) => (p.ratingAverage || 5) >= minRating);
  }

  // Price range
  const min = parseFloat(minPrice || "");
  const max = parseFloat(maxPrice || "");
  if (!Number.isNaN(min) || !Number.isNaN(max)) {
    products = products.filter((p: any) => {
      const paid = p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.price;
      return (Number.isNaN(min) || paid >= min) && (Number.isNaN(max) || paid <= max);
    });
  }

  // Sorting
  const paid = (p: any) => (p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.price);
  if (sort === "price-asc") {
    products.sort((a: any, b: any) => paid(a) - paid(b));
  } else if (sort === "price-desc") {
    products.sort((a: any, b: any) => paid(b) - paid(a));
  } else if (sort === "name") {
    products.sort((a: any, b: any) => a.name.localeCompare(b.name));
  } else if (sort === "rating") {
    products.sort((a: any, b: any) => (b.ratingAverage || 0) - (a.ratingAverage || 0));
  } else {
    products.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const total = products.length;
  const startIndex = (page - 1) * limit;
  const paginatedProducts = products.slice(startIndex, startIndex + limit);

  return {
    products: paginatedProducts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const supaResult = await getProductsFromSupabase(searchParams);

    return apiSuccess(
      {
        products: supaResult.products,
      },
      "Products retrieved successfully",
      200,
      supaResult.pagination
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    // Admin or Staff role required to add products
    await requireRole(req, "ADMIN", "STAFF");

    const data = await validateRequestBody(req, createProductSchema);

    // Check SKU uniqueness in Supabase
    const { data: existingSku } = await supabase
      .from("products")
      .select("id")
      .eq("sku", data.sku)
      .maybeSingle();

    if (existingSku) {
      throw new ConflictError(`A product with SKU "${data.sku}" already exists.`);
    }

    // Check Slug uniqueness in Supabase
    const { data: existingSlug } = await supabase
      .from("products")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();

    if (existingSlug) {
      throw new ConflictError(`A product with slug "${data.slug}" already exists.`);
    }

    // Resolve category from Supabase
    let supaCategoryId: string | null = null;
    let catIsRestricted = false;
    let catMinAge = 0;
    let catRegions: string[] = [];

    const cleanCat = data.category.trim();
    const isCatUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCat);

    let catQuery = supabase.from("categories").select("*");
    if (isCatUuid) {
      catQuery = catQuery.eq("id", cleanCat);
    } else {
      catQuery = catQuery.eq("slug", cleanCat.toLowerCase());
    }

    const { data: supaC } = await catQuery.maybeSingle();
    if (supaC) {
      supaCategoryId = supaC.id;
      catIsRestricted = Boolean(supaC.is_restricted);
      catMinAge = supaC.compliance_requirements?.minAge || 0;
      catRegions = supaC.compliance_requirements?.restrictedRegions || [];
    }

    // Inherit compliance from Category if restricted
    const isRestricted = Boolean(data.isRestricted || catIsRestricted);
    const ageRequirement = data.ageRequirement || catMinAge;
    const shippingRestrictions = data.shippingRestrictions?.length ? data.shippingRestrictions : catRegions;

    // Create in Supabase
    const supaPayload: Record<string, any> = {
      name: data.name,
      slug: data.slug,
      description: data.description,
      price: Number(data.price),
      discount_price:
        data.discountPrice !== undefined && data.discountPrice !== null ? Number(data.discountPrice) : null,
      stock: Number(data.stock ?? 0),
      low_stock_threshold: 5,
      brand: data.brand || "",
      sku: data.sku,
      weight: Number(data.weight ?? 500),
      dimensions: data.dimensions || { length: 15, width: 15, height: 25, unit: "cm" },
      images: data.images || [],
      tags: [],
      status: data.status || "active",
      is_featured: Boolean(data.isFeatured),
      is_restricted: Boolean(isRestricted),
      age_requirement: Number(ageRequirement || 0),
      shipping_restrictions: shippingRestrictions || [],
      category_id: supaCategoryId || null,
      rating_average: 5.0,
      reviews_count: 0,
      specifications: {},
    };

    const { data: supaCreated, error: supaErr } = await supabase
      .from("products")
      .insert(supaPayload)
      .select("*, categories(*)")
      .maybeSingle();

    if (supaErr || !supaCreated) {
      throw new Error(`Failed to save product to Supabase: ${supaErr?.message || "Unknown error"}`);
    }

    const createdProductResult = mapSupabaseProduct(supaCreated, supaCreated.categories);

    return apiSuccess({ product: createdProductResult }, "Product added successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
