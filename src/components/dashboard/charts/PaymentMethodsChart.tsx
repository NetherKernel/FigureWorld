"use client";

import React from "react";

interface PaymentMethodData {
  method: string;
  label: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface PaymentMethodsChartProps {
  data: PaymentMethodData[];
}

export default function PaymentMethodsChart({ data }: PaymentMethodsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-muted">
        No payment data available.
      </div>
    );
  }

  const upiData = data.find((d) => d.method === "UPI") || {
    method: "UPI",
    label: "Direct UPI",
    count: 0,
    revenue: 0,
    percentage: 50,
  };
  const codData = data.find((d) => d.method === "COD") || {
    method: "COD",
    label: "Cash on Delivery",
    count: 0,
    revenue: 0,
    percentage: 50,
  };

  const totalCount = upiData.count + codData.count || 1;
  const upiRatio = upiData.count / totalCount;

  // SVG Donut metrics: Circumference 2 * pi * r
  const r = 50;
  const circumference = 2 * Math.PI * r;
  const upiStrokeDash = upiRatio * circumference;
  const codStrokeDash = circumference - upiStrokeDash;

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-xs border border-line flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h3 className="text-sm font-bold text-fg">Payment Methods Split</h3>
          <p className="text-[11px] text-muted">UPI Digital Intent vs Doorstep COD</p>
        </div>
        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded-md">
          {totalCount} Transactions
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-3">
        {/* SVG Donut */}
        <div className="relative flex items-center justify-center">
          <svg width="140" height="140" viewBox="0 0 140 140" className="rotate-[-90deg]">
            {/* Background ring */}
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="transparent"
              style={{ stroke: "var(--surface-3)" }}
              strokeWidth="16"
            />
            {/* COD Ring */}
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="transparent"
              style={{ stroke: "var(--muted)" }}
              strokeOpacity="0.55"
              strokeWidth="16"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={0}
              strokeLinecap="round"
            />
            {/* UPI Ring (Foreground) */}
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="transparent"
              style={{ stroke: "var(--brand)" }}
              strokeWidth="16"
              strokeDasharray={`${upiStrokeDash} ${circumference}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute text-center">
            <p className="text-xs text-muted font-medium">UPI Share</p>
            <p className="text-base font-black text-fg">
              {Math.round(upiRatio * 100)}%
            </p>
          </div>
        </div>

        {/* Legend stats */}
        <div className="space-y-3 w-full sm:w-auto">
          {/* UPI */}
          <div className="rounded-xl border border-brand/30 bg-brand-soft p-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand" />
              <span className="text-xs font-bold text-brand-ink">
                Direct UPI
              </span>
              <span className="ml-auto text-xs font-black text-brand-ink">
                {upiData.percentage}%
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-brand-ink/80">
              <span>{upiData.count} orders</span>
              <span className="font-semibold">₹{upiData.revenue.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* COD */}
          <div className="rounded-xl border border-line bg-surface-2 p-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-muted opacity-60" />
              <span className="text-xs font-bold text-fg">
                Cash on Delivery
              </span>
              <span className="ml-auto text-xs font-black text-fg-2">
                {codData.percentage}%
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
              <span>{codData.count} orders</span>
              <span className="font-semibold">₹{codData.revenue.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
