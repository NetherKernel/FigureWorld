import mongoose from "mongoose";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ConflictError, ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";

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

import { supabase, mapSupabaseProduct } from "@/lib/supabase";

async function getProductsFromSupabase(searchParams: URLSearchParams) {
  try {
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
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    let query = supabase
      .from("products")
      .select("*, categories(id, name, slug)");

    if (status) {
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
    if (error || !rawProducts || rawProducts.length === 0) {
      return null;
    }

    let products = rawProducts.map((p) => mapSupabaseProduct(p, p.categories));

    // Category filter
    if (category) {
      const catLower = category.toLowerCase().trim();
      products = products.filter(
        (p: any) =>
          p.category?.slug === catLower ||
          p.category?.id === category ||
          p.category?._id === category ||
          (typeof p.category === "string" && (p.category === category || p.category === catLower))
      );
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
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // 1. Try Supabase products first
    const supaResult = await getProductsFromSupabase(searchParams);
    if (supaResult !== null) {
      return apiSuccess(
        {
          products: supaResult.products,
        },
        "Products retrieved successfully",
        200,
        supaResult.pagination
      );
    }

    // 2. Fallback to MongoDB
    await connectToDatabase();
    const category = searchParams.get("category");
    const subcategory = searchParams.get("subcategory");
    const brand = searchParams.get("brand");
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const isFeatured = searchParams.get("isFeatured");
    const isRestricted = searchParams.get("isRestricted");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const sort = searchParams.get("sort") || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    const filter: Record<string, unknown> = {};

    // Filter by status (default to active for storefront unless explicitly queried)
    if (status) {
      filter.status = status;
    } else {
      filter.status = "active";
    }

    // Category accepts either an ObjectId or a category slug (storefront links use slugs)
    if (category) {
      let categoryDoc: any = null;
      if (/^[0-9a-fA-F]{24}$/.test(category)) {
        categoryDoc = await Category.findById(category);
      } else {
        categoryDoc = await Category.findOne({ slug: category.toLowerCase().trim() });
      }

      if (!categoryDoc) {
        return apiSuccess({ products: [] }, "Products retrieved successfully", 200, {
          page,
          limit,
          total: 0,
          totalPages: 0,
        });
      }

      // Check if this category has child subcategories (e.g. Action Figures -> Dragon Ball, Marvel, etc.)
      const subcategories = await Category.find({ parentCategory: categoryDoc._id }).select("_id");
      if (subcategories.length > 0) {
        const subIds = subcategories.map((s) => s._id);
        filter.$or = [
          { category: categoryDoc._id },
          { category: { $in: subIds } },
          { subcategory: { $in: subIds } },
        ];
      } else {
        filter.$or = [{ category: categoryDoc._id }, { subcategory: categoryDoc._id }];
      }
    }

    // Direct Subcategory filter (e.g. ?subcategory=dragon-ball)
    if (subcategory) {
      let subDoc: any = null;
      if (/^[0-9a-fA-F]{24}$/.test(subcategory)) {
        subDoc = await Category.findById(subcategory);
      } else {
        subDoc = await Category.findOne({ slug: subcategory.toLowerCase().trim() });
      }

      if (!subDoc) {
        return apiSuccess({ products: [] }, "Products retrieved successfully", 200, {
          page,
          limit,
          total: 0,
          totalPages: 0,
        });
      }

      filter.$or = [{ subcategory: subDoc._id }, { category: subDoc._id }];
    }

    if (brand) filter.brand = brand;
    if (isFeatured === "true") filter.isFeatured = true;
    if (isRestricted === "true") filter.isRestricted = true;
    if (isRestricted === "false") filter.isRestricted = false;
    if (searchParams.get("onSale") === "true") filter.discountPrice = { $gt: 0 };
    if (searchParams.get("inStock") === "true") filter.stock = { $gt: 0 };
    const minRating = parseFloat(searchParams.get("minRating") || "");
    if (!Number.isNaN(minRating) && minRating > 0) filter.ratingAverage = { $gte: minRating };

    let sortOption: any = { createdAt: -1 };
    if (sort === "price-asc") sortOption = { price: 1 };
    else if (sort === "price-desc") sortOption = { price: -1 };
    else if (sort === "name") sortOption = { name: 1 };
    else if (sort === "rating") sortOption = { ratingAverage: -1 };

    let products = await Product.find(filter)
      .sort(sortOption)
      .populate({ path: "category", select: "name slug isRestricted complianceRequirements", strictPopulate: false })
      .populate({ path: "subcategory", select: "name slug parentCategory", strictPopulate: false });

    // If search term provided, filter in memory or regex
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

    // Price range applies to the price the customer actually pays (discount price when on sale)
    const min = parseFloat(minPrice || "");
    const max = parseFloat(maxPrice || "");
    if (!Number.isNaN(min) || !Number.isNaN(max)) {
      products = products.filter((p: any) => {
        const paid = p.discountPrice > 0 && p.discountPrice < p.price ? p.discountPrice : p.price;
        return (Number.isNaN(min) || paid >= min) && (Number.isNaN(max) || paid <= max);
      });
    }

    if (sort === "price-asc" || sort === "price-desc") {
      const paid = (p: any) => (p.discountPrice > 0 && p.discountPrice < p.price ? p.discountPrice : p.price);
      products = [...products].sort((a: any, b: any) => (sort === "price-asc" ? paid(a) - paid(b) : paid(b) - paid(a)));
    }

    const total = products.length;
    const startIndex = (page - 1) * limit;
    const paginatedProducts = products.slice(startIndex, startIndex + limit);

    return apiSuccess(
      {
        products: paginatedProducts,
      },
      "Products retrieved successfully",
      200,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
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

    await connectToDatabase();

    // Check SKU uniqueness in MongoDB
    const existingSku = await Product.findOne({ sku: data.sku });
    if (existingSku) {
      throw new ConflictError(`A product with SKU "${data.sku}" already exists.`);
    }

    // Check Slug uniqueness in MongoDB
    const existingSlug = await Product.findOne({ slug: data.slug });
    if (existingSlug) {
      throw new ConflictError(`A product with slug "${data.slug}" already exists.`);
    }

    // Resolve category across Supabase and MongoDB
    let supaCategoryId: string | null = null;
    let mongoCategoryId: mongoose.Types.ObjectId | null = null;
    let categorySlug: string | null = null;
    let catIsRestricted = false;
    let catMinAge = 0;
    let catRegions: string[] = [];

    const cleanCat = data.category.trim();
    const isCatUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCat);
    const isCatObjectId = mongoose.Types.ObjectId.isValid(cleanCat) && /^[0-9a-fA-F]{24}$/.test(cleanCat);

    if (isCatUuid) {
      supaCategoryId = cleanCat;
      const { data: supaC } = await supabase.from("categories").select("*").eq("id", cleanCat).maybeSingle();
      if (supaC) {
        categorySlug = supaC.slug;
        catIsRestricted = Boolean(supaC.is_restricted);
        catMinAge = supaC.compliance_requirements?.minAge || 0;
        catRegions = supaC.compliance_requirements?.restrictedRegions || [];
      }
    } else if (isCatObjectId) {
      const mongoC = await Category.findById(cleanCat);
      if (mongoC) {
        mongoCategoryId = mongoC._id as mongoose.Types.ObjectId;
        categorySlug = mongoC.slug;
        catIsRestricted = Boolean(mongoC.isRestricted);
        catMinAge = mongoC.complianceRequirements?.minAge || 0;
        catRegions = mongoC.complianceRequirements?.restrictedRegions || [];
      }
    } else {
      categorySlug = cleanCat.toLowerCase();
    }

    if (categorySlug) {
      if (!mongoCategoryId) {
        let mongoC = await Category.findOne({ slug: categorySlug });
        if (!mongoC) {
          // If not in MongoDB, create stub category in MongoDB
          mongoC = await Category.create({
            name: categorySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            slug: categorySlug,
            isRestricted: catIsRestricted,
          });
        }
        mongoCategoryId = mongoC._id as mongoose.Types.ObjectId;
      }
      if (!supaCategoryId) {
        const { data: supaC } = await supabase.from("categories").select("id, is_restricted, compliance_requirements").eq("slug", categorySlug).maybeSingle();
        if (supaC) {
          supaCategoryId = supaC.id;
          if (supaC.is_restricted) catIsRestricted = true;
          if (supaC.compliance_requirements?.minAge) catMinAge = supaC.compliance_requirements.minAge;
          if (supaC.compliance_requirements?.restrictedRegions) catRegions = supaC.compliance_requirements.restrictedRegions;
        }
      }
    }

    // Resolve subcategory if provided
    let mongoSubId: mongoose.Types.ObjectId | undefined = undefined;
    if (data.subcategory && data.subcategory.trim()) {
      const cleanSub = data.subcategory.trim();
      const isSubUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanSub);
      const isSubObjectId = mongoose.Types.ObjectId.isValid(cleanSub) && /^[0-9a-fA-F]{24}$/.test(cleanSub);

      let subSlug: string | null = null;
      if (isSubUuid) {
        const { data: supaS } = await supabase.from("categories").select("slug").eq("id", cleanSub).maybeSingle();
        if (supaS) subSlug = supaS.slug;
      } else if (isSubObjectId) {
        const mSub = await Category.findById(cleanSub);
        if (mSub) {
          mongoSubId = mSub._id as mongoose.Types.ObjectId;
          subSlug = mSub.slug;
        }
      } else {
        subSlug = cleanSub.toLowerCase();
      }

      if (subSlug && !mongoSubId) {
        const mSub = await Category.findOne({ slug: subSlug });
        if (mSub) {
          mongoSubId = mSub._id as mongoose.Types.ObjectId;
        }
      }
    }

    // Inherit compliance from Category if restricted
    let isRestricted = Boolean(data.isRestricted || catIsRestricted);
    let ageRequirement = data.ageRequirement || catMinAge;
    let shippingRestrictions = data.shippingRestrictions?.length ? data.shippingRestrictions : catRegions;

    // 1. Create in Supabase
    let createdProductResult: any = null;
    try {
      const supaPayload: Record<string, any> = {
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: Number(data.price),
        discount_price: data.discountPrice !== undefined && data.discountPrice !== null ? Number(data.discountPrice) : null,
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

      if (!supaErr && supaCreated) {
        createdProductResult = mapSupabaseProduct(supaCreated, supaCreated.categories);
      } else if (supaErr) {
        console.error("Error creating product in Supabase:", supaErr);
      }
    } catch (supaErr) {
      console.error("Error saving product to Supabase:", supaErr);
    }

    // 2. Create in MongoDB
    try {
      if (mongoCategoryId) {
        const mongoCreated = await Product.create({
          ...data,
          category: mongoCategoryId,
          ...(mongoSubId ? { subcategory: mongoSubId } : { subcategory: undefined }),
          isRestricted,
          ageRequirement,
          shippingRestrictions,
        });

        if (!createdProductResult) {
          createdProductResult = mongoCreated;
        }
      }
    } catch (mongoErr) {
      console.error("Error creating product in MongoDB:", mongoErr);
    }

    if (!createdProductResult) {
      throw new Error("Failed to save product to database");
    }

    return apiSuccess({ product: createdProductResult }, "Product added successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}

