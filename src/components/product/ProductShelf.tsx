"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

interface ProductShelfProps {
  title: string;
  /** Small uppercase label above the title, e.g. "Just landed" */
  eyebrow?: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  /** Optional element shown beside the title (badge, timer…) */
  aside?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}

/** Horizontally scrolling product row with snap scrolling and floating arrows. */
export function ProductShelf({ title, eyebrow, seeAllHref, seeAllLabel = "See all", aside, children, id }: ProductShelfProps) {
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

  const arrow =
    "absolute top-[38%] z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/95 text-fg shadow-pop backdrop-blur transition hover:scale-105 hover:border-line-strong sm:flex md:opacity-0 md:group-hover/shelf:opacity-100 md:focus-visible:opacity-100";

  return (
    <section id={id} className="card scroll-mt-32 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="section-title">{title}</h2>
            {aside}
          </div>
        </div>
        {seeAllHref && (
          <Link href={seeAllHref} className="btn btn-secondary btn-sm group/see shrink-0">
            {seeAllLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/see:translate-x-0.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="group/shelf relative">
        <div
          ref={rowRef}
          onScroll={updateArrows}
          className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-1 pb-2 pt-1 sm:gap-4"
        >
          {children}
        </div>

        {canLeft && (
          <button type="button" onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`} className={`${arrow} -left-2`}>
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {canRight && (
          <button type="button" onClick={() => scroll(1)} aria-label={`Scroll ${title} right`} className={`${arrow} -right-2`}>
            <ChevronRight className="h-5 w-5" />
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
