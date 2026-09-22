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
      <div className="flex h-64 items-center justify-center text-xs text-slate-400">
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
    <div className="relative w-full overflow-hidden rounded-2xl bg-white p-5 shadow-xs border border-slate-100 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Order Volume</h3>
          <p className="text-[11px] text-slate-500">Daily throughput across lifecycle stages</p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" /> Total
          </span>
          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Delivered
          </span>
          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Processing
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
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                  className="dark:stroke-slate-800"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#94a3b8"
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
                  fill={isHovered ? "#2563eb" : "#3b82f6"}
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
                    fill="#10b981"
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
                    fill="#94a3b8"
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
            className="pointer-events-none absolute -top-3 transform -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-white shadow-xl dark:bg-white dark:text-slate-900 text-xs transition-all z-10 space-y-0.5"
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
            <p className="text-[11px] text-blue-400 dark:text-blue-600 font-semibold">
              Total: {data[hoveredIndex].totalOrders}
            </p>
            <div className="text-[10px] text-slate-300 dark:text-slate-600 flex gap-2">
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
