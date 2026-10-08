import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { supabase, mapSupabaseProduct, mapSupabaseCategory } from "@/lib/supabase";

const patchProductSchema = z.object({
  price: z.number().min(0).optional(),
  discountPrice: z.number().min(0).nullable().optional(),
  stock: z.number().int().min(0).optional(),
  status: z.enum(["draft", "active", "archived", "preorder"]).optional(),
  isFeatured: z.boolean().optional(),
  isRestricted: z.boolean().optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cleanId = id.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

    let query = supabase.from("products").select("*, categories(*)");
    if (isUuid) {
      query = query.eq("id", cleanId);
    } else {
      query = query.eq("slug", cleanId.toLowerCase());
    }

    const { data: supaProd, error } = await query.maybeSingle();

    if (error || !supaProd) {
      throw new NotFoundError("Product not found");
    }

    const product = mapSupabaseProduct(supaProd, supaProd.categories);
    const category = mapSupabaseCategory(supaProd.categories);

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

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    let supaQuery = supabase.from("products").select("id, slug");
    if (isUuid) {
      supaQuery = supaQuery.eq("id", cleanId);
    } else {
      supaQuery = supaQuery.eq("slug", cleanId.toLowerCase());
    }

    const { data: existing } = await supaQuery.maybeSingle();
    if (!existing) {
      throw new NotFoundError("Product not found");
    }

    const supaUpdates: Record<string, any> = {};
    if (body.name !== undefined) supaUpdates.name = body.name;
    if (body.slug !== undefined) supaUpdates.slug = body.slug;
    if (body.description !== undefined) supaUpdates.description = body.description;
    if (body.price !== undefined) supaUpdates.price = Number(body.price);
    if (body.discountPrice !== undefined)
      supaUpdates.discount_price = body.discountPrice !== null ? Number(body.discountPrice) : null;
    if (body.stock !== undefined) supaUpdates.stock = Number(body.stock);
    if (body.lowStockThreshold !== undefined)
      supaUpdates.low_stock_threshold = Number(body.lowStockThreshold);
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

    const { data: updatedSupa, error: updateErr } = await supabase
      .from("products")
      .update(supaUpdates)
      .eq("id", existing.id)
      .select("*, categories(*)")
      .maybeSingle();

    if (updateErr || !updatedSupa) {
      throw new Error(`Failed to update product: ${updateErr?.message || "Unknown error"}`);
    }

    const updatedProduct = mapSupabaseProduct(updatedSupa, updatedSupa.categories);
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

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    let supaQuery = supabase.from("products").select("id, slug");
    if (isUuid) {
      supaQuery = supaQuery.eq("id", cleanId);
    } else {
      supaQuery = supaQuery.eq("slug", cleanId.toLowerCase());
    }

    const { data: existing } = await supaQuery.maybeSingle();
    if (!existing) {
      throw new NotFoundError("Product not found");
    }

    const supaFields: Record<string, any> = {};
    if (data.price !== undefined) supaFields.price = data.price;
    if (data.discountPrice !== undefined) supaFields.discount_price = data.discountPrice;
    if (data.stock !== undefined) supaFields.stock = data.stock;
    if (data.status !== undefined) supaFields.status = data.status;
    if (data.isFeatured !== undefined) supaFields.is_featured = data.isFeatured;
    if (data.isRestricted !== undefined) supaFields.is_restricted = data.isRestricted;

    const { data: updatedSupa, error: patchErr } = await supabase
      .from("products")
      .update(supaFields)
      .eq("id", existing.id)
      .select("*, categories(*)")
      .maybeSingle();

    if (patchErr || !updatedSupa) {
      throw new Error(`Failed to patch product: ${patchErr?.message || "Unknown error"}`);
    }

    const updatedProduct = mapSupabaseProduct(updatedSupa, updatedSupa.categories);
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

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    let supaQuery = supabase.from("products").select("id, slug");
    if (isUuid) {
      supaQuery = supaQuery.eq("id", cleanId);
    } else {
      supaQuery = supaQuery.eq("slug", cleanId.toLowerCase());
    }

    const { data: supaItem } = await supaQuery.maybeSingle();
    if (!supaItem) {
      throw new NotFoundError("Product not found");
    }

    const { error: delErr } = await supabase.from("products").delete().eq("id", supaItem.id);
    if (delErr) {
      throw new Error(`Failed to delete product from Supabase: ${delErr.message}`);
    }

    return apiSuccess({ deleted: true }, "Product deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
