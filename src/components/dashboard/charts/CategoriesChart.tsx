"use client";

import React from "react";

interface CategorySalesData {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface CategoriesChartProps {
  data: CategorySalesData[];
}

// Brand red leads; remaining series alternate neutral greys and muted red tints.
// CSS vars adapt to light/dark theme automatically.
const CATEGORY_COLORS = [
  "var(--brand)", // Brand red
  "#71717a", // Zinc 500
  "#f08a8d", // Muted red tint
  "var(--fg-2)", // Adaptive neutral
  "#fbc4c6", // Light red tint
  "#a1a1aa", // Zinc 400
  "var(--brand-ink)", // Deep red
  "var(--line-strong)", // Soft neutral
];

export default function CategoriesChart({ data }: CategoriesChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-muted">
        No category distribution data available.
      </div>
    );
  }

  const activeCategories = data.filter((c) => c.count > 0 || c.revenue > 0);
  const displayCategories = (activeCategories.length > 0 ? activeCategories : data).slice(0, 6);

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-xs border border-line flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3">
        <div>
          <h3 className="text-sm font-bold text-fg">Category Distribution</h3>
          <p className="text-[11px] text-muted">Sales and inventory mix across departments</p>
        </div>
        <span className="text-[10px] font-semibold text-fg-2 bg-surface-3 px-2 py-0.5 rounded-md">
          {displayCategories.length} Categories
        </span>
      </div>

      {/* Proportional Segmented Meter */}
      <div className="my-2 h-4 w-full overflow-hidden rounded-full bg-surface-3 flex">
        {displayCategories.map((cat, idx) => {
          const widthPct = Math.max(4, cat.percentage || 10);
          const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

          return (
            <div
              key={idx}
              className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${widthPct}%`,
                backgroundColor: color,
              }}
              title={`${cat.name}: ${cat.percentage}% (₹${cat.revenue.toLocaleString("en-IN")})`}
            />
          );
        })}
      </div>

      {/* Detailed Category Legend Grid */}
      <div className="grid grid-cols-2 gap-2.5 pt-2">
        {displayCategories.map((cat, idx) => {
          const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

          return (
            <div
              key={idx}
              className="flex items-center justify-between rounded-xl border border-line p-2.5 bg-surface-2"
            >
              <div className="flex items-center gap-2 truncate max-w-[130px]">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-semibold text-fg truncate">
                  {cat.name}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-fg">
                  {cat.percentage}%
                </p>
                <p className="text-[10px] text-muted">
                  {cat.count} product{cat.count !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
