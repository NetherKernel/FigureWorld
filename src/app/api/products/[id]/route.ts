import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";

const patchProductSchema = z.object({
  price: z.number().min(0).optional(),
  discountPrice: z.number().min(0).nullable().optional(),
  stock: z.number().int().min(0).optional(),
  status: z.enum(["draft", "active", "archived", "preorder"]).optional(),
  isFeatured: z.boolean().optional(),
  isRestricted: z.boolean().optional(),
});

import { supabase, mapSupabaseProduct, mapSupabaseCategory } from "@/lib/supabase";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Try Supabase product first
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let supaQuery = supabase.from("products").select("*, categories(*)");
      if (isUuid) {
        supaQuery = supaQuery.eq("id", id);
      } else {
        supaQuery = supaQuery.eq("slug", id.toLowerCase().trim());
      }
      const { data: supaProd } = await supaQuery.maybeSingle();

      if (supaProd) {
        const product = mapSupabaseProduct(supaProd, supaProd.categories);
        const category = mapSupabaseCategory(supaProd.categories);
        return apiSuccess({
          product,
          category,
        });
      }
    } catch {
      // Continue to MongoDB fallback
    }

    // 2. Fallback to MongoDB
    await connectToDatabase();

    // Query by MongoDB _id or slug
    let product = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id);
    }
    if (!product) {
      product = await Product.findOne({ slug: id });
    }

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    // Attach Category details for compliance
    const category = await Category.findById(product.category);

    return apiSuccess({
      product,
      category,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Admin or Staff can edit products
    await requireRole(req, "ADMIN", "STAFF");
    const { id } = await params;

    let body: any;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    await connectToDatabase();

    const product = await Product.findByIdAndUpdate(id, { $set: body }, { new: true });
    if (!product) {
      throw new NotFoundError("Product not found");
    }

    return apiSuccess({ product }, "Product updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Admin or Staff can quickly change price, stock, or status
    await requireRole(req, "ADMIN", "STAFF");
    const { id } = await params;
    const data = await validateRequestBody(req, patchProductSchema);

    await connectToDatabase();

    const updateFields: Record<string, unknown> = {};
    if (data.price !== undefined) updateFields.price = data.price;
    if (data.discountPrice !== undefined) updateFields.discountPrice = data.discountPrice;
    if (data.stock !== undefined) updateFields.stock = data.stock;
    if (data.status !== undefined) updateFields.status = data.status;
    if (data.isFeatured !== undefined) updateFields.isFeatured = data.isFeatured;
    if (data.isRestricted !== undefined) updateFields.isRestricted = data.isRestricted;

    const product = await Product.findByIdAndUpdate(id, { $set: updateFields }, { new: true });
    if (!product) {
      throw new NotFoundError("Product not found");
    }

    return apiSuccess({ product }, "Product updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Strictly ADMIN can delete products
    await requireRole(req, "ADMIN");
    const { id } = await params;

    await connectToDatabase();

    const deleted = await Product.findOneAndDelete({ _id: id });
    if (!deleted) {
      throw new NotFoundError("Product not found");
    }

    return apiSuccess({ deleted: true }, "Product deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
