"use client";

import React, { useId } from "react";
import {
  ChartCard,
  ChartTooltip,
  formatInrCompact,
  labelIndexes,
  niceScale,
  useElementWidth,
  usePointerIndex,
} from "./ChartCard";

interface RevenueDataPoint {
  date: string;
  label: string;
  revenue: number;
  totalOrders: number;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
  loading?: boolean;
}

const PAD = { left: 44, right: 12, top: 14, bottom: 26 };

export default function RevenueChart({ data, loading }: RevenueChartProps) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const gradientId = useId();

  const total = data.reduce((sum, d) => sum + d.revenue, 0);
  const orders = data.reduce((sum, d) => sum + d.totalOrders, 0);
  const hasValues = data.some((d) => d.revenue > 0);

  // Taller on wide cards, compact on phones
  const height = width < 420 ? 180 : 230;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const { max, step } = niceScale(Math.max(...data.map((d) => d.revenue), 0));

  const points = data.map((d, i) => ({
    ...d,
    x: PAD.left + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2),
    y: PAD.top + plotH - (d.revenue / max) * plotH,
  }));

  const { active, handlers } = usePointerIndex(points.length, PAD.left, plotW, "points");
  const labels = labelIndexes(points.length, plotW);
  const activePoint = active !== null ? points[active] : null;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area =
    points.length > 0
      ? `${line} L${points[points.length - 1].x.toFixed(1)} ${PAD.top + plotH} L${points[0].x.toFixed(1)} ${PAD.top + plotH} Z`
      : "";

  return (
    <ChartCard
      title="Revenue"
      subtitle="Gross sales per day"
      loading={loading}
      empty={!loading && (data.length === 0 || !hasValues)}
      emptyText="No revenue recorded in this period yet."
      aside={
        <div className="text-right">
          <p className="text-base font-black text-fg">₹{total.toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-muted">
            {orders} order{orders === 1 ? "" : "s"} · {data.length} days
          </p>
        </div>
      }
    >
      <div ref={wrapRef} className="relative w-full touch-pan-y select-none" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible" role="img" aria-label={`Revenue chart, total ₹${total.toLocaleString("en-IN")}`}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: "var(--brand)" }} stopOpacity="0.28" />
                <stop offset="100%" style={{ stopColor: "var(--brand)" }} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Y grid + labels */}
            {Array.from({ length: Math.round(max / step) + 1 }).map((_, i) => {
              const value = i * step;
              const y = PAD.top + plotH - (value / max) * plotH;
              return (
                <g key={i}>
                  <line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} style={{ stroke: "var(--line)" }} strokeDasharray={i === 0 ? undefined : "3 4"} />
                  <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="11" style={{ fill: "var(--muted)" }}>
                    {formatInrCompact(value)}
                  </text>
                </g>
              );
            })}

            <path d={area} fill={`url(#${gradientId})`} />
            <path d={line} fill="none" style={{ stroke: "var(--brand)" }} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Active guide */}
            {activePoint && (
              <line x1={activePoint.x} x2={activePoint.x} y1={PAD.top} y2={PAD.top + plotH} style={{ stroke: "var(--line-strong)" }} strokeDasharray="4 3" />
            )}

            {points.map((p, i) => (
              <circle
                key={p.date}
                cx={p.x}
                cy={p.y}
                r={active === i ? 5.5 : points.length > 20 ? 0 : 3}
                style={{ fill: "var(--brand)", stroke: "var(--surface)" }}
                strokeWidth="2"
                className="transition-[r] duration-150"
              />
            ))}

            {/* X labels */}
            {points.map((p, i) =>
              labels.has(i) ? (
                <text
                  key={`l-${p.date}`}
                  x={p.x}
                  y={height - 6}
                  textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                  fontSize="11"
                  style={{ fill: "var(--muted)" }}
                >
                  {p.label}
                </text>
              ) : null
            )}

            {/* Pointer capture layer */}
            <rect x={PAD.left - 8} y={0} width={plotW + 16} height={height} fill="transparent" {...handlers} />
          </svg>
        )}

        {activePoint && (
          <ChartTooltip x={activePoint.x} containerWidth={width}>
            <p className="font-bold">{activePoint.label}</p>
            <p className="font-semibold text-red-300">₹{activePoint.revenue.toLocaleString("en-IN")}</p>
            <p className="text-[11px] text-zinc-400">
              {activePoint.totalOrders} order{activePoint.totalOrders === 1 ? "" : "s"}
            </p>
          </ChartTooltip>
        )}
      </div>
    </ChartCard>
  );
}
