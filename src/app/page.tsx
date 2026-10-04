"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  PackageCheck,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
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

const IMG = {
  figures: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600",
  statues: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600",
  chibi: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600",
  posters: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=600",
};

const HERO_SLIDES = [
  {
    tag: "Collector Festival",
    title: "Up to 30% off scale figures",
    subtitle: "Authentic imports from Good Smile, MegaHouse, Bandai Spirits and more.",
    cta: "Shop the sale",
    href: "/products?onSale=true",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1800",
    tint: "from-black/80 via-black/40",
  },
  {
    tag: "New arrivals",
    title: "Gojo, Luffy Gear 5 & more",
    subtitle: "Limited-edition resin statues and battle dioramas, delivered across India.",
    cta: "See what's new",
    href: "/products?sort=newest",
    image: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=1800",
    tint: "from-[#3a0406]/90 via-[#3a0406]/45",
  },
  {
    tag: "18+ ornamental replicas",
    title: "Hand-finished anime katanas",
    subtitle: "Unsharpened display blades with authentic fittings. Age verified at checkout.",
    cta: "Explore replicas",
    href: "/products?category=katanas-replicas",
    image: "https://images.unsplash.com/photo-1563089145-599997674d42?w=1800",
    tint: "from-black/85 via-black/45",
  },
];

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

