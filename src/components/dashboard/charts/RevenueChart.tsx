"use client";

import React, { useState } from "react";

interface RevenueDataPoint {
  date: string;
  label: string;
  revenue: number;
  totalOrders: number;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-muted">
        No revenue data available for selected period.
      </div>
    );
  }

  const width = 600;
  const height = 220;
  const paddingX = 45;
  const paddingTop = 20;
  const paddingBottom = 35;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1000);
  const roundedMax = Math.ceil(maxRevenue / 1000) * 1000;

  // Calculate coordinates
  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1 || 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.revenue / roundedMax) * chartHeight;
    return { x, y, ...d };
  });

  // Area path
  const linePath = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    paddingTop + chartHeight
  } L ${points[0].x} ${paddingTop + chartHeight} Z`;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-surface p-5 shadow-xs border border-line">
      <div className="flex items-center justify-between pb-3">
        <div>
          <h3 className="text-sm font-bold text-fg">Revenue Velocity</h3>
          <p className="text-[11px] text-muted">Gross sales volume over time</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            ₹{data.reduce((sum, d) => sum + d.revenue, 0).toLocaleString("en-IN")}
          </span>
          <p className="text-[10px] text-muted">Total in timeframe</p>
        </div>
      </div>

      <div className="relative w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--brand)" }} stopOpacity="0.3" />
              <stop offset="100%" style={{ stopColor: "var(--brand)" }} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = paddingTop + chartHeight * (1 - pct);
            const val = Math.round(roundedMax * pct);
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
                  ₹{val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Area under curve */}
          <path d={areaPath} fill="url(#revenueGradient)" />

          {/* Line curve */}
          <path
            d={linePath}
            fill="none"
            style={{ stroke: "var(--brand)" }}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIndex === i ? "5" : "3.5"}
                style={{
                  fill: hoveredIndex === i ? "var(--brand-hover)" : "var(--brand)",
                  stroke: "var(--surface)",
                }}
                strokeWidth="2"
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              {/* X Axis Labels */}
              {(i === 0 ||
                i === Math.floor(points.length / 2) ||
                i === points.length - 1) && (
                <text
                  x={pt.x}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="10"
                  style={{ fill: "var(--muted)" }}
                  className="select-none font-medium"
                >
                  {pt.label}
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="pointer-events-none absolute -top-2 transform -translate-x-1/2 rounded-xl bg-zinc-900 px-3 py-2 text-white shadow-xl ring-1 ring-white/10 text-xs transition-all z-10"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
            }}
          >
            <p className="font-bold">{points[hoveredIndex].label}</p>
            <p className="text-[11px] text-red-300 font-semibold">
              ₹{points[hoveredIndex].revenue.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-zinc-400">
              {points[hoveredIndex].totalOrders} order{points[hoveredIndex].totalOrders !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
