"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkles,
  Star,
  ShieldAlert,
  Layers,
  ShoppingBag,
  Zap,
  Award,
  CheckCircle2,
  PackageCheck,
  CreditCard,
  ChevronRight,
  Sword,
  Clock,
  Eye,
} from "lucide-react";
import { formatPrice } from "@/lib/format";

interface IProduct {
  _id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice?: number;
  stock: number;
  category?: { _id: string; name: string; slug: string } | string;
  brand?: string;
  sku: string;
  images: Array<{ url: string; altText?: string; isPrimary: boolean }>;
  isRestricted: boolean;
  ratingAverage?: number;
}

interface ICategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isRestricted: boolean;
}

// Fallback products so the page renders instantly even if the API is still warming up
const INITIAL_PRODUCTS: IProduct[] = [
  {
    _id: "6ab177b7dedc00e17c8abca1",
    name: "Anime Figure Collectible",
    slug: "anime-figure-collectible",
    price: 2499,
    stock: 16,
    brand: "Good Smile Company",
    sku: "AF-DEMO-2499",
    images: [{ url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800", isPrimary: true }],
    isRestricted: false,
    ratingAverage: 5,
  },
  {
    _id: "6ab17444f42811414aa7f754",
    name: "Gojo Satoru Hollow Purple 1/7 Scale Statue",
    slug: "gojo-satoru-hollow-purple-statue",
    price: 210,
    stock: 12,
    brand: "eStream Shibuya Scramble",
    sku: "JJK-GJO-HLW-005",
    images: [{ url: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800", isPrimary: true }],
    isRestricted: false,
    ratingAverage: 5,
  },
  {
    _id: "6ab17444f42811414aa7f753",
    name: "Demon Slayer Nichirin Katana Replica (Carbon Steel)",
    slug: "demon-slayer-nichirin-katana-replica",
    price: 129.99,
    stock: 8,
    brand: "Hasbro / Bandai",
    sku: "DS-KTA-NCH-004",
    images: [{ url: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800", isPrimary: true }],
    isRestricted: true,
    ratingAverage: 5,
  },
  {
    _id: "6ab17444f42811414aa7f752",
    name: "Demon Slayer Tanjiro Kamado Hinokami Kagura",
    slug: "demon-slayer-tanjiro-kamado-figure",
    price: 159.99,
    stock: 30,
    brand: "Aniplex+",
    sku: "DS-TNJ-HNK-003",
    images: [{ url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800", isPrimary: true }],
    isRestricted: false,
    ratingAverage: 5,
  },
  {
    _id: "6ab17444f42811414aa7f751",
    name: "Zoro Enma 3-Sword Style Battle Diorama",
    slug: "zoro-enma-battle-diorama",
    price: 249.99,
    stock: 14,
    brand: "MegaHouse P.O.P",
    sku: "OP-ZRO-ENM-002",
    images: [{ url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800", isPrimary: true }],
    isRestricted: false,
    ratingAverage: 5,
  },
  {
    _id: "6ab17444f42811414aa7f750",
    name: "Luffy Gear 5 Sun God Scale Figure",
    slug: "luffy-gear-5-sun-god-figure",
    price: 189.99,
    stock: 25,
    brand: "Bandai Spirits",
    sku: "OP-LFY-GR5-001",
    images: [{ url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800", isPrimary: true }],
    isRestricted: false,
    ratingAverage: 5,
  },
];

export default function HomePage() {
  const [products, setProducts] = useState<IProduct[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "figures" | "restricted">("all");

  useEffect(() => {
    // Fetch live products
    async function fetchCatalog() {
      try {
        const prodRes = await fetch("/api/products");
        const prodData = await prodRes.json();
        if (prodData?.success && prodData?.data?.products?.length > 0) {
          setProducts(prodData.data.products);
        }
      } catch (err) {
        console.error("Error fetching homepage products:", err);
      }

      try {
        const catRes = await fetch("/api/categories");
        const catData = await catRes.json();
        if (catData?.success && catData?.data?.categories?.length > 0) {
          // Filter to the core public categories
          const core = catData.data.categories.filter(
            (c: ICategory) => !c.name.toLowerCase().startsWith("test cat")
          );
          setCategories(core);
        }
      } catch (err) {
        console.error("Error fetching homepage categories:", err);
      }
    }

    fetchCatalog();
  }, []);

  const filteredProducts = products.filter((p) => {
    if (activeTab === "restricted") return p.isRestricted;
    if (activeTab === "figures") return !p.isRestricted;
    return true;
  });

  const spotlightProduct = products[0] || INITIAL_PRODUCTS[0];

  return (
    <div className="space-y-16 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-white">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-indigo-500/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:items-center">
            {/* Left Content Column */}
            <div className="space-y-6 lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 backdrop-blur-md">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span>Premier Collector Destination across India</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
                  Authentic Anime Figures &{" "}
                  <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                    Premium Collectibles
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                  Official licensed scale figures, resin statues, and ornamental katana replicas imported from Japan.
                  Protected with collector-grade packaging, direct UPI QR payments, and reliable doorstep delivery.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 hover:scale-[1.02]"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Explore Catalog
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/products?isRestricted=true"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/80 px-6 py-3.5 text-sm font-semibold text-slate-200 backdrop-blur-md transition hover:bg-slate-800 hover:border-slate-600"
                >
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  18+ Katana Replicas
                </Link>

                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 hover:text-white transition px-2 py-1"
                >
                  Admin Console <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Trust Indicators Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-slate-800/80 text-xs">
                <div>
                  <p className="font-extrabold text-base text-white">100% Genuine</p>
                  <p className="text-slate-400 text-[11px]">Official Studio Imports</p>
                </div>
                <div>
                  <p className="font-extrabold text-base text-white">Flat ₹100</p>
                  <p className="text-slate-400 text-[11px]">Fast Express Courier</p>
                </div>
                <div>
                  <p className="font-extrabold text-base text-white">Direct UPI & COD</p>
                  <p className="text-slate-400 text-[11px]">Zero Surcharge</p>
                </div>
                <div>
                  <p className="font-extrabold text-base text-white">18+ Verified</p>
                  <p className="text-slate-400 text-[11px]">Compliant Logistics</p>
                </div>
              </div>
            </div>

            {/* Right Figure Spotlight Column */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="group relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-4 shadow-2xl backdrop-blur-xl">
                {/* Figure Image */}
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-slate-800">
                  <img
                    src={spotlightProduct.images[0]?.url || "https://images.unsplash.com/photo-1563089145-599997674d42?w=800"}
                    alt={spotlightProduct.name}
                    className="h-full w-full object-cover object-center transition duration-700 group-hover:scale-105"
                  />
                  {/* Spotlight Top Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600/90 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-md backdrop-blur-md">
                      <Sparkles className="h-3 w-3" /> Featured Figure
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white shadow-md">
                      {spotlightProduct.stock > 0 ? `${spotlightProduct.stock} In Stock` : "In Stock"}
                    </span>
                  </div>

                  {/* Spotlight Card Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-slate-700/60 bg-slate-900/90 p-4 backdrop-blur-md space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-indigo-400">{spotlightProduct.brand || "Official Studio"}</span>
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <Star className="h-3.5 w-3.5 fill-amber-400" />
                        <span>5.0</span>
                      </div>
                    </div>

                    <h3 className="font-bold text-sm text-white line-clamp-1">
                      {spotlightProduct.name}
                    </h3>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-lg font-black text-white">
                          {formatPrice(spotlightProduct.price)}
                        </span>
                        <span className="ml-2 text-[10px] text-slate-400">+ ₹100 Shipping</span>
                      </div>

                      <Link
                        href={`/products/${spotlightProduct.slug || spotlightProduct._id}`}
                        className="rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-slate-200"
                      >
                        View Figure
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORIES SHOWCASE */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6" id="categories">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
              <Layers className="h-3.5 w-3.5" /> Curated Universes
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              Explore by Category
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              From articulated scale statues to ornamental replicas, find your favorite collectible series.
            </p>
          </div>

          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            View All Categories <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            {
              name: "Anime Figures",
              slug: "anime-figures",
              subtitle: "Scale 1/7, 1/8 & Nendoroids",
              icon: Sparkles,
              color: "from-blue-500 to-indigo-600",
              isRestricted: false,
            },
            {
              name: "Collectibles & Statues",
              slug: "collectibles",
              subtitle: "Resin Statues & Dioramas",
              icon: Award,
              color: "from-purple-500 to-pink-600",
              isRestricted: false,
            },
            {
              name: "Katanas & Replicas",
              slug: "katanas-replicas",
              subtitle: "18+ Display Carbon Steel",
              icon: Sword,
              color: "from-rose-500 to-amber-600",
              isRestricted: true,
            },
            {
              name: "Keychains & Chibi",
              slug: "keychains",
              subtitle: "Acrylic & Metal Charms",
              icon: Zap,
              color: "from-amber-500 to-orange-600",
              isRestricted: false,
            },
            {
              name: "Posters & Wall Art",
              slug: "posters",
              subtitle: "Metallic & Canvas Prints",
              icon: Layers,
              color: "from-emerald-500 to-teal-600",
              isRestricted: false,
            },
            {
              name: "Manga & Artbooks",
              slug: "manga",
              subtitle: "Official Volumes & Guides",
              icon: Clock,
              color: "from-indigo-600 to-purple-600",
              isRestricted: false,
            },
            {
              name: "Accessories",
              slug: "accessories",
              subtitle: "Display Cases & Risers",
              icon: PackageCheck,
              color: "from-slate-600 to-slate-800",
              isRestricted: false,
            },
            {
              name: "Other Merchandise",
              slug: "other-merchandise",
              subtitle: "Desk Mats, Plushies & Pins",
              icon: ShoppingBag,
              color: "from-fuchsia-500 to-pink-500",
              isRestricted: false,
            },
          ].map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.slug}
                href={cat.isRestricted ? "/products?isRestricted=true" : `/products?category=${cat.slug}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr ${cat.color} text-white shadow-md`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {cat.isRestricted && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black uppercase text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      18+
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{cat.subtitle}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. TRENDING & FEATURED FIGURES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6" id="trending">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
              <Sparkles className="h-3.5 w-3.5" /> High-Demand Releases
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              Trending Releases & Hot Figures
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Inspected, authenticated scale figures and limited statues ready to ship across India.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "all"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              All Figures
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("figures")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "figures"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              Scale Figures
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("restricted")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "restricted"
                  ? "bg-white text-rose-600 shadow-xs dark:bg-slate-800 dark:text-rose-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              18+ Replicas
            </button>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((p) => {
            const primaryImg =
              p.images?.find((img) => img.isPrimary)?.url ||
              p.images?.[0]?.url ||
              "https://images.unsplash.com/photo-1563089145-599997674d42?w=800";

            const discountPercent = p.discountPrice
              ? Math.round(((p.price - p.discountPrice) / p.price) * 100)
              : 0;

            return (
              <Link
                key={p._id}
                href={`/products/${p.slug || p._id}`}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Image Aspect Box */}
                <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={primaryImg}
                    alt={p.name}
                    className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
                  />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    {discountPercent > 0 && (
                      <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-md">
                        {discountPercent}% OFF
                      </span>
                    )}
                    {p.isRestricted && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-md">
                        <ShieldAlert className="h-3 w-3" /> 18+ Restricted
                      </span>
                    )}
                  </div>

                  {/* Quick View Overlay Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 bg-slate-950/40 backdrop-blur-[2px]">
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-900 shadow-lg">
                      <Eye className="h-3.5 w-3.5" /> View Figure Details
                    </span>
                  </div>
                </div>

                {/* Card Info */}
                <div className="flex flex-1 flex-col p-5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-medium">{p.brand || "Licensed Import"}</span>
                    <span className="font-mono text-[10px]">{p.sku}</span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 line-clamp-2 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {p.name}
                  </h3>

                  <div className="mt-auto pt-3 flex items-baseline justify-between border-t border-slate-100 dark:border-slate-800">
                    <div>
                      {p.discountPrice ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-black text-slate-900 dark:text-white">
                            {formatPrice(p.discountPrice)}
                          </span>
                          <span className="text-xs text-slate-400 line-through">
                            {formatPrice(p.price)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          {formatPrice(p.price)}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.stock > 10
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : p.stock > 0
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      {p.stock > 0 ? `${p.stock} In Stock` : "Sold Out"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4. PROMOTIONAL COUPON BANNER */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-950 to-slate-900 p-8 sm:p-12 text-white shadow-2xl">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold text-white">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> New Collector Discount
            </span>

            <h2 className="text-2xl sm:text-3xl font-black">
              Save 10% On Your First Collector Order
            </h2>

            <p className="text-xs sm:text-sm text-slate-300">
              Apply promotional code <span className="font-mono font-bold text-amber-300">WELCOME10</span> at checkout to receive an instant 10% discount on all figures and collectibles.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/products"
                className="rounded-2xl bg-white px-6 py-3 text-xs font-bold text-slate-950 transition hover:bg-slate-100 shadow-md"
              >
                Shop Collectibles Now
              </Link>

              <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-mono font-bold">
                <span>Code:</span>
                <span className="text-amber-300 select-all">WELCOME10</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 18+ RESTRICTED MERCHANDISE COMPLIANCE BANNER */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-6 sm:p-8 dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md">
                <Sword className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    18+ Katana & Blade Compliance Standards
                  </h3>
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                    Legal Notice
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                  All ornamental katanas and metallic weapons sold on FiguresWorld are strictly for adult collector display and cosplaying purposes only (dull unsharpened safety edges). Purchases require 18+ age verification, destination jurisdiction eligibility, and pre-dispatch compliance audit.
                </p>
              </div>
            </div>

            <Link
              href="/products?isRestricted=true"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-rose-700 shadow-xs"
            >
              Browse 18+ Collection <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. TRUST & GUARANTEE PILLARS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">100% Genuine Imports</h4>
              <p className="text-[11px] text-slate-500 mt-1">Direct from licensed studios. Authentic manufacturer barcodes.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">Collector Box Protection</h4>
              <p className="text-[11px] text-slate-500 mt-1">Triple-layer bubble wrap & reinforced corner protectors.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">Express Indian Dispatch</h4>
              <p className="text-[11px] text-slate-500 mt-1">Blue Dart & Delhivery with automated WhatsApp tracking updates.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">Zero-Fee Direct Pay</h4>
              <p className="text-[11px] text-slate-500 mt-1">Direct UPI QR confirmation & verified Cash on Delivery (COD).</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