export default function HomePage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
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

  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 6000);
    return () => window.clearInterval(t);
  }, [paused]);

  const { deals, figures, katanas, dealOfDay, budget } = useMemo(() => {
    const deals = products.filter(hasDiscount).sort((a, b) => discountPercent(b) - discountPercent(a));
    const figures = products.filter((p) => !p.isRestricted);
    const katanas = products.filter((p) => p.isRestricted);
    const budget = [...figures].sort((a, b) => effectivePrice(a) - effectivePrice(b)).slice(0, 4);
    return { deals, figures, katanas, dealOfDay: deals[0] || figures[0], budget };
  }, [products]);

  return (
    <div className="pb-10">
      {/* HERO CAROUSEL */}
      <section
        aria-roledescription="carousel"
        aria-label="Featured promotions"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="relative mx-auto h-[230px] max-w-[1500px] overflow-hidden sm:h-[320px] md:h-[440px] lg:h-[520px]"
      >
        {HERO_SLIDES.map((s, i) => (
          <div
            key={s.title}
            aria-hidden={i !== slide}
            className={`absolute inset-0 transition-opacity duration-700 ${i === slide ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.image}
              alt=""
              className={`h-full w-full object-cover transition-transform duration-[6000ms] ease-linear ${
                i === slide ? "scale-105" : "scale-100"
              }`}
              fetchPriority={i === 0 ? "high" : "low"}
            />
            <div className={`absolute inset-0 bg-gradient-to-r ${s.tint} to-transparent`} />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg via-bg/60 to-transparent md:h-2/3" />

            <div className="absolute inset-0 mx-auto flex max-w-[1500px] items-start px-6 pt-6 sm:px-14 sm:pt-12 lg:pt-16">
              <div className={`max-w-lg text-white ${i === slide ? "animate-fade-up" : ""}`}>
                <span className="chip chip-brand mb-2 uppercase tracking-wider sm:mb-3">{s.tag}</span>
                <h1 className="text-2xl font-extrabold leading-tight tracking-tight drop-shadow sm:text-4xl lg:text-5xl">
                  {s.title}
                </h1>
                <p className="mt-2 hidden max-w-md text-sm text-white/85 sm:block md:text-base">{s.subtitle}</p>
                <Link href={s.href} className="btn btn-primary mt-3 sm:mt-5" tabIndex={i === slide ? 0 : -1}>
                  {s.cta}
                </Link>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setSlide((s) => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
          aria-label="Previous slide"
          className="absolute left-0 top-0 z-10 hidden h-[55%] w-16 items-center justify-center text-white/90 transition hover:text-white focus-visible:outline-offset-[-4px] sm:flex"
        >
          <ChevronLeft className="h-11 w-11 drop-shadow-lg" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={() => setSlide((s) => (s + 1) % HERO_SLIDES.length)}
          aria-label="Next slide"
          className="absolute right-0 top-0 z-10 hidden h-[55%] w-16 items-center justify-center text-white/90 transition hover:text-white focus-visible:outline-offset-[-4px] sm:flex"
        >
          <ChevronRight className="h-11 w-11 drop-shadow-lg" strokeWidth={1.5} />
        </button>

        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 md:bottom-[42%]">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === slide}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === slide ? "w-6 bg-brand" : "w-1.5 bg-fg/30 hover:bg-fg/60"}`}
            />
          ))}
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-[1500px] space-y-5 px-3 sm:px-4 md:-mt-[180px] lg:-mt-[250px] lg:px-5">
        {/* ROW 1 — overlapping cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          <QuadCard
            title="Shop by category"
            linkLabel="See all departments"
            href="/products"
            tiles={[
              { label: "Scale figures", img: IMG.figures, href: "/products?category=anime-figures" },
              { label: "Resin statues", img: IMG.statues, href: "/products?category=collectibles" },
              { label: "Chibi & keychains", img: IMG.chibi, href: "/products?category=keychains" },
              { label: "Posters & scrolls", img: IMG.posters, href: "/products?category=posters" },
            ]}
          />

          <HomeCard title="Deal of the day" href="/products?onSale=true" linkLabel="See all deals">
            {dealOfDay ? (
              <Link href={productHref(dealOfDay)} className="group flex flex-1 flex-col">
                <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-md bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={primaryImage(dealOfDay)}
                    alt={dealOfDay.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {discountPercent(dealOfDay) > 0 && (
                    <span className="rounded-sm bg-brand px-1.5 py-0.5 text-xs font-bold text-white">
                      Up to {discountPercent(dealOfDay)}% off
                    </span>
                  )}
                  <span className="text-xs font-bold text-brand-ink">Deal of the Day</span>
                </div>
                <p className="mt-1.5 line-clamp-1 text-sm text-fg-2 group-hover:text-brand-ink">{dealOfDay.name}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                  <Clock className="h-3.5 w-3.5" /> Ends in <span className="font-mono font-semibold text-fg">{countdown}</span>
                </p>
              </Link>
            ) : (
              <div className="aspect-[4/3] animate-pulse rounded-md bg-surface-3" />
            )}
          </HomeCard>

          <QuadCard
            title="Katanas & replicas"
            badge="18+"
            linkLabel="Explore replicas"
            href="/products?category=katanas-replicas"
            tiles={[
              { label: "Nichirin blades", img: IMG.statues, href: "/products?category=katanas-replicas" },
              { label: "Battle replicas", img: IMG.chibi, href: "/products?category=katanas-replicas" },
              { label: "Display stands", img: IMG.figures, href: "/products?category=accessories" },
              { label: "Collector sets", img: IMG.posters, href: "/products?category=katanas-replicas" },
            ]}
          />

          {user ? (
            <HomeCard title={`Welcome back, ${user.name.split(" ")[0]}`} href="/profile" linkLabel="Go to your account">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Your orders", href: "/profile#orders", img: IMG.statues },
                  { label: "Your cart", href: "/cart", img: IMG.figures },
                  { label: "Addresses", href: "/profile#addresses", img: IMG.chibi },
                  { label: "New arrivals", href: "/products?sort=newest", img: IMG.posters },
                ].map((t) => (
                  <Tile key={t.label} {...t} />
                ))}
              </div>
            </HomeCard>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="card p-5">
                <h2 className="text-lg font-bold text-fg">Sign in for your best experience</h2>
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
              <div className="card flex flex-1 flex-col justify-center overflow-hidden bg-brand p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/80">First order offer</p>
                <p className="mt-1 text-2xl font-extrabold leading-tight">10% off with code</p>
                <p className="mt-2 w-fit rounded-md border-2 border-dashed border-white/70 px-3 py-1 font-mono text-lg font-bold tracking-widest">
                  WELCOME10
                </p>
              </div>
            </div>
          )}
        </div>

        {/* TODAY'S DEALS */}
        <ProductShelf
          id="deals"
          title="Today's Deals"
          seeAllHref="/products?onSale=true"
          seeAllLabel="See all deals"
          aside={
            <span className="flex items-center gap-1 text-sm text-fg-2">
              <Clock className="h-4 w-4 text-brand-ink" /> Ends in <span className="font-mono font-semibold text-fg">{countdown}</span>
            </span>
          }
        >
          {loading
            ? <ShelfSkeleton />
            : (deals.length ? deals : figures).map((p) => (
                <ShelfItem key={p._id}>
                  <DealTile product={p} />
                </ShelfItem>
              ))}
        </ProductShelf>

        {/* ROW 2 — more cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          <HomeCard title="Under ₹2,000 picks" href="/products?maxPrice=2000&sort=price-asc" linkLabel="Shop budget picks">
            <div className="grid grid-cols-2 gap-3">
              {(budget.length ? budget : []).map((p) => (
                <Link key={p._id} href={productHref(p)} className="group">
                  <div className="aspect-square overflow-hidden rounded-md bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={primaryImage(p)} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-fg">{formatPrice(effectivePrice(p))}</p>
                </Link>
              ))}
              {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-md bg-surface-3" />)}
            </div>
          </HomeCard>

          <SingleImageCard
            title="New arrivals are here"
            img={IMG.posters}
            href="/products?sort=newest"
            linkLabel="Shop new arrivals"
          />

          <SingleImageCard
            title="Top-rated by collectors"
            img={IMG.statues}
            href="/products?sort=rating"
            linkLabel="See best sellers"
          />

          <QuadCard
            title="Complete your display"
            linkLabel="Shop accessories"
            href="/products?category=accessories"
            tiles={[
              { label: "Display cases", img: IMG.figures, href: "/products?category=accessories" },
              { label: "Manga & artbooks", img: IMG.posters, href: "/products?category=manga" },
              { label: "Keychains", img: IMG.chibi, href: "/products?category=keychains" },
              { label: "Wall art", img: IMG.statues, href: "/products?category=posters" },
            ]}
          />
        </div>

        {/* BEST SELLERS */}
        <ProductShelf title="Best Sellers in Anime Figures" seeAllHref="/products?category=anime-figures" seeAllLabel="Shop figures">
          {loading ? (
            <ShelfSkeleton />
          ) : (
            figures.map((p) => (
              <ShelfItem key={p._id}>
                <ProductCard product={p} variant="compact" />
              </ShelfItem>
            ))
          )}
        </ProductShelf>

        {/* SPOTLIGHT */}
        {dealOfDay && <Spotlight product={dealOfDay} countdown={countdown} />}

        {/* KATANAS */}
        {(loading || katanas.length > 0) && (
          <ProductShelf
            id="compliance"
            title="Katanas & Ornamental Replicas"
            seeAllHref="/products?category=katanas-replicas"
            aside={<span className="chip chip-brand">18+ only</span>}
          >
            {loading ? (
              <ShelfSkeleton />
            ) : (
              <>
                <div className="w-[78%] shrink-0 snap-start sm:w-[260px]">
                  <div className="flex h-full flex-col justify-between rounded-lg border border-brand/25 bg-brand-soft p-4">
                    <ShieldAlert className="h-8 w-8 text-brand-ink" />
                    <div>
                      <p className="mt-3 font-bold text-fg">Display replicas, sold responsibly</p>
                      <p className="mt-1 text-sm text-fg-2">
                        Every blade is unsharpened and for display only. Buyers confirm they are 18+ and delivery is
                        checked against local regulations before dispatch.
                      </p>
                    </div>
                  </div>
                </div>
                {katanas.map((p) => (
                  <ShelfItem key={p._id}>
                    <ProductCard product={p} variant="compact" />
                  </ShelfItem>
                ))}
              </>
            )}
          </ProductShelf>
        )}

        {/* GUARANTEES */}
        <section id="guarantees" className="scroll-mt-32">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: "100% genuine imports", text: "Licensed collectibles sourced directly from Japanese studios and authorised distributors." },
              { icon: PackageCheck, title: "Collector-safe packing", text: "Boxes are double-packed with corner protectors so they arrive shelf-ready." },
              { icon: Truck, title: "Tracked delivery", text: "Shipped with Blue Dart & Delhivery. Updates on WhatsApp and email." },
              { icon: CreditCard, title: "UPI & Cash on Delivery", text: "Pay by any UPI app or in cash at your door — no gateway surcharges." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="card flex items-start gap-3 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-fg">{title}</h3>
                  <p className="mt-0.5 text-sm text-fg-2">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="delivery" className="card scroll-mt-32 grid gap-6 p-5 sm:p-6 md:grid-cols-3">
          <div id="about" className="scroll-mt-32 md:col-span-1">
            <h2 className="section-title">About Figure World</h2>
            <p className="mt-2 text-sm text-fg-2">
              We&apos;re a team of collectors bringing officially licensed anime figures, statues and replicas to fans
              across India — with honest prices, careful packing and real support.
            </p>
          </div>
          <div>
            <h3 className="flex items-center gap-2 font-bold text-fg">
              <Truck className="h-5 w-5 text-brand-ink" /> Shipping & delivery
            </h3>
            <p className="mt-2 text-sm text-fg-2">
              Flat {formatPrice(100)} delivery on every order. Most orders arrive in 3–5 business days; 18+ replicas
              may take 1–2 extra days for verification.
            </p>
          </div>
          <div>
            <h3 className="flex items-center gap-2 font-bold text-fg">
              <RotateCcw className="h-5 w-5 text-brand-ink" /> Damage protection
            </h3>
            <p className="mt-2 text-sm text-fg-2">
              If your collectible arrives damaged, share an unboxing video within 48 hours and we&apos;ll replace it free.
            </p>
          </div>
        </section>

        {/* SIGN-IN NUDGE */}
        {!user && (
          <section className="card flex flex-col items-center gap-2 border-y py-8 text-center">
            <p className="text-sm text-fg">See personalized recommendations</p>
            <Link href="/auth/login" className="btn btn-primary w-60">
              Sign in
            </Link>
            <p className="text-xs text-fg-2">
              New customer?{" "}
              <Link href="/auth/register" className="link">
                Start here.
              </Link>
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function HomeCard({
  title,
  href,
  linkLabel,
  badge,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-lg font-bold leading-snug text-fg">{title}</h2>
        {badge && <span className="chip chip-brand shrink-0">{badge}</span>}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
      <Link href={href} className="link mt-4 text-sm">
        {linkLabel}
      </Link>
    </div>
  );
}

function Tile({ label, img, href }: { label: string; img: string; href: string }) {
  return (
    <Link href={href} className="group">
      <div className="aspect-square overflow-hidden rounded-md bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      </div>
      <p className="mt-1 line-clamp-1 text-xs text-fg-2 group-hover:text-brand-ink">{label}</p>
    </Link>
  );
}

function QuadCard({
  title,
  href,
  linkLabel,
  badge,
  tiles,
}: {
  title: string;
  href: string;
  linkLabel: string;
  badge?: string;
  tiles: Array<{ label: string; img: string; href: string }>;
}) {
  return (
    <HomeCard title={title} href={href} linkLabel={linkLabel} badge={badge}>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Tile key={t.label} {...t} />
        ))}
      </div>
    </HomeCard>
  );
}

