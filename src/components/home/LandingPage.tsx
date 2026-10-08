"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  Clock,
  CreditCard,
  Gift,
  Headphones,
  Heart,
  PackageCheck,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { HeroCarousel, type HeroSlide } from "@/components/home/HeroCarousel";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductShelf, ShelfItem } from "@/components/product/ProductShelf";
import { Price } from "@/components/ui/Price";
import { formatPrice } from "@/lib/format";
import {
  StoreProduct,
  discountPercent,
  effectivePrice,
  hasDiscount,
  primaryImage,
  productHref,
} from "@/lib/product-view";
import {
  HERO_TINTS,
  SECTION_META,
  type CardConfig,
  type CardOf,
  type IconName,
  type LandingConfig,
  type LandingSection,
  type ProductSource,
  type SectionOf,
} from "@/lib/landing/config";

export const ICONS: Record<IconName, LucideIcon> = {
  "shield-check": ShieldCheck,
  "package-check": PackageCheck,
  truck: Truck,
  "credit-card": CreditCard,
  "rotate-ccw": RotateCcw,
  gift: Gift,
  star: Star,
  sparkles: Sparkles,
  headphones: Headphones,
  "badge-percent": BadgePercent,
  clock: Clock,
  heart: Heart,
};

/** Small label shown above each product shelf's title */
const SOURCE_EYEBROW: Record<ProductSource, string> = {
  figures: "Fan favourites",
  newest: "Just landed",
  topRated: "Collector rated",
  onSale: "On sale now",
  featured: "Staff picks",
  restricted: "18+ collection",
  category: "Collection",
};

