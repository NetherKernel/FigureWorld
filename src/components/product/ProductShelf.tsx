"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductShelfProps {
  title: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  /** Optional element shown beside the title (badge, timer…) */
  aside?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}

/** Amazon-style horizontally scrolling row with hover arrows and snap scrolling. */
export function ProductShelf({ title, seeAllHref, seeAllLabel = "See all", aside, children, id }: ProductShelfProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = rowRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateArrows, children]);

  const scroll = (dir: -1 | 1) => {
    const el = rowRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section id={id} className="card scroll-mt-32 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="section-title">{title}</h2>
        {aside}
        {seeAllHref && (
          <Link href={seeAllHref} className="link text-sm">
            {seeAllLabel}
          </Link>
        )}
      </div>

      <div className="group/shelf relative">
        <div
          ref={rowRef}
          onScroll={updateArrows}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 sm:gap-4"
        >
          {children}
        </div>

        {canLeft && (
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={`Scroll ${title} left`}
            className="absolute left-0 top-1/2 z-10 hidden h-24 w-11 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-line bg-surface/95 text-fg shadow-pop transition hover:bg-surface sm:flex md:opacity-0 md:group-hover/shelf:opacity-100"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
        )}
        {canRight && (
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={`Scroll ${title} right`}
            className="absolute right-0 top-1/2 z-10 hidden h-24 w-11 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-line bg-surface/95 text-fg shadow-pop transition hover:bg-surface sm:flex md:opacity-0 md:group-hover/shelf:opacity-100"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        )}
      </div>
    </section>
  );
}

/** Fixed-width snap item for use inside ProductShelf */
export function ShelfItem({ children }: { children: React.ReactNode }) {
  return <div className="w-[46%] shrink-0 snap-start sm:w-[220px] lg:w-[232px]">{children}</div>;
}

export default ProductShelf;
