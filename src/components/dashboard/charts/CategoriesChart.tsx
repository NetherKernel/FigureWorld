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

const CATEGORY_COLORS = [
  "#8b5cf6", // Purple
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#64748b", // Slate
];

export default function CategoriesChart({ data }: CategoriesChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-slate-400">
        No category distribution data available.
      </div>
    );
  }

  const activeCategories = data.filter((c) => c.count > 0 || c.revenue > 0);
  const displayCategories = (activeCategories.length > 0 ? activeCategories : data).slice(0, 6);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-xs border border-slate-100 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Category Distribution</h3>
          <p className="text-[11px] text-slate-500">Sales and inventory mix across departments</p>
        </div>
        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300 px-2 py-0.5 rounded-md">
          {displayCategories.length} Categories
        </span>
      </div>

      {/* Proportional Segmented Meter */}
      <div className="my-2 h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 flex">
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
              className="flex items-center justify-between rounded-xl border border-slate-50 p-2.5 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30"
            >
              <div className="flex items-center gap-2 truncate max-w-[130px]">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {cat.name}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {cat.percentage}%
                </p>
                <p className="text-[10px] text-slate-400">
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