export interface LandingPreviewOptions {
  /** Render as a signed-out visitor or a signed-in customer, regardless of who is actually signed in */
  viewAs: "guest" | "member";
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function useCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      setRemaining(Math.max(0, end.getTime() - now.getTime()));
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, []);
  if (remaining === null) return "--:--:--";
  const s = Math.floor(remaining / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

interface Catalog {
  loading: boolean;
  products: StoreProduct[];
  deals: StoreProduct[];
  figures: StoreProduct[];
  dealOfDay?: StoreProduct;
  countdown: string;
  isMember: boolean;
  firstName: string;
  preview: boolean;
}

/** Config-driven homepage. Rendered with the published layout on "/", and with the draft in the editor preview. */
export function LandingPage({ config, preview }: { config: LandingConfig; preview?: LandingPreviewOptions }) {
  const { user } = useAuth();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const countdown = useCountdown();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/products?limit=50");
        const json = await res.json();
        if (!cancelled && json?.success) setProducts(json.data.products || []);
      } catch (err) {
        console.error("Failed to load products", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isMember = preview ? preview.viewAs === "member" : !!user;

  const catalog: Catalog = useMemo(() => {
    const deals = products.filter(hasDiscount).sort((a, b) => discountPercent(b) - discountPercent(a));
    const figures = products.filter((p) => !p.isRestricted);
    return {
      loading,
      products,
      deals,
      figures,
      dealOfDay: deals[0] || figures[0],
      countdown,
      isMember,
      firstName: user?.name?.split(" ")[0] || "collector",
      preview: !!preview,
    };
  }, [products, loading, countdown, isMember, user, preview]);

  const visible = config.sections.filter(
    (s) => s.enabled && (s.audience === "all" || (s.audience === "members") === isMember)
  );

  return (
    <div className="pb-12">
      <h1 className="sr-only">Figure World — anime figures, statues and collectibles</h1>

      <div className="mx-auto max-w-[1500px] space-y-5 px-3 pt-3 sm:space-y-6 sm:px-4 sm:pt-4 lg:px-5">
        {visible.map((section) => (
          <SectionFrame key={section.id} section={section} preview={preview}>
            <SectionView section={section} catalog={catalog} />
          </SectionFrame>
        ))}

        {preview && visible.length === 0 && (
          <div className="card flex min-h-[240px] items-center justify-center p-8 text-center text-sm text-fg-2">
            No visible sections for this audience. Add a section or turn one on in the editor.
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SectionFrame({
  section,
  preview,
  children,
}: {
  section: LandingSection;
  preview?: LandingPreviewOptions;
  children: React.ReactNode;
}) {
  if (!preview) return <>{children}</>;
  const selected = preview.selectedId === section.id;
  return (
    <div
      data-section-id={section.id}
      onClickCapture={() => preview.onSelect(section.id)}
      className={`group/frame relative scroll-mt-24 rounded-2xl outline-offset-4 transition-[outline-color] ${
        selected ? "outline outline-2 outline-brand" : "outline outline-1 outline-transparent hover:outline-brand/50"
      }`}
    >
      <span
        className={`pointer-events-none absolute -top-3 left-3 z-30 rounded-md bg-brand px-2 py-0.5 text-[11px] font-bold text-white shadow-md transition-opacity ${
          selected ? "opacity-100" : "opacity-0 group-hover/frame:opacity-100"
        }`}
      >
        {section.label || SECTION_META[section.type].name}
      </span>
      {children}
    </div>
  );
}

function SectionView({ section, catalog }: { section: LandingSection; catalog: Catalog }) {
  switch (section.type) {
    case "hero":
      return <HeroCarousel slides={section.slides.map(toHeroSlide)} />;
    case "topCategories":
      return <TopCategoriesSection section={section} />;
    case "announcement":
      return <Announcement section={section} />;
    case "cardRow":
      return <CardRow section={section} catalog={catalog} />;
    case "dealsShelf":
      return <DealsShelf section={section} catalog={catalog} />;
    case "productShelf":
      return <ProductSourceShelf section={section} catalog={catalog} />;
    case "spotlight":
      return <SpotlightSection section={section} catalog={catalog} />;
    case "promoBanner":
      return <PromoBanner section={section} />;
    case "guarantees":
      return <Guarantees section={section} />;
    case "storeInfo":
      return <StoreInfo section={section} />;
    case "signInNudge":
      return <SignInNudge section={section} />;
  }
}

function toHeroSlide(s: SectionOf<"hero">["slides"][number]): HeroSlide {
  return { tag: s.tag, title: s.title, subtitle: s.subtitle, cta: s.cta, href: s.href, image: s.image, tint: HERO_TINTS[s.tint].className };
}

/** Live "ends in" countdown pill */
function CountdownPill({ value, dark = false }: { value: string; dark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        dark ? "bg-white/10 text-white ring-1 ring-white/15" : "bg-brand-soft text-brand-ink"
      }`}
    >
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      Ends in <span className="font-mono font-bold tabular-nums">{value}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Sections */

const TONE_CLASS = {
  brand: "text-white shadow-glow",
  neutral: "border border-line bg-surface text-fg",
  success: "bg-success-soft text-success",
} as const;

function TopCategoriesSection({ section }: { section: SectionOf<"topCategories"> }) {
  return (
    <section className="w-full">
      {/* Header matching client screenshot: Bold uppercase title, underline with brand accent, orange VIEW ALL button */}
      <div className="relative mb-3 flex items-center justify-between border-b border-line pb-2.5 sm:mb-5 sm:pb-3">
        <div className="relative">
          <h2 className="text-base font-black tracking-wider uppercase text-fg sm:text-lg md:text-xl lg:text-2xl">
            {section.title}
          </h2>
          <span className="absolute -bottom-[11px] left-0 h-[3px] w-full rounded-full bg-brand sm:-bottom-[13px]" />
        </div>
        {section.seeAllHref && section.seeAllLabel && (
          <Link
            href={section.seeAllHref}
            className="inline-flex items-center justify-center rounded-md bg-[#ea580c] px-3.5 py-1 text-xs font-black uppercase tracking-wider text-white shadow-sm transition-all hover:bg-[#c2410c] hover:shadow active:scale-95 sm:px-4 sm:py-1.5 sm:text-xs"
          >
            {section.seeAllLabel}
          </Link>
        )}
      </div>

      {/* Grid: 2 columns on mobile (exact match with client reference screenshot), 4 on tablet/laptop, 8 on wide desktop */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-4 xl:grid-cols-8 lg:gap-5">
        {section.items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group flex flex-col items-center rounded-2xl border border-line/70 bg-surface p-2 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-md sm:p-2.5"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={item.name}
                loading="lazy"
                className="h-full w-full object-cover object-center transition-transform duration-300 ease-out group-hover:scale-105"
              />
            </div>
            <span className="mt-2.5 text-center text-xs font-extrabold uppercase tracking-wide text-fg transition-colors group-hover:text-brand sm:mt-3 sm:text-sm">
              {item.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Announcement({ section: s }: { section: SectionOf<"announcement"> }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl px-4 py-3 text-center text-sm font-semibold ${TONE_CLASS[s.tone]}`}
      style={s.tone === "brand" ? { backgroundImage: "var(--brand-gradient)" } : undefined}
    >
      <Sparkles className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
      <span>{s.text}</span>
      {s.href && s.linkLabel && (
        <Link href={s.href} className="inline-flex items-center gap-1 underline decoration-2 underline-offset-4 hover:no-underline">
          {s.linkLabel} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function CardRow({ section, catalog }: { section: SectionOf<"cardRow">; catalog: Catalog }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
      {section.cards.map((card) => (
        <CardView key={card.id} card={card} catalog={catalog} />
      ))}
    </div>
  );
}

function CardView({ card, catalog }: { card: CardConfig; catalog: Catalog }) {
  switch (card.kind) {
    case "tiles":
      return (
        <HomeCard title={card.title} href={card.href} linkLabel={card.linkLabel} badge={card.badge}>
          <div className="grid grid-cols-2 gap-3">
            {card.tiles.map((t) => (
              <Tile key={t.id} label={t.label} img={t.image} href={t.href} />
            ))}
          </div>
        </HomeCard>
      );
    case "image":
      return (
        <HomeCard title={card.title} href={card.href} linkLabel={card.linkLabel}>
          <Link href={card.href} className="group/img relative block flex-1 overflow-hidden rounded-xl bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.image}
              alt=""
              loading="lazy"
              className="h-full max-h-[300px] min-h-[200px] w-full object-cover transition duration-700 ease-out group-hover/img:scale-105"
            />
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </Link>
        </HomeCard>
      );
    case "dealOfDay":
      return <DealOfDayCard card={card} catalog={catalog} />;
    case "budgetPicks":
      return <BudgetPicksCard card={card} catalog={catalog} />;
    case "account":
      return <AccountCard card={card} catalog={catalog} />;
  }
}

function DealOfDayCard({ card, catalog }: { card: CardOf<"dealOfDay">; catalog: Catalog }) {
  const p = catalog.dealOfDay;
  return (
    <HomeCard title={card.title} href={card.href} linkLabel={card.linkLabel}>
      {p ? (
        <Link href={productHref(p)} className="group/deal flex flex-1 flex-col">
          <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={primaryImage(p)} alt={p.name} className="h-full w-full object-cover transition duration-700 ease-out group-hover/deal:scale-105" />
            {discountPercent(p) > 0 && (
              <span className="chip absolute left-2.5 top-2.5 text-white shadow-sm" style={{ backgroundImage: "var(--brand-gradient)" }}>
                -{discountPercent(p)}%
              </span>
            )}
          </div>
          <p className="line-clamp-1 text-sm font-semibold text-fg group-hover/deal:text-brand-ink">{p.name}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <Price amount={effectivePrice(p)} size="sm" className="font-semibold" />
            {hasDiscount(p) && <span className="text-xs text-muted line-through">{formatPrice(p.price)}</span>}
          </div>
          <div className="mt-2">
            <CountdownPill value={catalog.countdown} />
          </div>
        </Link>
      ) : (
        <div className="aspect-[4/3] animate-pulse rounded-xl bg-surface-3" />
      )}
    </HomeCard>
  );
}

function BudgetPicksCard({ card, catalog }: { card: CardOf<"budgetPicks">; catalog: Catalog }) {
  const picks = useMemo(() => {
    const byPrice = [...catalog.figures].sort((a, b) => effectivePrice(a) - effectivePrice(b));
    const under = byPrice.filter((p) => effectivePrice(p) <= card.maxPrice);
    return (under.length ? under : byPrice).slice(0, 4);
  }, [catalog.figures, card.maxPrice]);

  return (
    <HomeCard title={card.title} href={card.href} linkLabel={card.linkLabel}>
      <div className="grid grid-cols-2 gap-3">
        {picks.map((p) => (
          <Link key={p._id} href={productHref(p)} className="group/pick">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={primaryImage(p)} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover/pick:scale-105" />
              <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
                {formatPrice(effectivePrice(p))}
              </span>
            </div>
          </Link>
        ))}
        {catalog.loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-xl bg-surface-3" />)}
      </div>
    </HomeCard>
  );
}

function AccountCard({ card, catalog }: { card: CardOf<"account">; catalog: Catalog }) {
  if (catalog.isMember) {
    return (
      <HomeCard title={`Welcome back, ${catalog.firstName}`} href="/profile" linkLabel="Go to your account" eyebrow="Your account">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Your orders", href: "/profile#orders", img: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600" },
            { label: "Your cart", href: "/cart", img: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600" },
            { label: "Addresses", href: "/profile#addresses", img: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600" },
            { label: "New arrivals", href: "/products?sort=newest", img: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=600" },
          ].map((t) => (
            <Tile key={t.label} {...t} />
          ))}
        </div>
      </HomeCard>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="card p-5">
        <p className="eyebrow">
          <span className="slash" aria-hidden="true" /> Members
        </p>
        <h2 className="mt-2 text-lg font-bold leading-snug text-fg">Sign in for your best experience</h2>
        <Link href="/auth/login" className="btn btn-primary mt-4 w-full">
          Sign in securely
        </Link>
        <p className="mt-2 text-center text-xs text-fg-2">
          New here?{" "}
          <Link href="/auth/register" className="link">
            Create an account
          </Link>
        </p>
      </div>
      {(card.offerTitle || card.offerCode) && (
        <div className="surface-ink relative flex flex-1 flex-col justify-center overflow-hidden rounded-[0.9rem] p-5">
          <span className="pointer-events-none absolute -right-8 -top-6 h-36 w-16 skew-x-[-20deg] bg-gradient-to-b from-brand/70 to-transparent" aria-hidden="true" />
          {card.offerLabel && <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">{card.offerLabel}</p>}
          {card.offerTitle && <p className="mt-1 font-display text-2xl font-bold leading-tight">{card.offerTitle}</p>}
          {card.offerCode && (
            <p className="mt-3 w-fit rounded-lg border-2 border-dashed border-brand/80 bg-white/5 px-3 py-1 font-mono text-lg font-bold tracking-[0.25em] text-white">
              {card.offerCode}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DealsShelf({ section: s, catalog }: { section: SectionOf<"dealsShelf">; catalog: Catalog }) {
  const items = catalog.deals.length ? catalog.deals : catalog.figures;
  return (
    <ProductShelf
      id="deals"
      eyebrow="Limited time"
      title={s.title}
      seeAllHref={s.seeAllHref}
      seeAllLabel={s.seeAllLabel}
      aside={s.showCountdown ? <CountdownPill value={catalog.countdown} /> : undefined}
    >
      {catalog.loading ? (
        <ShelfSkeleton />
      ) : (
        items.map((p) => (
          <ShelfItem key={p._id}>
            <DealTile product={p} />
          </ShelfItem>
        ))
      )}
    </ProductShelf>
  );
}

function useCategoryProducts(slug: string | undefined, enabled: boolean) {
  const [state, setState] = useState<{ slug?: string; products: StoreProduct[] }>({ products: [] });
  useEffect(() => {
    if (!enabled || !slug) return;
    let cancelled = false;
    fetch(`/api/products?category=${encodeURIComponent(slug)}&limit=30`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setState({ slug, products: json?.success ? json.data.products || [] : [] });
      })
      .catch(() => {
        if (!cancelled) setState({ slug, products: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [slug, enabled]);
  return { products: state.products, loading: enabled && !!slug && state.slug !== slug };
}

function ProductSourceShelf({ section: s, catalog }: { section: SectionOf<"productShelf">; catalog: Catalog }) {
  const category = useCategoryProducts(s.categorySlug, s.source === "category");

  const items = useMemo(() => {
    const all = catalog.products;
    switch (s.source) {
      case "figures":
        return catalog.figures;
      case "newest":
        return [...all].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      case "topRated":
        return [...all].sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));
      case "onSale":
        return catalog.deals;
      case "featured":
        return all.filter((p) => p.isFeatured);
      case "restricted":
        return all.filter((p) => p.isRestricted);
      case "category":
        return category.products;
    }
  }, [s.source, catalog, category.products]).slice(0, s.maxItems);

  const loading = s.source === "category" ? category.loading : catalog.loading;

  if (!loading && items.length === 0) {
    // Nothing to show — hide on the live site, explain in the preview
    return catalog.preview ? (
      <div className="card p-5 text-sm text-fg-2">
        <p className="font-bold text-fg">{s.title}</p>
        <p className="mt-1">
          No products match this shelf yet
          {s.source === "category" ? (s.categorySlug ? ` (category "${s.categorySlug}")` : " — pick a category") : ""}. It stays hidden on the live
          site until it has products.
        </p>
      </div>
    ) : null;
  }

  return (
    <ProductShelf
      eyebrow={SOURCE_EYEBROW[s.source]}
      title={s.title}
      seeAllHref={s.seeAllHref}
      seeAllLabel={s.seeAllLabel}
      aside={s.badge ? <span className="chip chip-dark">{s.badge}</span> : undefined}
    >
      {loading ? (
        <ShelfSkeleton />
      ) : (
        <>
          {(s.introTitle || s.introText) && (
            <div className="w-[78%] shrink-0 snap-start sm:w-[260px]">
              <div className="surface-ink relative flex h-full flex-col justify-between overflow-hidden rounded-2xl p-5">
                <span className="pointer-events-none absolute -right-6 -top-4 h-28 w-12 skew-x-[-20deg] bg-gradient-to-b from-brand/70 to-transparent" aria-hidden="true" />
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <ShieldAlert className="h-5 w-5 text-white" />
                </span>
                <div>
                  {s.introTitle && <p className="mt-4 font-display text-lg font-bold leading-snug">{s.introTitle}</p>}
                  {s.introText && <p className="mt-1.5 text-sm leading-6 text-white/70">{s.introText}</p>}
                </div>
              </div>
            </div>
          )}
          {items.map((p) => (
            <ShelfItem key={p._id}>
              <ProductCard product={p} variant="compact" />
            </ShelfItem>
          ))}
        </>
      )}
    </ProductShelf>
  );
}

function SpotlightSection({ section: s, catalog }: { section: SectionOf<"spotlight">; catalog: Catalog }) {
  const picked = s.productSlug ? catalog.products.find((p) => p.slug === s.productSlug || p._id === s.productSlug) : undefined;
  const p = picked || catalog.dealOfDay;
  if (!p) return catalog.loading ? <div className="h-[380px] animate-pulse rounded-2xl bg-surface-3" /> : null;

  const off = discountPercent(p);
  return (
    <section className="surface-ink relative overflow-hidden rounded-2xl">
      <span className="pointer-events-none absolute -left-24 bottom-0 top-0 hidden w-72 skew-x-[-20deg] bg-gradient-to-b from-transparent via-brand/20 to-transparent md:block" aria-hidden="true" />
      <div className="relative grid md:grid-cols-2">
        <Link href={productHref(p)} className="group/spot relative block aspect-[4/3] overflow-hidden md:aspect-auto md:min-h-[400px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={primaryImage(p)}
            alt={p.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover/spot:scale-105"
          />
          <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--ink)] md:bg-gradient-to-r" aria-hidden="true" />
          <span className="chip chip-brand absolute left-4 top-4 uppercase tracking-wider shadow-glow">Featured</span>
        </Link>
        <div className="flex flex-col justify-center gap-4 p-6 sm:p-10">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {s.badge && (
              <span className="eyebrow text-white">
                <span className="slash" aria-hidden="true" /> {s.badge}
              </span>
            )}
            <CountdownPill value={catalog.countdown} dark />
          </div>
          <h2 className="text-3xl font-bold leading-[1.08] text-white sm:text-4xl">{p.name}</h2>
          {p.brand && <p className="text-sm uppercase tracking-[0.16em] text-white/55">by {p.brand}</p>}
          <div className="flex flex-wrap items-baseline gap-3">
            {off > 0 && <span className="font-display text-3xl font-semibold text-gradient-brand">-{off}%</span>}
            <Price amount={effectivePrice(p)} size="lg" className="!text-white" />
            {hasDiscount(p) && <span className="text-sm text-white/50 line-through">{formatPrice(p.price)}</span>}
          </div>
          {p.stock > 0 && p.stock <= 15 && (
            <p className="flex items-center gap-2 text-sm font-semibold text-white/85">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand" aria-hidden="true" />
              Only {p.stock} left in stock — order soon.
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-3">
            <Link href={productHref(p)} className="btn btn-primary btn-lg">
              View deal <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/products?onSale=true" className="btn btn-lg border border-white/25 text-white hover:bg-white/10">
              More deals
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function PromoBanner({ section: s }: { section: SectionOf<"promoBanner"> }) {
  const copy = (light: boolean) => (
    <div className={`flex flex-col justify-center gap-2 p-6 sm:p-10 ${light ? "text-white" : ""}`}>
      {s.eyebrow && (
        <span className={`eyebrow ${light ? "!text-white/85" : ""}`}>
          <span className="slash" aria-hidden="true" /> {s.eyebrow}
        </span>
      )}
      <h2 className={`text-3xl font-bold leading-[1.08] sm:text-4xl ${light ? "drop-shadow" : "text-fg"}`}>{s.title}</h2>
      {s.text && <p className={`max-w-prose text-sm leading-6 sm:text-base ${light ? "text-white/80" : "text-fg-2"}`}>{s.text}</p>}
      {s.ctaLabel && (
        <Link href={s.href} className="btn btn-primary mt-4 w-fit">
          {s.ctaLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );

  if (s.layout === "background") {
    return (
      <section className="relative overflow-hidden rounded-2xl bg-black shadow-pop">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10" />
        <div className="relative min-h-[280px] sm:min-h-[340px] sm:max-w-[60%]">{copy(true)}</div>
      </section>
    );
  }

  return (
    <section className="card card-hover overflow-hidden rounded-2xl">
      <div className="grid md:grid-cols-2">
        <Link
          href={s.href}
          className={`group/promo relative block aspect-[16/9] overflow-hidden bg-surface-2 md:aspect-auto md:min-h-[320px] ${s.layout === "imageLeft" ? "" : "md:order-2"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover/promo:scale-105" />
        </Link>
        {copy(false)}
      </div>
    </section>
  );
}

function Guarantees({ section }: { section: SectionOf<"guarantees"> }) {
  return (
    <section id="guarantees" className="scroll-mt-32">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {section.items.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <div key={item.id} className="card card-hover flex items-start gap-4 p-5">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-glow"
                style={{ backgroundImage: "var(--brand-gradient)" }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-base font-bold text-fg">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-fg-2">{item.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StoreInfo({ section: s }: { section: SectionOf<"storeInfo"> }) {
  return (
    <section id="delivery" className={`grid scroll-mt-32 gap-4 ${s.columns.length ? "lg:grid-cols-[1.1fr_1fr]" : ""}`}>
      <div id="about" className="surface-ink relative scroll-mt-32 overflow-hidden rounded-2xl p-6 sm:p-8">
        <span className="pointer-events-none absolute -right-10 -top-10 h-56 w-20 skew-x-[-20deg] bg-gradient-to-b from-brand/80 to-transparent" aria-hidden="true" />
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/60">Collect × Display × Beyond</p>
        {s.title && <h2 className="mt-3 text-3xl font-bold leading-tight text-white">{s.title}</h2>}
        {s.text && <p className="mt-3 max-w-xl text-sm leading-7 text-white/75">{s.text}</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          {["Licensed imports", "Collector-safe packing", "Pan-India delivery"].map((t) => (
            <span key={t} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85 ring-1 ring-white/10">
              {t}
            </span>
          ))}
        </div>
      </div>
      {s.columns.length > 0 && (
        <div className={`grid gap-4 ${s.columns.length > 1 ? "sm:grid-cols-2 lg:grid-cols-1" : ""}`}>
          {s.columns.map((c) => {
            const Icon = ICONS[c.icon];
            return (
              <div key={c.id} className="card flex items-start gap-4 p-5 sm:p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-fg">{c.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-fg-2">{c.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SignInNudge({ section: s }: { section: SectionOf<"signInNudge"> }) {
  return (
    <section className="surface-ink relative overflow-hidden rounded-2xl px-6 py-10 text-center sm:py-12">
      <span className="pointer-events-none absolute -left-10 top-0 h-full w-24 skew-x-[-20deg] bg-gradient-to-b from-brand/50 to-transparent" aria-hidden="true" />
      <span className="pointer-events-none absolute -right-10 top-0 h-full w-24 skew-x-[-20deg] bg-gradient-to-t from-brand/40 to-transparent" aria-hidden="true" />
      <p className="eyebrow justify-center !text-white/70">
        <span className="slash" aria-hidden="true" /> Members
      </p>
      {s.text && <h2 className="mx-auto mt-3 max-w-xl text-2xl font-bold text-white sm:text-3xl">{s.text}</h2>}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/auth/login" className="btn btn-primary btn-lg min-w-48">
          {s.buttonLabel}
        </Link>
        <Link href="/auth/register" className="btn btn-lg border border-white/25 text-white hover:bg-white/10">
          New customer? Start here
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Building blocks */

function HomeCard({
  title,
  href,
  linkLabel,
  badge,
  eyebrow,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  badge?: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card card-hover flex flex-col p-5">
      {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-lg font-bold leading-snug text-fg">{title}</h2>
        {badge && <span className="chip chip-dark shrink-0">{badge}</span>}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
      {linkLabel && (
        <Link href={href} className="group/more mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-ink hover:text-brand-hover">
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/more:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function Tile({ label, img, href }: { label: string; img: string; href: string }) {
  return (
    <Link href={href} className="group/tile">
      <div className="aspect-square overflow-hidden rounded-xl bg-surface-2 ring-1 ring-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover/tile:scale-105" />
      </div>
      <p className="mt-1.5 line-clamp-1 text-xs font-medium text-fg-2 group-hover/tile:text-brand-ink">{label}</p>
    </Link>
  );
}

function DealTile({ product: p }: { product: StoreProduct }) {
  const off = discountPercent(p);
  return (
    <Link href={productHref(p)} className="group/dt block">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={primaryImage(p)} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-700 ease-out group-hover/dt:scale-105" />
        {off > 0 && (
          <span className="chip absolute left-2.5 top-2.5 text-white shadow-sm" style={{ backgroundImage: "var(--brand-gradient)" }}>
            -{off}%
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <Price amount={effectivePrice(p)} size="sm" className="font-semibold" />
        {hasDiscount(p) && <span className="text-xs text-muted line-through">{formatPrice(p.price)}</span>}
      </div>
      <p className="mt-0.5 line-clamp-1 text-[13px] font-medium text-fg-2 group-hover/dt:text-brand-ink">{p.name}</p>
    </Link>
  );
}

function ShelfSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <ShelfItem key={i}>
          <div className="aspect-square animate-pulse rounded-2xl bg-surface-3" />
          <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-surface-3" />
          <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-surface-3" />
        </ShelfItem>
      ))}
    </>
  );
}
