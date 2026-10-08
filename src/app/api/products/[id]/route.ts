import mongoose from "mongoose";
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
    await requireRole(req, "ADMIN", "STAFF");
    const { id } = await params;
    const cleanId = id.trim();

    let body: any;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    let updatedProduct: any = null;
    let foundSlug: string | null = null;

    // 1. Update in Supabase
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      let supaQuery = supabase.from("products").select("id, slug");
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
        if (body.price !== undefined) supaUpdates.price = Number(body.price);
        if (body.discountPrice !== undefined) supaUpdates.discount_price = body.discountPrice !== null ? Number(body.discountPrice) : null;
        if (body.stock !== undefined) supaUpdates.stock = Number(body.stock);
        if (body.lowStockThreshold !== undefined) supaUpdates.low_stock_threshold = Number(body.lowStockThreshold);
        if (body.brand !== undefined) supaUpdates.brand = body.brand;
        if (body.sku !== undefined) supaUpdates.sku = body.sku;
        if (body.weight !== undefined) supaUpdates.weight = Number(body.weight);
        if (body.dimensions !== undefined) supaUpdates.dimensions = body.dimensions;
        if (body.images !== undefined) supaUpdates.images = body.images;
        if (body.tags !== undefined) supaUpdates.tags = body.tags;
        if (body.status !== undefined) supaUpdates.status = body.status;
        if (body.isFeatured !== undefined) supaUpdates.is_featured = Boolean(body.isFeatured);
        if (body.isRestricted !== undefined) supaUpdates.is_restricted = Boolean(body.isRestricted);
        if (body.ageRequirement !== undefined) supaUpdates.age_requirement = Number(body.ageRequirement);
        if (body.shippingRestrictions !== undefined) supaUpdates.shipping_restrictions = body.shippingRestrictions;
        if (body.specifications !== undefined) supaUpdates.specifications = body.specifications;
        if (body.category !== undefined) {
          const catId = typeof body.category === "object" ? body.category._id || body.category.id : body.category;
          if (catId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(catId)) {
            supaUpdates.category_id = catId;
          }
        }

        const { data: updatedSupa } = await supabase
          .from("products")
          .update(supaUpdates)
          .eq("id", supaExisting.id)
          .select("*, categories(*)")
          .maybeSingle();

        if (updatedSupa) {
          updatedProduct = mapSupabaseProduct(updatedSupa, updatedSupa.categories);
        }
      }
    } catch (supaErr) {
      console.error("Error updating product in Supabase:", supaErr);
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

      const mongoProduct = await Product.findOneAndUpdate(mongoFilter, { $set: body }, { new: true });
      if (mongoProduct && !updatedProduct) {
        updatedProduct = mongoProduct;
      }
    } catch (mongoErr) {
      console.error("Error updating product in MongoDB:", mongoErr);
    }

    if (!updatedProduct) {
      throw new NotFoundError("Product not found");
    }

    return apiSuccess({ product: updatedProduct }, "Product updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, "ADMIN", "STAFF");
    const { id } = await params;
    const cleanId = id.trim();
    const data = await validateRequestBody(req, patchProductSchema);

    let updatedProduct: any = null;
    let foundSlug: string | null = null;

    // 1. Update in Supabase
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      let supaQuery = supabase.from("products").select("id, slug");
      if (isUuid) {
        supaQuery = supaQuery.eq("id", cleanId);
      } else {
        supaQuery = supaQuery.eq("slug", cleanId.toLowerCase());
      }
      const { data: supaExisting } = await supaQuery.maybeSingle();

      if (supaExisting) {
        foundSlug = supaExisting.slug;
        const supaFields: Record<string, any> = {};
        if (data.price !== undefined) supaFields.price = data.price;
        if (data.discountPrice !== undefined) supaFields.discount_price = data.discountPrice;
        if (data.stock !== undefined) supaFields.stock = data.stock;
        if (data.status !== undefined) supaFields.status = data.status;
        if (data.isFeatured !== undefined) supaFields.is_featured = data.isFeatured;
        if (data.isRestricted !== undefined) supaFields.is_restricted = data.isRestricted;

        const { data: updatedSupa } = await supabase
          .from("products")
          .update(supaFields)
          .eq("id", supaExisting.id)
          .select("*, categories(*)")
          .maybeSingle();

        if (updatedSupa) {
          updatedProduct = mapSupabaseProduct(updatedSupa, updatedSupa.categories);
        }
      }
    } catch (supaErr) {
      console.error("Error patching product in Supabase:", supaErr);
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

      const updateFields: Record<string, unknown> = {};
      if (data.price !== undefined) updateFields.price = data.price;
      if (data.discountPrice !== undefined) updateFields.discountPrice = data.discountPrice;
      if (data.stock !== undefined) updateFields.stock = data.stock;
      if (data.status !== undefined) updateFields.status = data.status;
      if (data.isFeatured !== undefined) updateFields.isFeatured = data.isFeatured;
      if (data.isRestricted !== undefined) updateFields.isRestricted = data.isRestricted;

      const mongoProduct = await Product.findOneAndUpdate(mongoFilter, { $set: updateFields }, { new: true });
      if (mongoProduct && !updatedProduct) {
        updatedProduct = mongoProduct;
      }
    } catch (mongoErr) {
      console.error("Error patching product in MongoDB:", mongoErr);
    }

    if (!updatedProduct) {
      throw new NotFoundError("Product not found");
    }

    return apiSuccess({ product: updatedProduct }, "Product updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
      let supaQuery = supabase.from("products").select("id, slug");
      if (isUuid) {
        supaQuery = supaQuery.eq("id", cleanId);
      } else {
        supaQuery = supaQuery.eq("slug", cleanId.toLowerCase());
      }
      const { data: supaItem } = await supaQuery.maybeSingle();

      if (supaItem) {
        foundSlug = supaItem.slug;
        const { error: delErr } = await supabase.from("products").delete().eq("id", supaItem.id);
        if (!delErr) {
          deletedFromSupabase = true;
        }
      }
    } catch (supaErr) {
      console.error("Error deleting product from Supabase:", supaErr);
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

      const mongoDeleted = await Product.findOneAndDelete(mongoFilter);
      if (mongoDeleted) {
        deletedFromMongo = true;
        if (!foundSlug && mongoDeleted.slug) {
          foundSlug = mongoDeleted.slug;
          try {
            await supabase.from("products").delete().eq("slug", mongoDeleted.slug);
          } catch {}
        }
      }
    } catch (mongoErr) {
      console.error("Error deleting product from MongoDB:", mongoErr);
    }

    if (!deletedFromSupabase && !deletedFromMongo) {
      throw new NotFoundError("Product not found");
    }

    return apiSuccess({ deleted: true }, "Product deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
