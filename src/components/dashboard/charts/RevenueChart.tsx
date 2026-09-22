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
      <div className="flex h-64 items-center justify-center text-xs text-slate-400">
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
    <div className="relative w-full overflow-hidden rounded-2xl bg-white p-5 shadow-xs border border-slate-100 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Revenue Velocity</h3>
          <p className="text-[11px] text-slate-500">Gross sales volume over time</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            ₹{data.reduce((sum, d) => sum + d.revenue, 0).toLocaleString("en-IN")}
          </span>
          <p className="text-[10px] text-slate-400">Total in timeframe</p>
        </div>
      </div>

      <div className="relative w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
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
            stroke="#8b5cf6"
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
                fill={hoveredIndex === i ? "#7c3aed" : "#8b5cf6"}
                stroke="#ffffff"
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
                  fill="#94a3b8"
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
            className="pointer-events-none absolute -top-2 transform -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-white shadow-xl dark:bg-white dark:text-slate-900 text-xs transition-all z-10"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
            }}
          >
            <p className="font-bold">{points[hoveredIndex].label}</p>
            <p className="text-[11px] text-purple-300 dark:text-purple-600 font-semibold">
              ₹{points[hoveredIndex].revenue.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-slate-400">
              {points[hoveredIndex].totalOrders} order{points[hoveredIndex].totalOrders !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
