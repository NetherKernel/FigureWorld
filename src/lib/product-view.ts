/**
 * Client-safe product shape and display helpers shared by storefront pages.
 * (The Mongoose model in src/models/Product.ts is server-only.)
 */

export interface StoreProduct {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  discountPrice?: number | null;
  stock: number;
  category?: { _id: string; name: string; slug: string; isRestricted?: boolean } | string;
  brand?: string;
  series?: string;
  sku: string;
  images: Array<{ url: string; altText?: string; isPrimary: boolean }>;
  status?: string;
  isFeatured?: boolean;
  isRestricted: boolean;
  ageRequirement?: number;
  shippingRestrictions?: string[];
  ratingAverage?: number;
  reviewsCount?: number;
  weight?: number;
  dimensions?: { length: number; width: number; height: number; unit: string };
  specifications?: {
    scale?: string;
    material?: string;
    heightCm?: number;
    manufacturer?: string;
    originCountry?: string;
    releaseYear?: number;
  };
  tags?: string[];
  createdAt?: string;
}

export const FALLBACK_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800";

export function primaryImage(p: Pick<StoreProduct, "images">): string {
  return p.images?.find((img) => img.isPrimary)?.url || p.images?.[0]?.url || FALLBACK_PRODUCT_IMAGE;
}

export function hasDiscount(p: Pick<StoreProduct, "price" | "discountPrice">): boolean {
  return typeof p.discountPrice === "number" && p.discountPrice > 0 && p.discountPrice < p.price;
}

export function effectivePrice(p: Pick<StoreProduct, "price" | "discountPrice">): number {
  return hasDiscount(p) ? (p.discountPrice as number) : p.price;
}

export function discountPercent(p: Pick<StoreProduct, "price" | "discountPrice">): number {
  if (!hasDiscount(p)) return 0;
  return Math.round(((p.price - (p.discountPrice as number)) / p.price) * 100);
}

export function productHref(p: Pick<StoreProduct, "slug" | "_id">): string {
  return `/products/${p.slug || p._id}`;
}

/** Amazon-style delivery estimate, e.g. "Thu, 8 Oct" */
export function deliveryDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** Category options used by search, navigation and filters. */
export const STORE_CATEGORIES = [
  { label: "Anime Figures", slug: "anime-figures" },
  { label: "Collectibles & Statues", slug: "collectibles" },
  { label: "Katanas & Replicas", slug: "katanas-replicas", restricted: true },
  { label: "Keychains", slug: "keychains" },
  { label: "Posters & Wall Art", slug: "posters" },
  { label: "Manga & Artbooks", slug: "manga" },
  { label: "Accessories", slug: "accessories" },
  { label: "Other Merchandise", slug: "other-merchandise" },
] as const;
