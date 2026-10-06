import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jcafygcduqekgoaixddo.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_uIe7CXMwm1bocUu-9BBUHA_38dxrdKK";

// Client for browser and authenticated public operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side service client for privileged administrative tasks (if service role key provided)
export function getServiceSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function mapSupabaseCategory(c: any) {
  if (!c) return null;
  return {
    _id: c.id,
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description || "",
    parentCategory: c.parent_category_id || null,
    displayOrder: c.display_order ?? 0,
    isActive: c.is_active ?? true,
    isRestricted: Boolean(c.is_restricted),
    complianceRequirements: c.compliance_requirements || {
      minAge: 0,
      requiresIdVerification: false,
      disclaimerText: "",
      restrictedRegions: [],
    },
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

export function mapSupabaseProduct(p: any, categoryDoc?: any) {
  if (!p) return null;
  return {
    _id: p.id,
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description || "",
    price: Number(p.price || 0),
    discountPrice:
      p.discount_price !== null && p.discount_price !== undefined
        ? Number(p.discount_price)
        : undefined,
    stock: Number(p.stock ?? 0),
    lowStockThreshold: Number(p.low_stock_threshold ?? 5),
    brand: p.brand || "",
    sku: p.sku || "",
    weight: Number(p.weight ?? 500),
    dimensions: p.dimensions || { length: 0, width: 0, height: 0, unit: "cm" },
    images: Array.isArray(p.images) ? p.images : [],
    tags: Array.isArray(p.tags) ? p.tags : [],
    status: p.status || "active",
    isFeatured: Boolean(p.is_featured),
    isRestricted: Boolean(p.is_restricted),
    ageRequirement: Number(p.age_requirement ?? 0),
    shippingRestrictions: Array.isArray(p.shipping_restrictions) ? p.shipping_restrictions : [],
    ratingAverage: Number(p.rating_average ?? 5),
    reviewsCount: Number(p.reviews_count ?? 0),
    specifications: p.specifications || {},
    category: categoryDoc || p.category_id || p.category,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

