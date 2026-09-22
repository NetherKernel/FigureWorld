"use client";

import React from "react";

interface ProductSalesData {
  title: string;
  sku: string;
  unitsSold: number;
  revenue: number;
  stock: number;
  categoryName: string;
}

interface ProductsChartProps {
  data: ProductSalesData[];
}

export default function ProductsChart({ data }: ProductsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-slate-400">
        No product sales recorded yet.
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((p) => p.revenue), 1000);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-xs border border-slate-100 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Performing Figures</h3>
          <p className="text-[11px] text-slate-500">Ranked by revenue contribution</p>
        </div>
        <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-300 px-2 py-0.5 rounded-md">
          {data.length} Ranked
        </span>
      </div>

      <div className="space-y-3.5 pt-1">
        {data.slice(0, 5).map((item, idx) => {
          const pct = Math.max(5, Math.round((item.revenue / maxRevenue) * 100));

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate max-w-[260px]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate">
                    {item.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-slate-500">
                    {item.unitsSold} sold
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹{item.revenue.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Sub-meta */}
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>SKU: {item.sku}</span>
                <span
                  className={
                    item.stock <= 5
                      ? "text-amber-500 font-semibold"
                      : "text-emerald-500"
                  }
                >
                  {item.stock} in stock
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
