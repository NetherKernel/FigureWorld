"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Search, RefreshCw, Download, Send, CheckCircle2, ExternalLink, IndianRupee } from "lucide-react";

interface InvoiceRecord {
  _id: string;
  invoiceNumber: string;
  orderNumber: string;
  invoiceDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  grandTotal: number;
  subtotal: number;
  totalTax: number;
  paymentMethod: string;
  paymentStatus: string;
  pdfUrl: string;
  sentAt: string | null;
  status: string;
}

interface InvoicesResponse {
  invoices: InvoiceRecord[];
  metrics: {
    totalInvoices: number;
    totalAmount: number;
    totalTax: number;
  };
}

export default function DashboardInvoicesPage() {
  const [data, setData] = useState<InvoicesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sendingMap, setSendingMap] = useState<Record<string, boolean>>({});

  const fetchInvoices = async (search = query) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/invoices?q=${encodeURIComponent(search)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(query);
  }, [query]);

  const handleSendInvoice = async (invoiceNumber: string) => {
    try {
      setSendingMap((prev) => ({ ...prev, [invoiceNumber]: true }));
      const res = await fetch(`/api/invoices/${invoiceNumber}/send`, { method: "POST" });
      if (res.ok) {
        alert(`Invoice ${invoiceNumber} successfully dispatched to customer email!`);
        fetchInvoices(query);
      } else {
        alert("Failed to send invoice.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingMap((prev) => ({ ...prev, [invoiceNumber]: false }));
    }
  };

  const metrics = data?.metrics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Tax Invoices Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official GST-compliant tax invoices, PDF streaming, and customer dispatch receipts.
          </p>
        </div>

        <button
          onClick={() => fetchInvoices(query)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 transition w-fit"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Generated Invoices</span>
            <FileText className="h-5 w-5 text-purple-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            {metrics ? metrics.totalInvoices : "—"}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Server-side sequential numbering</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Invoiced Amount</span>
            <IndianRupee className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            ₹{metrics ? metrics.totalAmount.toLocaleString("en-IN") : "—"}
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium">Billed customer turnover</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">GST Collected</span>
            <span className="text-xs font-bold text-amber-600">18% GST</span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            ₹{metrics ? Math.round(metrics.totalTax).toLocaleString("en-IN") : "—"}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">CGST + SGST tax pool</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by Invoice # (FW-INV-...), Order #, or Customer name/email..."
          className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-purple-500 outline-none"
        />
      </div>

      {/* Invoices Ledger Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
              <tr>
                <th className="pb-3">Invoice #</th>
                <th className="pb-3">Order #</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Issue Date</th>
                <th className="pb-3">Tax (GST)</th>
                <th className="pb-3">Grand Total</th>
                <th className="pb-3">Payment</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data?.invoices && data.invoices.length > 0 ? (
                data.invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5">
                      <Link
                        href={`/invoices/${inv.invoiceNumber}`}
                        className="font-bold text-purple-600 hover:underline flex items-center gap-1 font-mono"
                      >
                        <span>{inv.invoiceNumber}</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                    <td className="py-3.5">
                      <Link
                        href={`/admin/orders/${inv.orderNumber}`}
                        className="font-semibold text-slate-700 hover:text-purple-600 dark:text-slate-300"
                      >
                        #{inv.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3.5">
                      <p className="font-semibold text-slate-900 dark:text-white">{inv.customerName}</p>
                      <p className="text-[10px] text-slate-400">{inv.customerEmail}</p>
                    </td>
                    <td className="py-3.5 text-slate-500">
                      {new Date(inv.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 text-slate-500">
                      ₹{Math.round(inv.totalTax).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 font-black text-slate-900 dark:text-white">
                      ₹{inv.grandTotal.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 uppercase">
                        {inv.paymentMethod} • {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 text-right space-x-2">
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                        title="Download PDF"
                      >
                        <Download className="h-3 w-3" />
                        <span>PDF</span>
                      </a>
                      <button
                        onClick={() => handleSendInvoice(inv.invoiceNumber)}
                        disabled={sendingMap[inv.invoiceNumber]}
                        className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-950/60 dark:text-purple-300 transition"
                        title="Resend to customer"
                      >
                        <Send className="h-3 w-3" />
                        <span>{sendingMap[inv.invoiceNumber] ? "..." : "Email"}</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No matching invoices found.
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
