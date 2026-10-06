"use client";

import React from "react";
import { ChartCard, ChartTooltip, labelIndexes, niceScale, useElementWidth, usePointerIndex } from "./ChartCard";

interface OrderDataPoint {
  date: string;
  label: string;
  totalOrders: number;
  delivered: number;
  dispatched: number;
  processing: number;
  cancelled: number;
}

interface OrdersChartProps {
  data: OrderDataPoint[];
  loading?: boolean;
}

const PAD = { left: 32, right: 8, top: 14, bottom: 26 };

/** Stacked daily bars: delivered (solid red) · in transit (red tint) · other open orders (grey) · cancelled (light grey). */
const SERIES = [
  { key: "delivered", label: "Delivered", color: "var(--brand)", opacity: 1 },
  { key: "dispatched", label: "In transit", color: "var(--brand)", opacity: 0.45 },
  { key: "open", label: "Processing / new", color: "var(--muted)", opacity: 0.55 },
  { key: "cancelled", label: "Cancelled", color: "var(--line-strong)", opacity: 1 },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

function segments(d: OrderDataPoint): Record<SeriesKey, number> {
  const open = Math.max(0, d.totalOrders - d.delivered - d.dispatched - d.cancelled);
  return { delivered: d.delivered, dispatched: d.dispatched, open, cancelled: d.cancelled };
}

export default function OrdersChart({ data, loading }: OrdersChartProps) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();

  const totalOrders = data.reduce((s, d) => s + d.totalOrders, 0);
  const height = width < 420 ? 180 : 230;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const { max, step } = niceScale(Math.max(...data.map((d) => d.totalOrders), 0), 4);

  const slot = data.length > 0 ? plotW / data.length : 0;
  const barW = Math.max(3, Math.min(28, slot * 0.62));
  const labels = labelIndexes(data.length, plotW, 56);
  const { active, handlers } = usePointerIndex(data.length, PAD.left, plotW, "slots");
  const activeDay = active !== null ? data[active] : null;

  return (
    <ChartCard
      title="Orders"
      subtitle="Daily orders by status"
      loading={loading}
      empty={!loading && (data.length === 0 || totalOrders === 0)}
      emptyText="No orders placed in this period yet."
      aside={
        <div className="text-right">
          <p className="text-base font-black text-fg">{totalOrders.toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-muted">total orders</p>
        </div>
      }
    >
      <div ref={wrapRef} className="relative w-full touch-pan-y select-none" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible" role="img" aria-label={`Orders chart, ${totalOrders} orders`}>
            {Array.from({ length: Math.round(max / step) + 1 }).map((_, i) => {
              const value = i * step;
              const y = PAD.top + plotH - (value / max) * plotH;
              return (
                <g key={i}>
                  <line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} style={{ stroke: "var(--line)" }} strokeDasharray={i === 0 ? undefined : "3 4"} />
                  <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="11" style={{ fill: "var(--muted)" }}>
                    {Number.isInteger(value) ? value : value.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {data.map((d, i) => {
              const cx = PAD.left + (i + 0.5) * slot;
              const x = cx - barW / 2;
              const seg = segments(d);
              let base = PAD.top + plotH;
              const dim = active !== null && active !== i;
              return (
                <g key={d.date} opacity={dim ? 0.45 : 1} className="transition-opacity duration-150">
                  {active === i && <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={plotH} style={{ fill: "var(--surface-3)" }} opacity={0.6} />}
                  {SERIES.map((s) => {
                    const h = (seg[s.key] / max) * plotH;
                    if (h <= 0) return null;
                    base -= h;
                    return <rect key={s.key} x={x} y={base} width={barW} height={h} style={{ fill: s.color }} fillOpacity={s.opacity} />;
                  })}
                  {labels.has(i) && (
                    <text x={cx} y={height - 6} textAnchor="middle" fontSize="11" style={{ fill: "var(--muted)" }}>
                      {d.label}
                    </text>
                  )}
                </g>
              );
            })}

            <rect x={PAD.left} y={0} width={plotW} height={height} fill="transparent" {...handlers} />
          </svg>
        )}

        {activeDay && active !== null && (
          <ChartTooltip x={PAD.left + (active + 0.5) * slot} containerWidth={width}>
            <p className="font-bold">
              {activeDay.label} · {activeDay.totalOrders} order{activeDay.totalOrders === 1 ? "" : "s"}
            </p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-zinc-300">
              {SERIES.map((s) => (
                <li key={s.key} className="flex justify-between gap-3">
                  <span>{s.label}</span>
                  <span className="font-semibold text-white">{segments(activeDay)[s.key]}</span>
                </li>
              ))}
            </ul>
          </ChartTooltip>
        )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-fg-2">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color, opacity: s.opacity }} />
            {s.label}
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
