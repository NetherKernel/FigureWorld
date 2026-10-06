"use client";

import React from "react";
import { ChartCard, formatInrCompact } from "./ChartCard";

interface CategorySalesData {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface CategoriesChartProps {
  data: CategorySalesData[];
  loading?: boolean;
}

// Brand red leads; remaining series step through red tints and neutrals (theme-aware vars).
const COLORS = [
  { color: "var(--brand)", opacity: 1 },
  { color: "var(--brand)", opacity: 0.6 },
  { color: "var(--brand)", opacity: 0.32 },
  { color: "var(--muted)", opacity: 0.8 },
  { color: "var(--muted)", opacity: 0.5 },
  { color: "var(--line-strong)", opacity: 1 },
];
const MAX_ROWS = 6;

export default function CategoriesChart({ data, loading }: CategoriesChartProps) {
  const active = data.filter((c) => c.revenue > 0 || c.count > 0);
  const sorted = [...(active.length ? active : data)].sort((a, b) => b.revenue - a.revenue || b.count - a.count);

  // Fold the long tail into "Other" so the bar and legend stay readable
  const shown = sorted.slice(0, MAX_ROWS - 1);
  const rest = sorted.slice(MAX_ROWS - 1);
  if (rest.length === 1) shown.push(rest[0]);
  else if (rest.length > 1) {
    shown.push({
      name: `Other (${rest.length})`,
      count: rest.reduce((s, c) => s + c.count, 0),
      revenue: rest.reduce((s, c) => s + c.revenue, 0),
      percentage: rest.reduce((s, c) => s + c.percentage, 0),
    });
  }

  const totalRevenue = shown.reduce((s, c) => s + c.revenue, 0);
  const share = (c: CategorySalesData) => (totalRevenue > 0 ? (c.revenue / totalRevenue) * 100 : 0);

  return (
    <ChartCard
      title="Sales by category"
      subtitle="Revenue share per department"
      loading={loading}
      empty={!loading && (data.length === 0 || totalRevenue === 0)}
      emptyText="No category sales in this period yet."
      aside={<span className="chip chip-neutral">{formatInrCompact(totalRevenue)}</span>}
    >
      {/* Segmented share bar — segments always add up to 100% */}
      <div className="flex h-3.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-3" role="img" aria-label="Revenue share by category">
        {shown.map((cat, i) =>
          share(cat) > 0 ? (
            <div
              key={cat.name}
              className="h-full transition-[width] duration-500 first:rounded-l-full last:rounded-r-full"
              style={{ width: `${share(cat)}%`, backgroundColor: COLORS[i % COLORS.length].color, opacity: COLORS[i % COLORS.length].opacity }}
              title={`${cat.name}: ${Math.round(share(cat))}%`}
            />
          ) : null
        )}
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-x-4 gap-y-1 @sm:grid-cols-2">
        {shown.map((cat, i) => (
          <li key={cat.name} className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1.5 text-xs hover:bg-surface-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length].color, opacity: COLORS[i % COLORS.length].opacity }} />
            <span className="min-w-0 flex-1 truncate font-medium text-fg" title={cat.name}>
              {cat.name}
            </span>
            <span className="shrink-0 text-muted">{formatInrCompact(cat.revenue)}</span>
            <span className="w-9 shrink-0 text-right font-bold text-fg">{Math.round(share(cat))}%</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
