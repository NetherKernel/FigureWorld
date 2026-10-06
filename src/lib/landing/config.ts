/**
 * Landing page ("/") layout config — what sections appear on the homepage, in what order,
 * for whom, and with what content. Edited in the Developer Console (/developer/customize).
 *
 * Client-safe: shared by the storefront renderer, the admin editor and the API (validation).
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Presets (fixed lists so every class name / icon exists at build time) */

export const AUDIENCES = {
  all: "Everyone",
  guests: "Signed-out visitors",
  members: "Signed-in customers",
} as const;
export type Audience = keyof typeof AUDIENCES;

export const HERO_TINTS = {
  dark: { label: "Dark", className: "from-black/80 via-black/40" },
  deep: { label: "Extra dark", className: "from-black/85 via-black/45" },
  crimson: { label: "Crimson", className: "from-[#3a0406]/90 via-[#3a0406]/45" },
  soft: { label: "Light scrim", className: "from-black/45 via-black/15" },
} as const;
export type HeroTint = keyof typeof HERO_TINTS;

export const ICON_NAMES = [
  "shield-check",
  "package-check",
  "truck",
  "credit-card",
  "rotate-ccw",
  "gift",
  "star",
  "sparkles",
  "headphones",
  "badge-percent",
  "clock",
  "heart",
] as const;
export type IconName = (typeof ICON_NAMES)[number];

export const PRODUCT_SOURCES = {
  figures: "Anime figures (non-restricted)",
  newest: "Newest arrivals",
  topRated: "Top rated",
  onSale: "On sale",
  featured: "Featured products",
  restricted: "18+ katanas & replicas",
  category: "A specific category",
} as const;
export type ProductSource = keyof typeof PRODUCT_SOURCES;

export const ANNOUNCEMENT_TONES = {
  brand: "Brand red",
  neutral: "Neutral",
  success: "Green",
} as const;
export type AnnouncementTone = keyof typeof ANNOUNCEMENT_TONES;

export const BANNER_LAYOUTS = {
  imageRight: "Image on the right",
  imageLeft: "Image on the left",
  background: "Full background image",
} as const;
export type BannerLayout = keyof typeof BANNER_LAYOUTS;

/* ------------------------------------------------------------------ */
/* Validation */

// Links: on-site paths ("/products?...", not protocol-relative "//") or http(s) URLs — never javascript:/data:
const SAFE_URL = /^(\/(?!\/)[^\s]*|https?:\/\/[^\s]+)$/i;
const link = z.string().trim().max(500).regex(SAFE_URL, "Use a site path like /products or a full https:// link");
const image = z.string().trim().max(1000).regex(SAFE_URL, "Use an uploaded image or a full https:// image URL");
const text = (max: number) => z.string().trim().max(max);
const id = z.string().min(1).max(40).regex(/^[a-zA-Z0-9_-]+$/);

const base = {
  id,
  enabled: z.boolean(),
  audience: z.enum(Object.keys(AUDIENCES) as [Audience, ...Audience[]]),
  /** Admin-only nickname shown in the editor's section list */
  label: text(60).optional(),
};

const heroSlide = z.object({
  id,
  tag: text(40),
  title: text(90).min(1, "Slide title is required"),
  subtitle: text(200),
  cta: text(30).min(1, "Button text is required"),
  href: link,
  image,
  tint: z.enum(Object.keys(HERO_TINTS) as [HeroTint, ...HeroTint[]]),
});

const tile = z.object({ id, label: text(40).min(1), image, href: link });
const iconName = z.enum(ICON_NAMES);

const card = z.discriminatedUnion("kind", [
  z.object({
    id,
    kind: z.literal("tiles"),
    title: text(60).min(1),
    badge: text(12).optional(),
    linkLabel: text(40),
    href: link,
    tiles: z.array(tile).min(1).max(4),
  }),
  z.object({ id, kind: z.literal("image"), title: text(60).min(1), image, linkLabel: text(40), href: link }),
  z.object({ id, kind: z.literal("dealOfDay"), title: text(60).min(1), linkLabel: text(40), href: link }),
  z.object({
    id,
    kind: z.literal("budgetPicks"),
    title: text(60).min(1),
    maxPrice: z.number().int().min(1).max(10_000_000),
    linkLabel: text(40),
    href: link,
  }),
  z.object({
    id,
    kind: z.literal("account"),
    offerLabel: text(40),
    offerTitle: text(60),
    offerCode: text(24),
  }),
]);

