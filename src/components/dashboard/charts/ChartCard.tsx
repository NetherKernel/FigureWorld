"use client";

import React, { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Right-aligned summary (total, badge, legend) */
  aside?: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyText?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Shared shell for dashboard charts. It is a CSS container (`@container`), so the
 * charts inside adapt to the card's own width rather than the viewport — the same
 * chart works in a full-width row, a half column or next to the sidebar.
 */
export function ChartCard({ title, subtitle, aside, loading, empty, emptyText, className = "", children }: ChartCardProps) {
  return (
    <section className={`@container flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5 ${className}`}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-fg">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {aside && !loading && <div className="shrink-0">{aside}</div>}
      </header>

      {loading ? (
        <div className="flex-1 space-y-3" aria-busy="true" aria-label={`Loading ${title}`}>
          <div className="h-40 animate-pulse rounded-xl bg-surface-3 @md:h-52" />
          <div className="flex gap-3">
            <div className="h-3 w-1/4 animate-pulse rounded bg-surface-3" />
            <div className="h-3 w-1/5 animate-pulse rounded bg-surface-3" />
          </div>
        </div>
      ) : empty ? (
        <div className="flex min-h-40 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line py-8 text-center">
          <BarChart3 className="h-7 w-7 text-muted" strokeWidth={1.5} />
          <p className="max-w-[240px] text-xs text-muted">{emptyText || "No data for this period yet."}</p>
        </div>
      ) : (
        <div className="min-w-0 flex-1">{children}</div>
      )}
    </section>
  );
}

/** Measures an element's content width so SVG charts can draw at real pixel size. */
export function useElementWidth<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!node) return;
    // ResizeObserver reports the initial size right after observe(), then every change
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return [setNode, width] as const;
}

/** Tooltip positioned at an x offset inside its chart, clamped so it never leaves the card. */
export function ChartTooltip({ x, containerWidth, children }: { x: number; containerWidth: number; children: React.ReactNode }) {
  const half = 80;
  const left = Math.min(Math.max(x, half), Math.max(half, containerWidth - half));
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-0 z-10 w-max max-w-[160px] -translate-x-1/2 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white shadow-xl ring-1 ring-white/10"
      style={{ left }}
    >
      {children}
    </div>
  );
}

/** ₹950 · ₹1.2k · ₹3.4L · ₹1.1Cr */
export function formatInrCompact(value: number): string {
  const abs = Math.abs(value);
  const trim = (n: number) => (n >= 10 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, ""));
  if (abs >= 1e7) return `₹${trim(value / 1e7)}Cr`;
  if (abs >= 1e5) return `₹${trim(value / 1e5)}L`;
  if (abs >= 1e3) return `₹${trim(value / 1e3)}k`;
  return `₹${Math.round(value)}`;
}

/** A "nice" axis maximum and step (1, 2, 2.5, 5 × 10^n) for `ticks` intervals. */
export function niceScale(max: number, ticks = 4) {
  const safeMax = max > 0 ? max : 1;
  const raw = safeMax / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return { max: step * ticks, step };
}

/** Indexes of x-axis labels that fit in the available width (always includes first and last). */
export function labelIndexes(count: number, plotWidth: number, minGap = 64): Set<number> {
  if (count <= 0) return new Set();
  const fit = Math.max(2, Math.floor(plotWidth / minGap));
  const every = Math.max(1, Math.ceil((count - 1) / (fit - 1)));
  const result = new Set<number>();
  for (let i = 0; i < count; i += every) result.add(i);
  // Avoid the last label colliding with the previous one
  const last = count - 1;
  const prev = last - (last % every);
  if (prev !== last && last - prev < every / 2) result.delete(prev);
  result.add(last);
  return result;
}

/**
 * Shared pointer handling: hover with a mouse, tap/drag with touch. Returns the active index.
 * "slots" = bar charts (n equal columns); "points" = line charts (n points from edge to edge).
 */
export function usePointerIndex(count: number, plotLeft: number, plotWidth: number, mode: "slots" | "points" = "slots") {
  const [active, setActive] = useState<number | null>(null);

  const pick = (e: React.PointerEvent<SVGElement>) => {
    if (count === 0 || plotWidth <= 0) return;
    const svg = e.currentTarget.ownerSVGElement ?? (e.currentTarget as unknown as SVGSVGElement);
    const x = e.clientX - svg.getBoundingClientRect().left - plotLeft;
    const index =
      mode === "slots" ? Math.floor(x / (plotWidth / count)) : Math.round((x / plotWidth) * Math.max(1, count - 1));
    setActive(Math.min(count - 1, Math.max(0, index)));
  };

  return {
    active,
    clear: () => setActive(null),
    handlers: {
      onPointerMove: pick,
      onPointerDown: pick,
      onPointerLeave: (e: React.PointerEvent<SVGElement>) => {
        if (e.pointerType === "mouse") setActive(null);
      },
    },
  };
}
