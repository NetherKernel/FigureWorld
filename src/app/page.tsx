"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  ShieldAlert,
  Sparkles,
  ShoppingBag,
  Flame,
  Clock,
  Check,
  ShieldCheck,
  Truck,
  CreditCard,
  PackageCheck,
  Sword,
  Eye,
  Award,
  Layers,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

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
  reviewsCount?: number;
}

// Fallback high-definition anime figure data to ensure instantaneous rendering
const DEFAULT_PRODUCTS: IProduct[] = [
  {
    _id: "6ab177b7dedc00e17c8abca1",
    name: "Anime Figure Collectible",
    slug: "anime-figure-collectible",
    price: 2499,
    discountPrice: 1999,
    stock: 16,
    brand: "Good Smile Company",
    sku: "AF-DEMO-2499",
    images: [{ url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800", isPrimary: true }],
    isRestricted: false,
    ratingAverage: 5,
    reviewsCount: 48,
  },
  {
    _id: "6ab17444f42811414aa7f754",
    name: "Gojo Satoru Hollow Purple 1/7 Scale Statue",
    slug: "gojo-satoru-hollow-purple-statue",
    price: 210,
    discountPrice: 185,
    stock: 12,
    brand: "eStream Shibuya Scramble",
    sku: "JJK-GJO-HLW-005",
    images: [{ url: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800", isPrimary: true }],
    isRestricted: false,
    ratingAverage: 5,
    reviewsCount: 126,
  },
  {
    _id: "6ab17444f42811414aa7f753",
    name: "Demon Slayer Nichirin Katana Replica (Carbon Steel)",
    slug: "demon-slayer-nichirin-katana-replica",
    price: 129.99,
    discountPrice: 109.99,
    stock: 8,
    brand: "Hasbro / Bandai",
    sku: "DS-KTA-NCH-004",
    images: [{ url: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800", isPrimary: true }],
    isRestricted: true,
    ratingAverage: 5,
    reviewsCount: 89,
  },
  {
    _id: "6ab17444f42811414aa7f752",
    name: "Demon Slayer Tanjiro Kamado Hinokami Kagura",
    slug: "demon-slayer-tanjiro-kamado-figure",
    price: 159.99,
    discountPrice: 139.99,
    stock: 30,
    brand: "Aniplex+",
    sku: "DS-TNJ-HNK-003",
    images: [{ url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800", isPrimary: true }],
    isRestricted: false,
    ratingAverage: 5,
    reviewsCount: 64,
  },
  {
    _id: "6ab17444f42811414aa7f751",
    name: "Zoro Enma 3-Sword Style Battle Diorama",
    slug: "zoro-enma-battle-diorama",
    price: 249.99,
    discountPrice: 219.99,
    stock: 14,
    brand: "MegaHouse P.O.P",
    sku: "OP-ZRO-ENM-002",
    images: [{ url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800", isPrimary: true }],
    isRestricted: false,
    ratingAverage: 5,
    reviewsCount: 112,
  },
  {
    _id: "6ab17444f42811414aa7f750",
    name: "Luffy Gear 5 Sun God Scale Figure",
    slug: "luffy-gear-5-sun-god-figure",
    price: 189.99,
    discountPrice: 169.99,
    stock: 25,
    brand: "Bandai Spirits",
    sku: "OP-LFY-GR5-001",
    images: [{ url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800", isPrimary: true }],
    isRestricted: false,
    ratingAverage: 5,
    reviewsCount: 230,
  },
];

// Amazon-style Hero Banners
const HERO_SLIDES = [
  {
    id: 1,
    tag: "COLLECTOR FESTIVAL 2026",
    title: "Up to 30% Off Scale Figures",
    subtitle: "Authentic imported masterpieces from Good Smile, MegaHouse, and Bandai Spirits.",
    ctaText: "Shop the Deals",
    ctaLink: "/products",
    bgGradient: "from-red-950 via-slate-900 to-black",
    highlightColor: "text-red-500",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600",
  },
  {
    id: 2,
    tag: "18+ ORNAMENTAL REPLICAS",
    title: "Hand-Crafted Anime Katanas",
    subtitle: "Carbon steel display swords with authentic fittings. Zero-trust age verification & legal delivery.",
    ctaText: "Explore Blades",
    ctaLink: "/products?isRestricted=true",
    bgGradient: "from-slate-950 via-red-950 to-black",
    highlightColor: "text-red-400",
    image: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=1600",
  },
  {
    id: 3,
    tag: "POPULAR SHONEN EXCLUSIVES",
    title: "Gojo Satoru & Luffy Gear 5",
    subtitle: "Limited-edition resin statues and dynamic battle dioramas. Express courier across India.",
    ctaText: "View Featured Figures",
    ctaLink: "/products",
    bgGradient: "from-zinc-950 via-purple-950 to-slate-950",
    highlightColor: "text-purple-400",
    image: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=1600",
  },
];

export default function HomePage() {
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [products, setProducts] = useState<IProduct[]>(DEFAULT_PRODUCTS);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [addedItemMap, setAddedItemMap] = useState<Record<string, boolean>>({});

  // Countdown timer for Amazon lightning deal
  const [timeLeft, setTimeLeft] = useState({ hours: 7, minutes: 24, seconds: 18 });

  // Refs for horizontal scrolling carousels
  const dealsRowRef = useRef<HTMLDivElement>(null);
  const statuesRowRef = useRef<HTMLDivElement>(null);
  const katanasRowRef = useRef<HTMLDivElement>(null);

  // Fetch live products
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/products");
        const json = await res.json();
        if (json?.success && json?.data?.products?.length > 0) {
          setProducts(json.data.products);
        }
      } catch (err) {
        console.error("Error fetching live products:", err);
      }
    }
    loadData();
  }, []);

  // Ticking countdown timer for Lightning Deal
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 8, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Hero auto-advance every 6 seconds
  useEffect(() => {
    const sliderInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(sliderInterval);
  }, []);

  const handleAddToCart = async (product: IProduct, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(product, 1);
    setAddedItemMap((prev) => ({ ...prev, [product._id]: true }));
    setTimeout(() => {
      setAddedItemMap((prev) => ({ ...prev, [product._id]: false }));
    }, 1800);
  };

  const scrollShelf = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (ref.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      ref.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const standardFigures = products.filter((p) => !p.isRestricted);
  const restrictedKatanas = products.filter((p) => p.isRestricted);
  const featuredDealProduct = products[0] || DEFAULT_PRODUCTS[0];

  return (
    <div className="w-full bg-[#E3E6E6] dark:bg-[#0F1111] transition-colors duration-300 pb-16">
      {/* 1. AMAZON-STYLE FULL-WIDTH HERO SLIDER */}
      <section className="relative w-full h-[380px] sm:h-[460px] md:h-[540px] lg:h-[600px] overflow-hidden select-none">
        {HERO_SLIDES.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              idx === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            {/* Background Image with Dark Vignette */}
            <div className="absolute inset-0 bg-black">
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover object-center opacity-60 filter brightness-90 contrast-105"
              />
            </div>

            {/* Gradient Overlay for Amazon Visual Language */}
            <div className={`absolute inset-0 bg-gradient-to-r ${slide.bgGradient} opacity-75`} />

            {/* Fade-out Gradient into the Bottom Category Cards */}
            <div className="absolute inset-x-0 bottom-0 h-48 sm:h-64 bg-gradient-to-t from-[#E3E6E6] via-[#E3E6E6]/80 to-transparent dark:from-[#0F1111] dark:via-[#0F1111]/80 dark:to-transparent" />

            {/* Slide Text Content */}
            <div className="relative z-20 mx-auto max-w-7xl h-full px-6 sm:px-12 flex flex-col justify-start pt-12 sm:pt-16 lg:pt-20">
              <div className="max-w-xl space-y-3 sm:space-y-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/90 px-3 py-1 text-xs font-black tracking-widest text-white uppercase shadow-md">
                  <Flame className="h-3.5 w-3.5 fill-white" /> {slide.tag}
                </span>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none drop-shadow-md">
                  {slide.title}
                </h1>

                <p className="text-xs sm:text-sm md:text-base text-slate-200 leading-relaxed drop-shadow-sm font-medium">
                  {slide.subtitle}
                </p>

                <div className="pt-2">
                  <Link
                    href={slide.ctaLink}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 text-xs sm:text-sm shadow-xl transition-transform hover:scale-105 active:scale-95"
                  >
                    <span>{slide.ctaText}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Slider Controls: Left & Right Chevrons */}
        <button
          type="button"
          onClick={() => setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1))}
          className="absolute left-2 sm:left-4 top-1/3 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-md bg-black/30 hover:bg-black/60 text-white transition hover:scale-110 cursor-pointer focus:outline-none"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
        </button>

        <button
          type="button"
          onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
          className="absolute right-2 sm:right-4 top-1/3 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-md bg-black/30 hover:bg-black/60 text-white transition hover:scale-110 cursor-pointer focus:outline-none"
          aria-label="Next Slide"
        >
          <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
        </button>

        {/* Slide Indicator Dots */}
        <div className="absolute bottom-44 sm:bottom-56 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
          {HERO_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentSlide ? "w-6 bg-red-600" : "w-2 bg-white/60 hover:bg-white"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* 2. THE SIGNATURE AMAZON OVERLAPPING 4-CARD CATEGORY GRID */}
      <section className="relative z-30 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-36 sm:-mt-44 md:-mt-52 lg:-mt-60">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Explore Top Anime Categories (4-Grid) */}
          <div className="bg-white dark:bg-[#1A1F26] p-4 sm:p-5 rounded-none shadow-md flex flex-col justify-between border border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white mb-3">
                Top Anime Collectibles
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/products?category=anime-figures" className="group">
                  <div className="aspect-square w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800 mb-1">
                    <img
                      src="https://images.unsplash.com/photo-1563089145-599997674d42?w=400"
                      alt="Scale Figures"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-red-600 line-clamp-1">
                    Scale Figures
                  </span>
                </Link>

                <Link href="/products?category=collectibles" className="group">
                  <div className="aspect-square w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800 mb-1">
                    <img
                      src="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400"
                      alt="Resin Statues"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-red-600 line-clamp-1">
                    Resin Statues
                  </span>
                </Link>

                <Link href="/products?category=keychains" className="group">
                  <div className="aspect-square w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800 mb-1">
                    <img
                      src="https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400"
                      alt="Nendoroids & Chibi"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-red-600 line-clamp-1">
                    Chibi & Keychains
                  </span>
                </Link>

                <Link href="/products?category=posters" className="group">
                  <div className="aspect-square w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800 mb-1">
                    <img
                      src="https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=400"
                      alt="Posters & Scrolls"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-red-600 line-clamp-1">
                    Wall Scrolls
                  </span>
                </Link>
              </div>
            </div>

            <Link
              href="/products"
              className="mt-4 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 hover:underline inline-flex items-center gap-1"
            >
              See all categories <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Card 2: 18+ Japanese Swords & Katanas (4-Grid) */}
          <div className="bg-white dark:bg-[#1A1F26] p-4 sm:p-5 rounded-none shadow-md flex flex-col justify-between border border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                  18+ Katana Replicas
                </h2>
                <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
                  18+
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/products?isRestricted=true" className="group">
                  <div className="aspect-square w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800 mb-1">
                    <img
                      src="https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=400"
                      alt="Nichirin Blades"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-red-600 line-clamp-1">
                    Nichirin Blades
                  </span>
                </Link>

                <Link href="/products?isRestricted=true" className="group">
                  <div className="aspect-square w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800 mb-1">
                    <img
                      src="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400"
                      alt="Zoro 3-Sword Set"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-red-600 line-clamp-1">
                    Battle Replicas
                  </span>
                </Link>

                <Link href="/products?isRestricted=true" className="group">
                  <div className="aspect-square w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800 mb-1">
                    <img
                      src="https://images.unsplash.com/photo-1563089145-599997674d42?w=400"
                      alt="Display Scabbards"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-red-600 line-clamp-1">
                    Wood Scabbards
                  </span>
                </Link>

                <Link href="/products?isRestricted=true" className="group">
                  <div className="aspect-square w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800 mb-1">
                    <img
                      src="https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=400"
                      alt="Display Risers"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-red-600 line-clamp-1">
                    Display Stands
                  </span>
                </Link>
              </div>
            </div>

            <Link
              href="/products?isRestricted=true"
              className="mt-4 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 hover:underline inline-flex items-center gap-1"
            >
              Explore 18+ compliant collection <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Card 3: Today's Lightning Deal Box */}
          <div className="bg-white dark:bg-[#1A1F26] p-4 sm:p-5 rounded-none shadow-md flex flex-col justify-between border border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                  <Flame className="h-3 w-3 fill-white" /> Deal of the Day
                </span>
                <span className="text-[11px] font-mono font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
                </span>
              </div>

              <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white mb-2 line-clamp-1">
                {featuredDealProduct.name}
              </h2>

              <Link href={`/products/${featuredDealProduct.slug || featuredDealProduct._id}`} className="group block">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800 mb-2">
                  <img
                    src={featuredDealProduct.images[0]?.url || "https://images.unsplash.com/photo-1563089145-599997674d42?w=800"}
                    alt={featuredDealProduct.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  <span className="absolute bottom-2 left-2 rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                    Limited Time Deal
                  </span>
                </div>
              </Link>

              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {formatPrice(featuredDealProduct.discountPrice || featuredDealProduct.price)}
                  </span>
                  <span className="text-xs text-slate-400 line-through">
                    {formatPrice(featuredDealProduct.price * 1.2)}
                  </span>
                  <span className="text-xs font-bold text-red-600">20% off</span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                    <span>76% Claimed</span>
                    <span className="text-emerald-600">In Stock</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full bg-red-600 rounded-full w-[76%]" />
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="#deals"
              className="mt-4 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 hover:underline inline-flex items-center gap-1"
            >
              See all lightning deals <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Card 4: Welcome to Figure World / Account Overview */}
          <div className="bg-white dark:bg-[#1A1F26] p-4 sm:p-5 rounded-none shadow-md flex flex-col justify-between border border-slate-200 dark:border-slate-800">
            <div>
              {!user ? (
                <div className="space-y-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                    Sign in for your best experience
                  </h2>
                  <Link
                    href="/auth/login"
                    className="block w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs text-center shadow-md transition"
                  >
                    Sign in securely
                  </Link>
                  <p className="text-[11px] text-slate-500 text-center">
                    New collector?{" "}
                    <Link href="/auth/register" className="text-red-600 font-bold hover:underline">
                      Start here.
                    </Link>
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">Welcome back,</p>
                  <h2 className="font-black text-lg text-slate-900 dark:text-white truncate">
                    {user.name}
                  </h2>
                  <div className="flex gap-2 pt-1 text-xs">
                    <Link
                      href="/profile"
                      className="px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                    >
                      Your Orders
                    </Link>
                    <Link
                      href="/cart"
                      className="px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                    >
                      Cart
                    </Link>
                  </div>
                </div>
              )}

              {/* Promotional Highlight */}
              <div className="pt-3 space-y-2">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Collector Privilege
                </span>
                <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-2.5 space-y-1">
                  <p className="font-black text-xs text-red-700 dark:text-red-300">
                    Use Coupon WELCOME10
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                    Get 10% instant discount on your scale figure orders.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/products"
              className="mt-4 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 hover:underline inline-flex items-center gap-1"
            >
              Explore all collectibles <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. AMAZON-STYLE HORIZONTAL SCROLL SHELF: TODAY'S DEALS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8" id="deals">
        <div className="bg-white dark:bg-[#1A1F26] p-4 sm:p-6 rounded-none shadow-md border border-slate-200 dark:border-slate-800 space-y-4">
          {/* Shelf Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Today's Deals in Figures & Collectibles
              </h2>
              <Link href="/products" className="text-xs font-bold text-red-600 hover:underline hidden sm:inline">
                See all deals
              </Link>
            </div>

            {/* Shelf Scroll Chevrons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollShelf(dealsRowRef, "left")}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollShelf(dealsRowRef, "right")}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Horizontal Carousel Container */}
          <div
            ref={dealsRowRef}
            className="flex items-stretch gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2"
          >
            {products.map((p) => {
              const discountPercent = p.discountPrice
                ? Math.round(((p.price - p.discountPrice) / p.price) * 100)
                : 20;

              const isAdded = addedItemMap[p._id];

              return (
                <div
                  key={p._id}
                  className="w-56 sm:w-64 shrink-0 flex flex-col justify-between rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 hover:shadow-lg transition-all"
                >
                  <Link href={`/products/${p.slug || p._id}`} className="group block">
                    {/* Image Area */}
                    <div className="relative aspect-square w-full overflow-hidden bg-slate-50 dark:bg-slate-800 rounded mb-2">
                      <img
                        src={p.images[0]?.url || "https://images.unsplash.com/photo-1563089145-599997674d42?w=800"}
                        alt={p.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      {p.isRestricted && (
                        <span className="absolute top-2 left-2 rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow">
                          18+
                        </span>
                      )}
                    </div>

                    {/* Deal Badge & Price */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                          {discountPercent}% OFF
                        </span>
                        <span className="text-[11px] font-bold text-red-600 uppercase">
                          Limited deal
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          {formatPrice(p.discountPrice || p.price)}
                        </span>
                        <span className="text-xs text-slate-400 line-through">
                          {formatPrice(p.price * 1.2)}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2 group-hover:text-red-600 transition">
                        {p.name}
                      </h3>

                      {/* Ratings */}
                      <div className="flex items-center gap-1 pt-0.5">
                        <div className="flex text-amber-400 text-xs">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">(48)</span>
                      </div>

                      {/* Amazon Prime / Express Equivalent */}
                      <p className="text-[10px] text-slate-500 font-medium">
                        ✔ <span className="font-bold text-slate-800 dark:text-slate-200">FiguresWorld Express</span> | Flat ₹100
                      </p>
                    </div>
                  </Link>

                  {/* Quick Add to Cart Button */}
                  <button
                    type="button"
                    onClick={(e) => handleAddToCart(p, e)}
                    className={`mt-3 w-full py-1.5 rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isAdded
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white shadow-xs"
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Added to Cart
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-3.5 w-3.5" /> Add to Cart
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. AMAZON-STYLE SPOTLIGHT FEATURE: LIGHTNING DEAL OF THE DAY */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-white dark:bg-[#1A1F26] p-6 sm:p-8 rounded-none shadow-md border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Spotlight Image Column */}
            <div className="lg:col-span-5 flex justify-center">
              <Link href={`/products/${products[1]?.slug || products[1]?._id}`} className="group block w-full max-w-md">
                <div className="relative aspect-square w-full overflow-hidden rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
                  <img
                    src={products[1]?.images[0]?.url || "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800"}
                    alt={products[1]?.name}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <span className="absolute top-3 left-3 rounded bg-red-600 px-3 py-1 text-xs font-black uppercase text-white shadow-md">
                    Featured Masterpiece
                  </span>
                </div>
              </Link>
            </div>

            {/* Spotlight Details Column */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-3">
                <span className="rounded bg-red-600 px-2.5 py-1 text-xs font-black uppercase text-white">
                  Limited Time Collector Deal
                </span>
                <div className="flex items-center gap-1 font-mono text-xs font-bold text-red-600 dark:text-red-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Ends in {String(timeLeft.hours).padStart(2, "0")}h {String(timeLeft.minutes).padStart(2, "0")}m {String(timeLeft.seconds).padStart(2, "0")}s</span>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                {products[1]?.name || "Gojo Satoru Hollow Purple 1/7 Scale Statue"}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Jujutsu Kaisen master Gojo Satoru casting Hollow Purple with floating blindfold and LED crystalline foundation. Officially imported with certified authentic studio barcode.
              </p>

              {/* Ratings */}
              <div className="flex items-center gap-2">
                <div className="flex text-amber-400 text-sm">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">5.0 out of 5 stars</span>
                <span className="text-xs text-slate-400">| 126 collector ratings</span>
              </div>

              {/* Pricing */}
              <div className="flex items-baseline gap-3 pt-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {formatPrice(products[1]?.discountPrice || products[1]?.price || 210)}
                </span>
                <span className="text-sm text-slate-400 line-through">
                  {formatPrice((products[1]?.price || 210) * 1.25)}
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Save 20% right now
                </span>
              </div>

              {/* Progress */}
              <div className="max-w-md space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>84% Claimed</span>
                  <span className="text-red-600 font-bold">Only {products[1]?.stock || 12} left in stock</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full bg-red-600 rounded-full w-[84%]" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={(e) => handleAddToCart(products[1] || DEFAULT_PRODUCTS[1], e)}
                  className="rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm px-8 py-3 shadow-lg transition hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="h-4 w-4" /> Add to Cart Now
                </button>

                <Link
                  href={`/products/${products[1]?.slug || products[1]?._id}`}
                  className="rounded-full border border-slate-300 dark:border-slate-700 hover:border-slate-400 px-6 py-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  View Full Product Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. AMAZON-STYLE SHELF: BEST SELLERS IN SCALE FIGURES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-white dark:bg-[#1A1F26] p-4 sm:p-6 rounded-none shadow-md border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Best Sellers in Anime Scale Figures
              </h2>
              <Link href="/products?category=anime-figures" className="text-xs font-bold text-red-600 hover:underline hidden sm:inline">
                Explore Scale Figures
              </Link>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollShelf(statuesRowRef, "left")}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollShelf(statuesRowRef, "right")}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={statuesRowRef}
            className="flex items-stretch gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2"
          >
            {standardFigures.map((p) => {
              const isAdded = addedItemMap[p._id];
              return (
                <div
                  key={p._id}
                  className="w-56 sm:w-64 shrink-0 flex flex-col justify-between rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 hover:shadow-lg transition-all"
                >
                  <Link href={`/products/${p.slug || p._id}`} className="group block">
                    <div className="relative aspect-square w-full overflow-hidden bg-slate-50 dark:bg-slate-800 rounded mb-2">
                      <img
                        src={p.images[0]?.url || "https://images.unsplash.com/photo-1563089145-599997674d42?w=800"}
                        alt={p.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                        {p.brand || "Good Smile Company"}
                      </div>
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 group-hover:text-red-600 transition">
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-1 pt-0.5">
                        <div className="flex text-amber-400 text-xs">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">(4.9)</span>
                      </div>
                      <div className="text-base font-black text-slate-900 dark:text-white">
                        {formatPrice(p.discountPrice || p.price)}
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">
                        ✔ <span className="font-bold text-slate-800 dark:text-slate-200">Express</span> | Flat ₹100
                      </p>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={(e) => handleAddToCart(p, e)}
                    className={`mt-3 w-full py-1.5 rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isAdded
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white shadow-xs"
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Added
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-3.5 w-3.5" /> Add to Cart
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. AMAZON-STYLE SHELF: 18+ RESTRICTED DISPLAY KATANAS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8" id="compliance">
        <div className="bg-white dark:bg-[#1A1F26] p-4 sm:p-6 rounded-none shadow-md border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sword className="h-5 w-5 text-rose-600" />
                18+ Japanese Katanas & Ornamental Swords
              </h2>
              <span className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase text-white hidden sm:inline">
                Age Verified 18+
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollShelf(katanasRowRef, "left")}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollShelf(katanasRowRef, "right")}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Compliance Disclaimer Notice */}
          <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 p-3 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-bold text-rose-600">Legal Compliance Notice:</span> All katanas and weapons are ornamental replicas with unsharpened safety edges for display. Checkout requires 18+ age verification, destination checks, and pre-dispatch compliance inspection.
            </p>
          </div>

          <div
            ref={katanasRowRef}
            className="flex items-stretch gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2"
          >
            {restrictedKatanas.map((p) => {
              const isAdded = addedItemMap[p._id];
              return (
                <div
                  key={p._id}
                  className="w-56 sm:w-64 shrink-0 flex flex-col justify-between rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 hover:shadow-lg transition-all"
                >
                  <Link href={`/products/${p.slug || p._id}`} className="group block">
                    <div className="relative aspect-square w-full overflow-hidden bg-slate-50 dark:bg-slate-800 rounded mb-2">
                      <img
                        src={p.images[0]?.url || "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800"}
                        alt={p.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <span className="absolute top-2 left-2 rounded bg-rose-600 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow">
                        18+ Required
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 group-hover:text-red-600 transition">
                        {p.name}
                      </h3>
                      <div className="text-base font-black text-slate-900 dark:text-white">
                        {formatPrice(p.discountPrice || p.price)}
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">
                        ✔ Carbon Steel Display Blade | Unsharpened
                      </p>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={(e) => handleAddToCart(p, e)}
                    className={`mt-3 w-full py-1.5 rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isAdded
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white shadow-xs"
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Added
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-3.5 w-3.5" /> Add to Cart
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. AMAZON-STYLE PROMOTIONAL COUPON RIBBON */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-black text-white p-6 sm:p-8 rounded-none shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Exclusive Collector Offer
            </span>
            <h3 className="text-2xl sm:text-3xl font-black">
              Get 10% Instant Off With Code <span className="underline decoration-white">WELCOME10</span>
            </h3>
            <p className="text-xs sm:text-sm text-red-100 max-w-xl">
              Zero payment gateway fees. Applicable on all licensed anime scale statues, Nendoroids, and official merchandise.
            </p>
          </div>

          <Link
            href="/products"
            className="rounded-full bg-white hover:bg-slate-100 text-slate-950 font-black text-xs sm:text-sm px-8 py-3.5 shadow-xl transition-transform hover:scale-105 active:scale-95 shrink-0"
          >
            Shop With Discount
          </Link>
        </div>
      </section>

      {/* 8. AMAZON-STYLE TRUST GUARANTEE STRIP */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8" id="guarantees">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#1A1F26] p-4 rounded-none shadow-sm border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <ShieldCheck className="h-8 w-8 text-red-600 shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">100% Genuine Imports</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Directly sourced licensed collectibles from certified Japanese studios.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1A1F26] p-4 rounded-none shadow-sm border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <PackageCheck className="h-8 w-8 text-red-600 shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Collector Box Protection</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Heavy-duty corner protectors and bubble wrap on every shipment.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1A1F26] p-4 rounded-none shadow-sm border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <Truck className="h-8 w-8 text-red-600 shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Express Indian Logistics</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Blue Dart & Delhivery with automated WhatsApp tracking notifications.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1A1F26] p-4 rounded-none shadow-sm border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <CreditCard className="h-8 w-8 text-red-600 shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Direct UPI & COD</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Zero payment gateway markup with instant verification & doorstep COD.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