function SingleImageCard({ title, img, href, linkLabel }: { title: string; img: string; href: string; linkLabel: string }) {
  return (
    <HomeCard title={title} href={href} linkLabel={linkLabel}>
      <Link href={href} className="group block flex-1 overflow-hidden rounded-md bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="" loading="lazy" className="h-full max-h-[300px] min-h-[200px] w-full object-cover transition duration-500 group-hover:scale-105" />
      </Link>
    </HomeCard>
  );
}

function DealTile({ product: p }: { product: StoreProduct }) {
  const off = discountPercent(p);
  return (
    <Link href={productHref(p)} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={primaryImage(p)} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {off > 0 && <span className="rounded-sm bg-brand px-1.5 py-0.5 text-xs font-bold text-white">{off}% off</span>}
        <span className="text-xs font-bold text-brand-ink">Limited time deal</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <Price amount={effectivePrice(p)} size="sm" />
        {hasDiscount(p) && <span className="text-xs text-muted line-through">{formatPrice(p.price)}</span>}
      </div>
      <p className="mt-0.5 line-clamp-1 text-[13px] text-fg-2 group-hover:text-brand-ink">{p.name}</p>
    </Link>
  );
}

function Spotlight({ product: p, countdown }: { product: StoreProduct; countdown: string }) {
  const off = discountPercent(p);
  return (
    <section className="card overflow-hidden">
      <div className="grid md:grid-cols-2">
        <Link href={productHref(p)} className="group relative block aspect-[4/3] overflow-hidden bg-surface-2 md:aspect-auto md:min-h-[360px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={primaryImage(p)} alt={p.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
          <span className="chip chip-brand absolute left-4 top-4 uppercase tracking-wider">Featured</span>
        </Link>
        <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-sm bg-brand px-2 py-0.5 text-xs font-bold text-white">Lightning deal</span>
            <span className="flex items-center gap-1 text-fg-2">
              <Clock className="h-4 w-4" /> Ends in <span className="font-mono font-semibold text-fg">{countdown}</span>
            </span>
          </div>
          <h2 className="text-2xl font-bold leading-tight text-fg sm:text-3xl">{p.name}</h2>
          {p.brand && <p className="text-sm text-muted">by {p.brand}</p>}
          <div className="flex flex-wrap items-baseline gap-2">
            {off > 0 && <span className="text-2xl font-light text-brand-ink">-{off}%</span>}
            <Price amount={effectivePrice(p)} size="lg" />
          </div>
          {hasDiscount(p) && (
            <p className="text-sm text-muted">
              M.R.P.: <span className="line-through">{formatPrice(p.price)}</span>
            </p>
          )}
          {p.stock > 0 && p.stock <= 15 && <p className="text-sm font-semibold text-brand-ink">Only {p.stock} left in stock — order soon.</p>}
          <div className="mt-2 flex flex-wrap gap-3">
            <Link href={productHref(p)} className="btn btn-primary btn-lg">
              View deal
            </Link>
            <Link href="/products?onSale=true" className="btn btn-secondary btn-lg">
              More deals
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ShelfSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <ShelfItem key={i}>
          <div className="aspect-square animate-pulse rounded-lg bg-surface-3" />
          <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-surface-3" />
          <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-surface-3" />
        </ShelfItem>
      ))}
    </>
  );
}
