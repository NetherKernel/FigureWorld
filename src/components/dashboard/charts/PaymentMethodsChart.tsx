"use client";

import React from "react";
import { ChartCard, formatInrCompact } from "./ChartCard";

interface PaymentMethodData {
  method: string;
  label: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface PaymentMethodsChartProps {
  data: PaymentMethodData[];
  loading?: boolean;
}

const METHODS = [
  { method: "UPI", label: "UPI", color: "var(--brand)", opacity: 1 },
  { method: "COD", label: "Cash on Delivery", color: "var(--muted)", opacity: 0.6 },
];

export default function PaymentMethodsChart({ data, loading }: PaymentMethodsChartProps) {
  const rows = METHODS.map((m) => {
    const found = data.find((d) => d.method === m.method);
    return { ...m, count: found?.count ?? 0, revenue: found?.revenue ?? 0 };
  });
  const total = rows.reduce((s, r) => s + r.count, 0);

  // Donut geometry (scales with the SVG box via viewBox)
  const r = 42;
  const c = 2 * Math.PI * r;
  const gap = total > 0 && rows.every((row) => row.count > 0) ? 3 : 0;
  const lengths = rows.map((row) => (total > 0 ? (row.count / total) * c : 0));
  const offsets = lengths.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0));

  return (
    <ChartCard
      title="Payment methods"
      subtitle="Share of orders by payment type"
      loading={loading}
      empty={!loading && total === 0}
      emptyText="No payments recorded in this period yet."
      aside={<span className="chip chip-neutral">{total} orders</span>}
    >
      <div className="flex flex-col items-center gap-5 @sm:flex-row @sm:items-center">
        <div className="relative w-32 shrink-0 @sm:w-36">
          <svg viewBox="0 0 100 100" className="block w-full -rotate-90" role="img" aria-label="Payment methods split">
            <circle cx="50" cy="50" r={r} fill="none" style={{ stroke: "var(--surface-3)" }} strokeWidth="12" />
            {rows.map((row, i) => {
              const seg = Math.max(0, lengths[i] - gap);
              return (
                <circle
                  key={row.method}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  style={{ stroke: row.color }}
                  strokeOpacity={row.opacity}
                  strokeWidth="12"
                  strokeDasharray={`${seg} ${c - seg}`}
                  strokeDashoffset={-offsets[i]}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-fg">{total > 0 ? Math.round((rows[0].count / total) * 100) : 0}%</span>
            <span className="text-[11px] text-muted">UPI</span>
          </div>
        </div>

        <ul className="w-full min-w-0 flex-1 space-y-2.5">
          {rows.map((row) => {
            const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
            return (
              <li key={row.method} className="rounded-xl border border-line bg-surface-2 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color, opacity: row.opacity }} />
                  <span className="truncate text-xs font-bold text-fg">{row.label}</span>
                  <span className="ml-auto text-sm font-black text-fg">{pct}%</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted">
                  <span>
                    {row.count} order{row.count === 1 ? "" : "s"}
                  </span>
                  <span className="font-semibold text-fg-2" title={`₹${row.revenue.toLocaleString("en-IN")}`}>
                    {formatInrCompact(row.revenue)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </ChartCard>
  );
}
