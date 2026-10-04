"use client";

import React, { useState } from "react";

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
}

export default function OrdersChart({ data }: OrdersChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-muted">
        No orders data available for selected period.
      </div>
    );
  }

  const width = 600;
  const height = 220;
  const paddingX = 40;
  const paddingTop = 20;
  const paddingBottom = 35;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxOrders = Math.max(...data.map((d) => d.totalOrders), 5);
  const barWidth = Math.max(8, Math.min(24, (chartWidth / data.length) * 0.55));

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-surface p-5 shadow-xs border border-line">
      <div className="flex items-center justify-between pb-3">
        <div>
          <h3 className="text-sm font-bold text-fg">Order Volume</h3>
          <p className="text-[11px] text-muted">Daily throughput across lifecycle stages</p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-muted">
            <span className="h-2 w-2 rounded-full bg-brand inline-block" /> Total
          </span>
          <span className="flex items-center gap-1 text-muted">
            <span className="h-2 w-2 rounded-full bg-fg-2 opacity-50 inline-block" /> Delivered
          </span>
        </div>
      </div>

      <div className="relative w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
          {/* Horizontal Gridlines */}
          {[0, 0.5, 1].map((pct) => {
            const y = paddingTop + chartHeight * (1 - pct);
            const val = Math.round(maxOrders * pct);
            return (
              <g key={pct}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  style={{ stroke: "var(--line)" }}
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  style={{ fill: "var(--muted)" }}
                  className="select-none"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const x = paddingX + (i + 0.5) * (chartWidth / data.length) - barWidth / 2;
            const h = (d.totalOrders / maxOrders) * chartHeight;
            const y = paddingTop + chartHeight - h;

            const isHovered = hoveredIndex === i;

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(h, 2)}
                  rx="3"
                  style={{ fill: isHovered ? "var(--brand-hover)" : "var(--brand)" }}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Delivered sub-indicator if any */}
                {d.delivered > 0 && (
                  <rect
                    x={x}
                    y={paddingTop + chartHeight - (d.delivered / maxOrders) * chartHeight}
                    width={barWidth}
                    height={(d.delivered / maxOrders) * chartHeight}
                    rx="3"
                    style={{ fill: "var(--fg-2)" }}
                    fillOpacity="0.45"
                    className="pointer-events-none"
                  />
                )}

                {/* X Axis Labels */}
                {(i === 0 ||
                  i === Math.floor(data.length / 2) ||
                  i === data.length - 1) && (
                  <text
                    x={x + barWidth / 2}
                    y={height - 10}
                    textAnchor="middle"
                    fontSize="10"
                    style={{ fill: "var(--muted)" }}
                    className="select-none font-medium"
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            className="pointer-events-none absolute -top-3 transform -translate-x-1/2 rounded-xl bg-zinc-900 px-3 py-2 text-white shadow-xl ring-1 ring-white/10 text-xs transition-all z-10 space-y-0.5"
            style={{
              left: `${
                ((paddingX +
                  (hoveredIndex + 0.5) * (chartWidth / data.length)) /
                  width) *
                100
              }%`,
            }}
          >
            <p className="font-bold">{data[hoveredIndex].label}</p>
            <p className="text-[11px] text-red-300 font-semibold">
              Total: {data[hoveredIndex].totalOrders}
            </p>
            <div className="text-[10px] text-zinc-300 flex gap-2">
              <span>Delivered: {data[hoveredIndex].delivered}</span>
              <span>Dispatched: {data[hoveredIndex].dispatched}</span>
              <span>Processing: {data[hoveredIndex].processing}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