const section = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("hero"), slides: z.array(heroSlide).min(1, "Add at least one slide").max(8) }),
  z.object({
    ...base,
    type: z.literal("announcement"),
    text: text(160).min(1),
    linkLabel: text(40),
    href: link.or(z.literal("")),
    tone: z.enum(Object.keys(ANNOUNCEMENT_TONES) as [AnnouncementTone, ...AnnouncementTone[]]),
  }),
  z.object({ ...base, type: z.literal("cardRow"), cards: z.array(card).min(1).max(4) }),
  z.object({
    ...base,
    type: z.literal("dealsShelf"),
    title: text(60).min(1),
    seeAllLabel: text(40),
    seeAllHref: link,
    showCountdown: z.boolean(),
  }),
  z.object({
    ...base,
    type: z.literal("productShelf"),
    title: text(60).min(1),
    source: z.enum(Object.keys(PRODUCT_SOURCES) as [ProductSource, ...ProductSource[]]),
    categorySlug: text(80).optional(),
    maxItems: z.number().int().min(2).max(30),
    badge: text(20).optional(),
    seeAllLabel: text(40),
    seeAllHref: link,
    introTitle: text(60).optional(),
    introText: text(300).optional(),
  }),
  z.object({
    ...base,
    type: z.literal("spotlight"),
    /** Empty = automatically feature the biggest current discount */
    productSlug: text(160).optional(),
    badge: text(30),
  }),
  z.object({
    ...base,
    type: z.literal("promoBanner"),
    eyebrow: text(40),
    title: text(90).min(1),
    text: text(300),
    ctaLabel: text(30),
    href: link,
    image,
    layout: z.enum(Object.keys(BANNER_LAYOUTS) as [BannerLayout, ...BannerLayout[]]),
  }),
  z.object({
    ...base,
    type: z.literal("guarantees"),
    items: z.array(z.object({ id, icon: iconName, title: text(60).min(1), text: text(200) })).min(1).max(8),
  }),
  z.object({
    ...base,
    type: z.literal("storeInfo"),
    title: text(60),
    text: text(600),
    columns: z.array(z.object({ id, icon: iconName, title: text(60).min(1), text: text(300) })).max(3),
  }),
  z.object({ ...base, type: z.literal("signInNudge"), text: text(120), buttonLabel: text(30).min(1) }),
]);

export const landingConfigSchema = z.object({
  version: z.literal(1),
  sections: z.array(section).max(40, "A page can have at most 40 sections"),
});

export type LandingConfig = z.infer<typeof landingConfigSchema>;
export type LandingSection = LandingConfig["sections"][number];
export type SectionType = LandingSection["type"];
export type SectionOf<T extends SectionType> = Extract<LandingSection, { type: T }>;
export type HeroSlideConfig = SectionOf<"hero">["slides"][number];
export type CardConfig = SectionOf<"cardRow">["cards"][number];
export type CardKind = CardConfig["kind"];
export type CardOf<K extends CardKind> = Extract<CardConfig, { kind: K }>;

/** Validates untrusted (stored or submitted) config; falls back to the default layout if it no longer fits the schema. */
export function normalizeLandingConfig(input: unknown): LandingConfig {
  const parsed = landingConfigSchema.safeParse(input);
  return parsed.success ? parsed.data : DEFAULT_LANDING_CONFIG;
}

