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

export interface StoreCategoryItem {
  label: string;
  slug: string;
  restricted?: boolean;
  subcategories?: Array<{ label: string; slug: string; restricted?: boolean }>;
}

/** Category options used by search, navigation and filters. */
export const STORE_CATEGORIES: StoreCategoryItem[] = [
  {
    label: "Action Figures",
    slug: "action-figures",
    subcategories: [
      { label: "Dragon Ball", slug: "dragon-ball" },
      { label: "Jujutsu Kaisen", slug: "jujutsu-kaisen" },
      { label: "Marvel", slug: "marvel" },
      { label: "DC", slug: "dc-comics" },
      { label: "One Piece", slug: "one-piece" },
      { label: "Naruto", slug: "naruto" },
      { label: "Demon Slayer", slug: "demon-slayer" },
      { label: "Attack on Titan", slug: "attack-on-titan" },
      { label: "Bleach", slug: "bleach" },
      { label: "Chainsaw Man", slug: "chainsaw-man" },
      { label: "My Hero Academia", slug: "my-hero-academia" },
      { label: "Pokemon", slug: "pokemon" },
      { label: "Star Wars", slug: "star-wars" },
      { label: "Solo Leveling", slug: "solo-leveling" },
      { label: "Berserk", slug: "berserk" },
      { label: "JoJo's Bizarre Adventure", slug: "jojo" },
      { label: "Genshin Impact", slug: "genshin-impact" },
    ],
  },
  {
    label: "Collectibles & Statues",
    slug: "collectibles",
    subcategories: [
      { label: "Resin Statues", slug: "resin-statues" },
      { label: "Scale Figures", slug: "scale-figures" },
      { label: "Dioramas & Busts", slug: "dioramas-busts" },
      { label: "Limited Editions", slug: "limited-editions" },
    ],
  },
  {
    label: "Katanas & Replicas",
    slug: "katanas-replicas",
    restricted: true,
    subcategories: [
      { label: "Nichirin Blades", slug: "nichirin-blades", restricted: true },
      { label: "Samurai Katanas", slug: "samurai-swords", restricted: true },
      { label: "Cosplay & Foam Swords", slug: "cosplay-swords" },
    ],
  },
  {
    label: "Posters & Wall Art",
    slug: "posters",
    subcategories: [
      { label: "Framed Canvas Art", slug: "framed-canvas" },
      { label: "Metal Displates", slug: "metal-displates" },
      { label: "Wall Scrolls", slug: "wall-scrolls" },
    ],
  },
  {
    label: "Manga & Artbooks",
    slug: "manga",
    subcategories: [
      { label: "Shonen Manga", slug: "shonen-manga" },
      { label: "Seinen Manga", slug: "seinen-manga" },
      { label: "Artbooks & Guidebooks", slug: "artbooks" },
    ],
  },
  {
    label: "Accessories & Keychains",
    slug: "accessories",
    subcategories: [
      { label: "Acrylic Keychains", slug: "acrylic-keychains" },
      { label: "Metal Weapon Props", slug: "metal-weapons" },
      { label: "Enamel Pins", slug: "enamel-pins" },
    ],
  },
  {
    label: "Other Merchandise",
    slug: "other-merchandise",
    subcategories: [
      { label: "Anime Apparel & Hoodies", slug: "anime-apparel" },
      { label: "LED Night Lamps", slug: "led-lamps" },
      { label: "Desk Mats & Mousepads", slug: "desk-mats" },
    ],
  },
];

