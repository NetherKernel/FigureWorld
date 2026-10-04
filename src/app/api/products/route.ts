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

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const brand = searchParams.get("brand");
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const isFeatured = searchParams.get("isFeatured");
    const isRestricted = searchParams.get("isRestricted");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const sort = searchParams.get("sort") || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const filter: Record<string, unknown> = {};

    // Filter by status (default to active for storefront unless explicitly queried)
    if (status) {
      filter.status = status;
    } else {
      filter.status = "active";
    }

    // Category accepts either an ObjectId or a category slug (storefront links use slugs)
    if (category) {
      if (/^[0-9a-fA-F]{24}$/.test(category)) {
        filter.category = category;
      } else {
        const categoryDoc = await Category.findOne({ slug: category.toLowerCase() });
        if (!categoryDoc) {
          return apiSuccess({ products: [] }, "Products retrieved successfully", 200, {
            page,
            limit,
            total: 0,
            totalPages: 0,
          });
        }
        filter.category = categoryDoc._id;
      }
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

    let products = await Product.find(filter).sort(sortOption);

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

    // Check SKU uniqueness
    const existingSku = await Product.findOne({ sku: data.sku });
    if (existingSku) {
      throw new ConflictError(`A product with SKU "${data.sku}" already exists.`);
    }

    // Check Slug uniqueness
    const existingSlug = await Product.findOne({ slug: data.slug });
    if (existingSlug) {
      throw new ConflictError(`A product with slug "${data.slug}" already exists.`);
    }

    // Inherit compliance from Category if category is restricted
    const categoryDoc = await Category.findById(data.category);
    let isRestricted = data.isRestricted;
    let ageRequirement = data.ageRequirement;
    let shippingRestrictions = data.shippingRestrictions || [];

    if (categoryDoc && categoryDoc.isRestricted) {
      isRestricted = true;
      if (!ageRequirement && categoryDoc.complianceRequirements?.minAge) {
        ageRequirement = categoryDoc.complianceRequirements.minAge;
      }
      if (
        shippingRestrictions.length === 0 &&
        categoryDoc.complianceRequirements?.restrictedRegions?.length
      ) {
        shippingRestrictions = categoryDoc.complianceRequirements.restrictedRegions;
      }
    }

    const newProduct = await Product.create({
      ...data,
      isRestricted,
      ageRequirement,
      shippingRestrictions,
    });

    return apiSuccess({ product: newProduct }, "Product added successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
