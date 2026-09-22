"use client";

import React, { useState, useEffect } from "react";
import { Users, Search, RefreshCw, Mail, Phone, ShoppingBag, Calendar, CheckCircle2 } from "lucide-react";

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  addressesCount: number;
  ordersCount: number;
  totalSpent: number;
  lastOrderDate: string | null;
  createdAt: string;
}

export default function DashboardCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const fetchCustomers = async (search = query) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/customers?q=${encodeURIComponent(search)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setCustomers(json.data.customers || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(query);
  }, [query]);

  const totalSpentAll = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Customer Accounts Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered buyers, lifetime ordering velocity, and contact details.
          </p>
        </div>

        <button
          onClick={() => fetchCustomers(query)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 transition w-fit"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Registered Customers</span>
            <Users className="h-5 w-5 text-purple-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            {customers.length}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Total verified storefront accounts</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Lifetime Spend</span>
            <ShoppingBag className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            ₹{totalSpentAll.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium">Cumulative customer revenue</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Avg Spend per Customer</span>
            <span className="text-xs font-bold text-blue-600">₹/User</span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            ₹{customers.length > 0 ? Math.round(totalSpentAll / customers.length).toLocaleString("en-IN") : "0"}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Average customer lifetime value (LTV)</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customers by name, email, or phone..."
          className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-purple-500 outline-none"
        />
      </div>

      {/* Customers Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
              <tr>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Contact</th>
                <th className="pb-3">Orders Placed</th>
                <th className="pb-3">Lifetime Spend</th>
                <th className="pb-3">Last Active</th>
                <th className="pb-3">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {customers.length > 0 ? (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold text-xs shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <div className="space-y-0.5">
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{c.phone}</p>
                        <p className="text-[10px] text-slate-400">{c.addressesCount} saved address(es)</p>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className="rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 px-2.5 py-1 font-bold text-xs">
                        {c.ordersCount} order{c.ordersCount !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <p className="font-black text-slate-900 dark:text-white">
                        ₹{c.totalSpent.toLocaleString("en-IN")}
                      </p>
                    </td>
                    <td className="py-3.5 text-slate-500">
                      {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : "Never"}
                    </td>
                    <td className="py-3.5 text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No matching customer accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