export function newId(prefix = "s"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ------------------------------------------------------------------ */
/* Defaults (mirror the original hand-built homepage) */

const IMG = {
  figures: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600",
  statues: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600",
  chibi: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600",
  posters: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=600",
};

export const DEFAULT_LANDING_CONFIG: LandingConfig = {
  version: 1,
  sections: [
    {
      id: "hero",
      type: "hero",
      enabled: true,
      audience: "all",
      slides: [
        {
          id: "slide-sale",
          tag: "Featured Collection",
          title: "FS-111WT Oni Katana Sword",
          subtitle: "Signature 39-inch carbon steel blade with traditional Oni demon mask guard and collector display scabbard.",
          cta: "Shop the katana",
          href: "/products/fs-111wt-oni-katana-sword",
          image: "/images/katanas/oni-katana-fs111wt.jpg",
          tint: "dark",
        },
        {
          id: "slide-new",
          tag: "New arrivals",
          title: "Nidai Kitetsu & Bleach Replicas",
          subtitle: "Luffy's Wano cursed blade and Kenpachi Zaraki's Nozarashi, delivered across India.",
          cta: "See collection",
          href: "/products?category=katanas-replicas",
          image: "/images/katanas/nidai-kitetsu-katana.jpg",
          tint: "crimson",
        },
        {
          id: "slide-katanas",
          tag: "18+ ornamental replicas",
          title: "Hand-finished anime katanas",
          subtitle: "Unsharpened display blades with authentic fittings. ₹180 delivery across India.",
          cta: "Explore replicas",
          href: "/products?category=katanas-replicas",
          image: "/images/katanas/kenpachi-zaraki-zanpakuto.jpg",
          tint: "deep",
        },
      ],
    },
    {
      id: "cards-top",
      type: "cardRow",
      enabled: true,
      audience: "all",
      label: "Top cards",
      cards: [
        {
          id: "card-categories",
          kind: "tiles",
          title: "Shop by category",
          linkLabel: "See all departments",
          href: "/products",
          tiles: [
            { id: "t1", label: "Scale figures", image: IMG.figures, href: "/products?category=anime-figures" },
            { id: "t2", label: "Resin statues", image: IMG.statues, href: "/products?category=collectibles" },
            { id: "t3", label: "Chibi & keychains", image: IMG.chibi, href: "/products?category=keychains" },
            { id: "t4", label: "Posters & scrolls", image: IMG.posters, href: "/products?category=posters" },
          ],
        },
        { id: "card-deal", kind: "dealOfDay", title: "Deal of the day", linkLabel: "See all deals", href: "/products?onSale=true" },
        {
          id: "card-katanas",
          kind: "tiles",
          title: "Katanas & replicas",
          badge: "18+",
          linkLabel: "Explore replicas",
          href: "/products?category=katanas-replicas",
          tiles: [
            { id: "t5", label: "Oni Katana FS-111WT", image: "/images/katanas/oni-katana-fs111wt.jpg", href: "/products/fs-111wt-oni-katana-sword" },
            { id: "t6", label: "Nidai Kitetsu", image: "/images/katanas/nidai-kitetsu-katana.jpg", href: "/products/nidai-kitetsu-katana-replica" },
            { id: "t7", label: "Zaraki Nozarashi", image: "/images/katanas/kenpachi-zaraki-zanpakuto.jpg", href: "/products/kenpachi-zaraki-zanpakuto-nozarashi" },
            { id: "t8", label: "Nichirin blade", image: "/images/katanas/tanjiro-nichirin-katana.jpg", href: "/products/demon-slayer-nichirin-katana-replica" },
          ],
        },
        { id: "card-account", kind: "account", offerLabel: "First order offer", offerTitle: "10% off with code", offerCode: "WELCOME10" },
      ],
    },
    {
      id: "deals",
      type: "dealsShelf",
      enabled: true,
      audience: "all",
      title: "Today's Deals",
      seeAllLabel: "See all deals",
      seeAllHref: "/products?onSale=true",
      showCountdown: true,
    },
    {
      id: "cards-second",
      type: "cardRow",
      enabled: true,
      audience: "all",
      label: "Second card row",
      cards: [
        {
          id: "card-budget",
          kind: "budgetPicks",
          title: "Under ₹2,000 picks",
          maxPrice: 2000,
          linkLabel: "Shop budget picks",
          href: "/products?maxPrice=2000&sort=price-asc",
        },
        { id: "card-new", kind: "image", title: "New arrivals are here", image: IMG.posters, linkLabel: "Shop new arrivals", href: "/products?sort=newest" },
        { id: "card-top", kind: "image", title: "Top-rated by collectors", image: IMG.statues, linkLabel: "See best sellers", href: "/products?sort=rating" },
        {
          id: "card-display",
          kind: "tiles",
          title: "Complete your display",
          linkLabel: "Shop accessories",
          href: "/products?category=accessories",
          tiles: [
            { id: "t9", label: "Display cases", image: IMG.figures, href: "/products?category=accessories" },
            { id: "t10", label: "Manga & artbooks", image: IMG.posters, href: "/products?category=manga" },
            { id: "t11", label: "Keychains", image: IMG.chibi, href: "/products?category=keychains" },
            { id: "t12", label: "Wall art", image: IMG.statues, href: "/products?category=posters" },
          ],
        },
      ],
    },
    {
      id: "best-sellers",
      type: "productShelf",
      enabled: true,
      audience: "all",
      title: "Best Sellers in Anime Figures",
      source: "figures",
      maxItems: 20,
      seeAllLabel: "Shop figures",
      seeAllHref: "/products?category=anime-figures",
    },
    { id: "spotlight", type: "spotlight", enabled: true, audience: "all", productSlug: "", badge: "Lightning deal" },
    {
      id: "katanas",
      type: "productShelf",
      enabled: true,
      audience: "all",
      title: "Katanas & Ornamental Replicas",
      source: "restricted",
      maxItems: 20,
      badge: "18+ only",
      seeAllLabel: "See all",
      seeAllHref: "/products?category=katanas-replicas",
      introTitle: "Display replicas, sold responsibly",
      introText:
        "Every blade is unsharpened and for display only. Buyers confirm they are 18+ and delivery is checked against local regulations before dispatch.",
    },
    {
      id: "guarantees",
      type: "guarantees",
      enabled: true,
      audience: "all",
      items: [
        { id: "g1", icon: "shield-check", title: "100% genuine imports", text: "Licensed collectibles sourced directly from Japanese studios and authorised distributors." },
        { id: "g2", icon: "package-check", title: "Collector-safe packing", text: "Boxes are double-packed with corner protectors so they arrive shelf-ready." },
        { id: "g3", icon: "truck", title: "Tracked delivery", text: "Shipped with Blue Dart & Delhivery. Updates on WhatsApp and email." },
        { id: "g4", icon: "credit-card", title: "UPI & Cash on Delivery", text: "Pay by any UPI app or in cash at your door — no gateway surcharges." },
      ],
    },
    {
      id: "store-info",
      type: "storeInfo",
      enabled: true,
      audience: "all",
      title: "About Figure World",
      text: "We're a team of collectors bringing officially licensed anime figures, statues and replicas to fans across India — with honest prices, careful packing and real support.",
      columns: [
        {
          id: "c1",
          icon: "truck",
          title: "Shipping & delivery",
          text: "Two-tier weight delivery: ₹180 for light orders (katanas, keychains, small figures) and ₹299 for large orders (statues, dioramas). Fast tracked delivery across India.",
        },
        {
          id: "c2",
          icon: "rotate-ccw",
          title: "Damage protection",
          text: "If your collectible arrives damaged, share an unboxing video within 48 hours and we'll replace it free.",
        },
      ],
    },
    {
      id: "sign-in",
      type: "signInNudge",
      enabled: true,
      audience: "guests",
      text: "See personalized recommendations",
      buttonLabel: "Sign in",
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Section library — what admins can place, with sensible starting content */

export const SECTION_META: Record<SectionType, { name: string; description: string }> = {
  hero: { name: "Hero carousel", description: "Large rotating promo slides with a button." },
  announcement: { name: "Announcement bar", description: "One-line message, e.g. a sale or shipping notice." },
  cardRow: { name: "Card row", description: "Up to 4 cards: category tiles, images, deal of the day, budget picks, account." },
  dealsShelf: { name: "Deals shelf", description: "Scrolling row of discounted products with a countdown." },
  productShelf: { name: "Product shelf", description: "Scrolling row of products from a source you choose." },
  spotlight: { name: "Product spotlight", description: "One product featured large, picked by you or automatically." },
  promoBanner: { name: "Promo banner", description: "Image + headline + button, for campaigns and collections." },
  guarantees: { name: "Trust badges", description: "Icon tiles for guarantees like genuine imports or COD." },
  storeInfo: { name: "Store info", description: "About text plus shipping / returns columns." },
  signInNudge: { name: "Sign-in prompt", description: "Asks signed-out visitors to sign in." },
};

export const CARD_META: Record<CardKind, string> = {
  tiles: "4 image tiles",
  image: "Single image",
  dealOfDay: "Deal of the day",
  budgetPicks: "Budget picks",
  account: "Account / sign-in",
};

export function createSection(type: SectionType): LandingSection {
  const common = { id: newId(type), enabled: true, audience: "all" as Audience };
  switch (type) {
    case "hero":
      return { ...common, type, slides: [createSlide()] };
    case "announcement":
      return { ...common, type, text: "Free gift wrapping on all orders this week", linkLabel: "Shop now", href: "/products", tone: "brand" };
    case "cardRow":
      return { ...common, type, cards: [createCard("tiles"), createCard("image"), createCard("dealOfDay"), createCard("budgetPicks")] };
    case "dealsShelf":
      return { ...common, type, title: "Today's Deals", seeAllLabel: "See all deals", seeAllHref: "/products?onSale=true", showCountdown: true };
    case "productShelf":
      return { ...common, type, title: "New arrivals", source: "newest", maxItems: 12, seeAllLabel: "See all", seeAllHref: "/products?sort=newest" };
    case "spotlight":
      return { ...common, type, productSlug: "", badge: "Featured" };
    case "promoBanner":
      return {
        ...common,
        type,
        eyebrow: "Limited collection",
        title: "Your headline here",
        text: "A short line about the campaign or collection.",
        ctaLabel: "Shop now",
        href: "/products",
        image: IMG.statues,
        layout: "imageRight",
      };
    case "guarantees":
      return { ...common, type, items: (DEFAULT_LANDING_CONFIG.sections.find((s) => s.type === "guarantees") as SectionOf<"guarantees">).items.map((i) => ({ ...i, id: newId("g") })) };
    case "storeInfo":
      return { ...common, type, title: "About us", text: "Tell visitors who you are.", columns: [] };
    case "signInNudge":
      return { ...common, type, audience: "guests", text: "See personalized recommendations", buttonLabel: "Sign in" };
  }
}

export function createSlide(): HeroSlideConfig {
  return {
    id: newId("slide"),
    tag: "New",
    title: "New slide headline",
    subtitle: "Supporting text for this slide.",
    cta: "Shop now",
    href: "/products",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1800",
    tint: "dark",
  };
}

export function createCard(kind: CardKind): CardConfig {
  const id = newId("card");
  switch (kind) {
    case "tiles":
      return {
        id,
        kind,
        title: "Shop by category",
        linkLabel: "See more",
        href: "/products",
        tiles: [IMG.figures, IMG.statues, IMG.chibi, IMG.posters].map((image, i) => ({ id: newId("t"), label: `Tile ${i + 1}`, image, href: "/products" })),
      };
    case "image":
      return { id, kind, title: "New arrivals are here", image: IMG.posters, linkLabel: "Shop now", href: "/products?sort=newest" };
    case "dealOfDay":
      return { id, kind, title: "Deal of the day", linkLabel: "See all deals", href: "/products?onSale=true" };
    case "budgetPicks":
      return { id, kind, title: "Under ₹2,000 picks", maxPrice: 2000, linkLabel: "Shop budget picks", href: "/products?maxPrice=2000&sort=price-asc" };
    case "account":
      return { id, kind, offerLabel: "First order offer", offerTitle: "10% off with code", offerCode: "WELCOME10" };
  }
}

/** Deep copy with fresh ids, for "Duplicate section". */
export function cloneWithNewIds<T>(value: T): T {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) out[k] = k === "id" && typeof val === "string" ? newId(val.split("-")[0] || "s") : walk(val);
      return out;
    }
    return v;
  };
  return walk(value) as T;
}
