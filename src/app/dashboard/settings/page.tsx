"use client";

import React, { useState, useEffect } from "react";
import { Settings, Save, CheckCircle2, AlertCircle, RefreshCw, Shield, Store, CreditCard, Bell, Truck } from "lucide-react";

interface StoreSettings {
  storeName: string;
  legalEntity: string;
  gstin: string;
  pan: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  merchantUpiId: string;
  freeShippingThreshold: number;
  flatShippingRate: number;
  codMaxLimit: number;
  whatsappNumber: string;
  autoWhatsAppNotifications: boolean;
  autoEmailNotifications: boolean;
  inventoryLowStockThreshold: number;
}

export default function DashboardSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setSettings(json.data.settings);
        }
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({ type: "success", text: "Store configuration updated successfully!" });
        setSettings(json.data.settings);
      } else {
        setFeedback({ type: "error", text: json.error?.message || "Failed to update settings." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Network error while saving." });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-slate-400">
        Loading system configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Store & System Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Brand identity, GST tax compliance, UPI credentials, and automated notification toggles.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 transition w-fit"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Reload</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Section 1: Store & Entity Identity */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 dark:border-slate-800">
            <Store className="h-4 w-4 text-purple-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Brand & Business Identity
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Storefront Name
              </label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Legal Registered Entity
              </label>
              <input
                type="text"
                value={settings.legalEntity}
                onChange={(e) => setSettings({ ...settings, legalEntity: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Registered Physical Address
            </label>
            <textarea
              rows={2}
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Customer Support Email
              </label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Support Helpline Phone
              </label>
              <input
                type="text"
                value={settings.supportPhone}
                onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Tax & Legal Compliance */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 dark:border-slate-800">
            <Shield className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Tax & GST Compliance
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                GSTIN (15-Character Tax Identifier)
              </label>
              <input
                type="text"
                maxLength={15}
                value={settings.gstin}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                PAN (Permanent Account Number)
              </label>
              <input
                type="text"
                maxLength={10}
                value={settings.pan}
                onChange={(e) => setSettings({ ...settings, pan: e.target.value.toUpperCase() })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono uppercase"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Payments & Shipping Policies */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 dark:border-slate-800">
            <CreditCard className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Payment Gateways & Shipping Policies
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Merchant UPI ID (VPA for Intent QR)
              </label>
              <input
                type="text"
                value={settings.merchantUpiId}
                onChange={(e) => setSettings({ ...settings, merchantUpiId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cash on Delivery (COD) Max Ceiling (₹)
              </label>
              <input
                type="number"
                value={settings.codMaxLimit}
                onChange={(e) => setSettings({ ...settings, codMaxLimit: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Free Shipping Cart Threshold (₹)
              </label>
              <input
                type="number"
                value={settings.freeShippingThreshold}
                onChange={(e) => setSettings({ ...settings, freeShippingThreshold: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Flat Standard Delivery Fee (₹)
              </label>
              <input
                type="number"
                value={settings.flatShippingRate}
                onChange={(e) => setSettings({ ...settings, flatShippingRate: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Automated Communications & Inventory */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 dark:border-slate-800">
            <Bell className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Automated Alerts & Warehouse Safeguards
            </h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoWhatsAppNotifications}
                onChange={(e) => setSettings({ ...settings, autoWhatsAppNotifications: e.target.checked })}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Auto WhatsApp Customer Notifications
                </p>
                <p className="text-[11px] text-slate-500">
                  Automatically send order confirmations, invoice documents, dispatch AWB codes, and delivery notices.
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoEmailNotifications}
                onChange={(e) => setSettings({ ...settings, autoEmailNotifications: e.target.checked })}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Auto Email Invoicing & Receipts
                </p>
                <p className="text-[11px] text-slate-500">
                  Email PDF tax invoices to buyers upon order confirmation.
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Low Stock Alarm Threshold (Units)
            </label>
            <input
              type="number"
              min="1"
              value={settings.inventoryLowStockThreshold}
              onChange={(e) => setSettings({ ...settings, inventoryLowStockThreshold: parseInt(e.target.value) || 5 })}
              className="w-48 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-2xl bg-purple-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-purple-500 shadow-md shadow-purple-600/30 transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving Configuration..." : "Save Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
