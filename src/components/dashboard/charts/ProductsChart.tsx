"use client";

import React from "react";
import { ChartCard, formatInrCompact } from "./ChartCard";

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
  loading?: boolean;
}

export default function ProductsChart({ data, loading }: ProductsChartProps) {
  const top = data.filter((p) => p.revenue > 0 || p.unitsSold > 0).slice(0, 5);
  const maxRevenue = Math.max(...top.map((p) => p.revenue), 1);

  return (
    <ChartCard
      title="Top products"
      subtitle="Ranked by revenue"
      loading={loading}
      empty={!loading && top.length === 0}
      emptyText="No products sold in this period yet."
      aside={<span className="chip chip-soft">Top {top.length}</span>}
    >
      <ol className="space-y-3.5">
        {top.map((item, idx) => {
          const pct = Math.max(4, Math.round((item.revenue / maxRevenue) * 100));
          const low = item.stock <= 5;
          return (
            <li key={item.sku} className="min-w-0">
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-black ${
                    idx === 0 ? "bg-brand text-white" : "bg-surface-3 text-fg-2"
                  }`}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-xs font-semibold text-fg" title={item.title}>
                      {item.title}
                    </p>
                    <span className="shrink-0 text-xs font-bold text-fg" title={`₹${item.revenue.toLocaleString("en-IN")}`}>
                      {formatInrCompact(item.revenue)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%`, opacity: 1 - idx * 0.12 }} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-[11px] text-muted">
                    <span>
                      {item.unitsSold} sold<span className="hidden @xs:inline"> · {item.sku}</span>
                    </span>
                    <span className={low ? "font-semibold text-warn" : "text-success"}>
                      {item.stock === 0 ? "Out of stock" : `${item.stock} in stock`}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </ChartCard>
  );
}
