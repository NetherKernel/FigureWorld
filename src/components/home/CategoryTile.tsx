"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { primaryImage, type StoreProduct } from "@/lib/product-view";

interface Frame {
  src: string;
  label: string;
}

interface CategoryPreview {
  frames: Frame[];
  total: number | null;
}

/** How long each product photo stays up while a tile is playing */
const FRAME_MS = 1400;

const previewCache = new Map<string, Promise<CategoryPreview>>();

/** "/products?category=keychains" -> "category=keychains" (subcategory links work too) */
function categoryQuery(href: string): string | null {
  try {
    const url = new URL(href, "http://local");
    if (url.pathname !== "/products") return null;
    for (const key of ["subcategory", "category"]) {
      const value = url.searchParams.get(key);
      if (value) return `${key}=${encodeURIComponent(value)}`;
    }
  } catch {
    // not a parsable link — tile simply won't play
  }
  return null;
}

/** Loads (once per category) a few real product photos to cycle through on hover. */
function loadPreview(href: string): Promise<CategoryPreview> {
  const query = categoryQuery(href);
  if (!query) return Promise.resolve({ frames: [], total: null });
  let pending = previewCache.get(query);
  if (!pending) {
    pending = fetch(`/api/products?${query}&limit=8`)
      .then((res) => res.json())
      .then((json) => {
        const products: StoreProduct[] = json?.data?.products || [];
        const seen = new Set<string>();
        const frames = products
          .filter((p) => p.stock > 0)
          .map((p) => ({ src: primaryImage(p), label: p.name }))
          .filter((f) => f.src && !seen.has(f.src) && seen.add(f.src))
          .slice(0, 6);
        return { frames, total: typeof json?.meta?.total === "number" ? json.meta.total : products.length };
      })
      .catch(() => {
        previewCache.delete(query);
        return { frames: [], total: null };
      });
    previewCache.set(query, pending);
  }
  return pending;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface CategoryTileProps {
  name: string;
  image: string;
  href: string;
  index: number;
}

/**
 * Top-categories tile. On hover (or when scrolled into view on touch screens) it
 * plays a slideshow of real products from that category, tilts towards the cursor
 * with a light glare, and lights up a rotating brand-red border.
 */
export function CategoryTile({ name, image, href, index }: CategoryTileProps) {
  const tileRef = useRef<HTMLAnchorElement>(null);
  const [preview, setPreview] = useState<CategoryPreview | null>(null);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const [ready, setReady] = useState<ReadonlySet<string>>(() => new Set());

  const frames = useMemo<Frame[]>(
    () => [{ src: image, label: name }, ...(preview?.frames || []).filter((f) => f.src !== image)],
    [image, name, preview]
  );
  // Only cycle through photos that have finished loading, so a slow image never shows a blank frame
  const playable = useMemo(() => frames.filter((f, n) => n === 0 || ready.has(f.src)), [frames, ready]);
  const playableCount = useRef(playable.length);
  useEffect(() => {
    playableCount.current = playable.length;
  }, [playable.length]);
  const markReady = (src: string) => setReady((prev) => (prev.has(src) ? prev : new Set(prev).add(src)));

  const start = useCallback(() => {
    setPlaying(true);
    loadPreview(href).then(setPreview);
  }, [href]);

  const stop = useCallback(() => {
    setPlaying(false);
    setFrame(0);
    const el = tileRef.current;
    if (el) {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    }
  }, []);

  // Advance through the product photos while playing
  useEffect(() => {
    if (!playing) return;
    const advance = () => setFrame((n) => (playableCount.current > 1 ? (n + 1) % playableCount.current : 0));
    const first = window.setTimeout(advance, 350);
    const timer = window.setInterval(advance, FRAME_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [playing]);

  // Touch screens have no hover: play while the tile is in view instead
  useEffect(() => {
    const el = tileRef.current;
    if (!el || !window.matchMedia("(hover: none)").matches || prefersReducedMotion()) return;
    const observer = new IntersectionObserver(
      ([entry]) => (entry.intersectionRatio >= 0.75 ? start() : stop()),
      { threshold: [0, 0.75] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [start, stop]);

  const onPointerMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== "mouse" || prefersReducedMotion()) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * 14}deg`);
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
  };

  const current = playable[frame] || playable[0];
  const showProgress = playing && playable.length > 1;

  return (
    <Link
      ref={tileRef}
      href={href}
      data-playing={playing || undefined}
      onPointerEnter={(e) => e.pointerType === "mouse" && start()}
      onPointerLeave={(e) => e.pointerType === "mouse" && stop()}
      onPointerMove={onPointerMove}
      onFocus={start}
      onBlur={stop}
      className="cat-tile group block animate-fade-up rounded-2xl"
      style={{ animationDelay: `${Math.min(index, 10) * 55}ms` }}
    >
      <div className="cat-tile__inner relative flex h-full flex-col rounded-2xl border border-line/70 bg-surface p-2 sm:p-2.5">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface-2">
          {frames.map((f, n) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={f.src}
              src={f.src}
              alt={n === 0 ? name : ""}
              aria-hidden={n === 0 ? undefined : true}
              // Slides only exist once a tile starts playing, so fetch them right away
              loading={n === 0 ? "lazy" : "eager"}
              decoding="async"
              onLoad={() => n > 0 && markReady(f.src)}
              className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 ease-out ${
                f.src === current.src ? "opacity-100" : "opacity-0"
              } ${f.src === current.src && playing ? "cat-tile__kenburns" : ""}`}
            />
          ))}

          {/* Story-style progress, one segment per photo */}
          {showProgress && (
            <div className="absolute inset-x-2 top-2 z-10 flex gap-1" aria-hidden="true">
              {playable.map((f, n) => (
                <span key={f.src} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30 backdrop-blur">
                  <span
                    key={n === frame ? `on-${frame}` : "off"}
                    className={`block h-full origin-left rounded-full bg-white ${
                      n < frame ? "scale-x-100" : n === frame ? "" : "scale-x-0"
                    }`}
                    style={n === frame ? { animation: `grow-x ${frame === 0 ? 350 : FRAME_MS}ms linear both` } : undefined}
                  />
                </span>
              ))}
            </div>
          )}

          <span className="cat-tile__glare pointer-events-none absolute inset-0 z-10" aria-hidden="true" />

          {/* Caption: which product is showing + how many are in the category */}
          <div className="absolute inset-x-0 bottom-0 z-10 translate-y-full bg-gradient-to-t from-black/85 via-black/45 to-transparent px-2.5 pb-2 pt-8 transition-transform duration-300 ease-out group-hover:translate-y-0 group-data-[playing]:translate-y-0">
            <p key={frame} className="animate-fade-up truncate text-[11px] font-semibold leading-tight text-white">
              {frame === 0 ? "Explore the collection" : current.label}
            </p>
            {preview?.total ? (
              <p className="mt-0.5 text-[10px] font-medium text-white/70">
                {preview.total} {preview.total === 1 ? "item" : "items"}
              </p>
            ) : null}
          </div>
        </div>

        <span className="mt-2.5 flex items-center justify-center gap-1 text-center text-xs font-extrabold uppercase tracking-wide text-fg transition-colors group-hover:text-brand sm:mt-3 sm:text-sm">
          {name}
          <ArrowUpRight
            className="h-3.5 w-3.5 shrink-0 -translate-x-1 translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}
