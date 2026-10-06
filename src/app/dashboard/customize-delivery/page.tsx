"use client";

import React, { useState, useEffect } from "react";
import {
  SlidersHorizontal,
  Truck,
  MapPin,
  Search,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  DollarSign,
  Package,
  Bike,
  Navigation,
  Clock,
  QrCode,
  ShieldCheck,
  User,
  Phone,
  Scale,
  Sparkles,
} from "lucide-react";

interface PincodeRate {
  pincode: string;
  areaName: string;
  fee: number;
  estimatedDays: string;
  isActive: boolean;
  notes?: string;
}

interface PartnerPreset {
  id: string;
  name: string;
  type: string;
  baseRate: number;
  description: string;
}

interface DeliverySettings {
  lightWeightFee: number;
  largeWeightFee: number;
  heavyWeightThresholdKg: number;
  defaultBaseFee: number;
  freeShippingThreshold: number;
  isFreeShippingActive: boolean;
  enableLocalDelivery: boolean;
  localCity: string;
  localCityFee: number;
  localCityEstDays: string;
  enableRegionalDelivery: boolean;
  regionalState: string;
  regionalStateFee: number;
  regionalStateEstDays: string;
  nationalFee: number;
  nationalEstDays: string;
  heavyItemSurcharge: number;
  pincodeRates: PincodeRate[];
  partnerPresets: PartnerPreset[];
}

export default function CustomizeDeliveryPage() {
  const [activeTab, setActiveTab] = useState<"tiers" | "pincodes" | "order" | "simulator">("tiers");
  const [settings, setSettings] = useState<DeliverySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // State-wise Delivery Rates state

  // Pincode Management state
  const [pincodeSearch, setPincodeSearch] = useState("");
  const [showAddPincodeModal, setShowAddPincodeModal] = useState(false);
  const [newPincode, setNewPincode] = useState({
    pincode: "",
    areaName: "",
    fee: 45,
    estimatedDays: "Same Day / 4 Hours",
    isActive: true,
    notes: "Local bike delivery",
  });

  // Per-Order Customizer state
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [searchingOrder, setSearchingOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderCustomFee, setOrderCustomFee] = useState<number>(50);
  const [orderCustomReason, setOrderCustomReason] = useState("");
  const [orderPartnerType, setOrderPartnerType] = useState("PORTER");
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [orderUpdateSuccess, setOrderUpdateSuccess] = useState<string | null>(null);

  // Simulator state
  const [simPincode, setSimPincode] = useState("400050");
  const [simCity, setSimCity] = useState("Mumbai");
  const [simState, setSimState] = useState("Maharashtra");
  const [simSubtotal, setSimSubtotal] = useState(1200);
  const [simHeavy, setSimHeavy] = useState(false);
  const [simResult, setSimResult] = useState<any | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Fetch Delivery Settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/delivery-rates");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setSettings(json.data.settings);
        }
      }
    } catch (err) {
      console.error("Failed to load delivery settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save Delivery Settings (Tiers & Rules)
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/delivery-rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSettings(json.data.settings);
        setFeedback({
          type: "success",
          text: "Delivery pricing and local delivery rules successfully saved!",
        });
      } else {
        setFeedback({
          type: "error",
          text: json.message || "Failed to update delivery settings.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Network error while saving delivery settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Add Custom Pincode Override
  const handleAddPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPincode.pincode.trim() || !newPincode.areaName.trim()) return;

    try {
      setSaving(true);
      const res = await fetch("/api/admin/delivery-rates/pincodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPincode),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        if (settings) {
          setSettings({ ...settings, pincodeRates: json.data.pincodeRates });
        }
        setShowAddPincodeModal(false);
        setNewPincode({
          pincode: "",
          areaName: "",
          fee: 45,
          estimatedDays: "Same Day / 4 Hours",
          isActive: true,
          notes: "Local bike delivery",
        });
        setFeedback({
          type: "success",
          text: `Custom pincode delivery rate saved for ${newPincode.pincode}!`,
        });
      }
    } catch (err) {
      console.error("Failed to add pincode:", err);
    } finally {
      setSaving(false);
    }
  };

  // Delete Pincode
  const handleDeletePincode = async (pincode: string) => {
    if (!confirm(`Are you sure you want to remove custom rate for pincode ${pincode}?`)) return;

    try {
      const res = await fetch(`/api/admin/delivery-rates/pincodes?pincode=${encodeURIComponent(pincode)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        if (settings) {
          setSettings({ ...settings, pincodeRates: json.data.pincodeRates });
        }
        setFeedback({
          type: "success",
          text: `Custom rate for pincode ${pincode} removed.`,
        });
      }
    } catch (err) {
      console.error("Failed to delete pincode:", err);
    }
  };

  // Quick Preset: Load Mumbai Local Hubs
  const handleLoadMumbaiPresets = async () => {
    const presets: PincodeRate[] = [
      { pincode: "400050", areaName: "Bandra West (Store Vicinity)", fee: 35, estimatedDays: "2-4 Hours", isActive: true, notes: "Hyperlocal bike delivery" },
      { pincode: "400051", areaName: "Bandra East (BKC)", fee: 40, estimatedDays: "Same Day", isActive: true, notes: "Direct local rider" },
      { pincode: "400053", areaName: "Andheri West / Lokhandwala", fee: 45, estimatedDays: "Same Day", isActive: true, notes: "Porter 2-wheeler" },
      { pincode: "400001", areaName: "Fort / South Mumbai", fee: 50, estimatedDays: "Same Day", isActive: true, notes: "Porter intra-city" },
      { pincode: "400601", areaName: "Thane West", fee: 65, estimatedDays: "Next Day", isActive: true, notes: "Local parcel courier" },
      { pincode: "400703", areaName: "Vashi / Navi Mumbai", fee: 70, estimatedDays: "Next Day", isActive: true, notes: "Local parcel courier" },
    ];

    if (!settings) return;
    const currentList = settings.pincodeRates || [];
    const merged = [...currentList];

    for (const p of presets) {
      const idx = merged.findIndex((x) => x.pincode === p.pincode);
      if (idx >= 0) {
        merged[idx] = p;
      } else {
        merged.push(p);
      }
    }

    const updatedSettings = { ...settings, pincodeRates: merged };
    setSettings(updatedSettings);

    try {
      await fetch("/api/admin/delivery-rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });
      setFeedback({
        type: "success",
        text: "Preset local Mumbai delivery hubs loaded and saved successfully!",
      });
    } catch (e) {
      console.error(e);
    }
  };


  // Search Order for Custom Delivery Adjustment
  const handleSearchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderSearchQuery.trim()) return;

    try {
      setSearchingOrder(true);
      setSelectedOrder(null);
      setOrderUpdateSuccess(null);

      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderSearchQuery.trim())}/delivery-fee`);
      const json = await res.json();

      if (res.ok && json.success) {
        setSelectedOrder(json.data);
        setOrderCustomFee(json.data.pricing?.shippingFee || 50);
        setOrderCustomReason(json.data.pricing?.shippingFeeAdjustmentReason || "Local Porter bike delivery quote");
        setOrderPartnerType(json.data.deliveryPartnerType || "PORTER");
      } else {
        alert(json.message || "Order not found. Please check the Order Number.");
      }
    } catch (err: any) {
      alert("Error finding order: " + err.message);
    } finally {
      setSearchingOrder(false);
    }
  };

  // Update Order Delivery Fee
  const handleUpdateOrderDeliveryFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      setUpdatingOrder(true);
      setOrderUpdateSuccess(null);

      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(selectedOrder.orderNumber)}/delivery-fee`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customShippingFee: Number(orderCustomFee),
            reason: orderCustomReason.trim() || "Local custom delivery adjustment",
            partnerType: orderPartnerType,
          }),
        }
      );

      const json = await res.json();
      if (res.ok && json.success) {
        setOrderUpdateSuccess(
          `Delivery cost updated to ₹${orderCustomFee}! New Order Total: ₹${json.data.pricing.grandTotal}`
        );
        setSelectedOrder({
          ...selectedOrder,
          pricing: json.data.pricing,
          upiQrDataUrl: json.data.qrDataUrl || selectedOrder.upiQrDataUrl,
        });
      } else {
        alert(json.message || "Failed to update order delivery fee.");
      }
    } catch (err: any) {
      alert("Failed to update order delivery fee: " + err.message);
    } finally {
      setUpdatingOrder(false);
    }
  };

  // Run Rate Simulation
  const handleSimulateRate = async () => {
    try {
      setSimulating(true);
      const res = await fetch("/api/admin/delivery-rates/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtotal: Number(simSubtotal),
          pincode: simPincode.trim(),
          city: simCity.trim(),
          state: simState.trim(),
          hasRestrictedOrHeavy: simHeavy,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSimResult(json.data);
      }
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm font-semibold text-muted">Loading delivery rules and settings...</p>
        </div>
      </div>
    );
  }

  const filteredPincodes = (settings?.pincodeRates || []).filter(
    (p) =>
      p.pincode.toLowerCase().includes(pincodeSearch.toLowerCase()) ||
      p.areaName.toLowerCase().includes(pincodeSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner / Hero */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand/10 text-brand">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-fg tracking-tight">
                Customize Delivery & Weight Pricing
              </h1>
              <p className="text-xs text-muted mt-0.5">
                Simple two-tier weight delivery rates (Light Weight ₹180 vs Large Weight ₹299) and local order customization.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action / Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchSettings()}
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
            title="Reload settings"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 p-4 rounded-xl border text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-muted hover:text-fg font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl border border-line bg-surface flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Light Weight Orders
            </span>
            <span className="p-1.5 rounded-lg bg-surface-2 text-brand">
              <Package className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-brand">₹{settings?.lightWeightFee ?? 180}</span>
            <p className="text-[10px] text-muted mt-0.5">Katanas, keychains, small figures</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-line bg-surface flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Large Weight Orders
            </span>
            <span className="p-1.5 rounded-lg bg-surface-2 text-indigo-500">
              <Truck className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-indigo-500">₹{settings?.largeWeightFee ?? 299}</span>
            <p className="text-[10px] text-muted mt-0.5">Resin statues, 1/4 scales, heavy</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-line bg-surface flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Heavy Cutoff
            </span>
            <span className="p-1.5 rounded-lg bg-surface-2 text-amber-500">
              <Scale className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-fg">{settings?.heavyWeightThresholdKg ?? 2.0} kg</span>
            <p className="text-[10px] text-muted mt-0.5">Orders ≥ 2kg get large rate</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-line bg-surface flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Custom Pincodes
            </span>
            <span className="p-1.5 rounded-lg bg-surface-2 text-sky-500">
              <MapPin className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-fg">
              {settings?.pincodeRates?.length ?? 0}
            </span>
            <p className="text-[10px] text-muted mt-0.5">Unique local delivery zones</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-line bg-surface flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Free Delivery At
            </span>
            <span className="p-1.5 rounded-lg bg-surface-2 text-emerald-500">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-fg">
              {settings?.isFreeShippingActive && (settings?.freeShippingThreshold || 0) > 0
                ? `₹${settings?.freeShippingThreshold}`
                : "Disabled"}
            </span>
            <p className="text-[10px] text-muted mt-0.5">Orders qualifying for ₹0 fee</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-line pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("tiers")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
            activeTab === "tiers"
              ? "bg-brand text-white shadow-sm"
              : "text-fg-2 hover:bg-surface-2 hover:text-fg"
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Weight-Based Delivery Rates</span>
        </button>

        <button
          onClick={() => setActiveTab("pincodes")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
            activeTab === "pincodes"
              ? "bg-brand text-white shadow-sm"
              : "text-fg-2 hover:bg-surface-2 hover:text-fg"
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span>Pincode Custom Overrides</span>
          {settings?.pincodeRates && settings.pincodeRates.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "pincodes" ? "bg-white/20 text-white" : "bg-surface-3 text-fg"}`}>
              {settings.pincodeRates.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("order")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
            activeTab === "order"
              ? "bg-brand text-white shadow-sm"
              : "text-fg-2 hover:bg-surface-2 hover:text-fg"
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Per-Order Delivery Adjuster</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400">
            Small Business
          </span>
        </button>

        <button
          onClick={() => setActiveTab("simulator")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
            activeTab === "simulator"
              ? "bg-brand text-white shadow-sm"
              : "text-fg-2 hover:bg-surface-2 hover:text-fg"
          }`}
        >
          <Navigation className="h-4 w-4" />
          <span>Rate Simulator</span>
        </button>
      </div>

      {/* TAB 1: LOCAL & TIERED DELIVERY RATES */}
      {activeTab === "tiers" && settings && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weight-Based Rules */}
            <div className="p-6 rounded-2xl border border-line bg-surface space-y-5">
              <div className="flex items-center gap-2.5 border-b border-line pb-3">
                <Scale className="h-5 w-5 text-brand" />
                <div>
                  <h2 className="text-sm font-bold text-fg">Weight-Based Delivery Rates</h2>
                  <p className="text-[11px] text-muted">Two-tier delivery pricing: Light weight (₹180) vs Large weight (₹299)</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Light Weight Rate */}
                <div className="p-4 rounded-xl border border-line bg-surface-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-fg flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-brand" />
                        Light Weight Order Fee (₹)
                      </span>
                      <p className="text-[10px] text-muted">
                        Applied to katanas, keychains, small action figures &amp; items under 2kg
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-brand/10 text-brand">
                      Standard
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={settings.lightWeightFee ?? settings.defaultBaseFee ?? 180}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSettings({ ...settings, lightWeightFee: val, defaultBaseFee: val });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-fg text-sm font-bold focus:border-brand focus:outline-none"
                    placeholder="180"
                  />
                </div>

                {/* Large Weight Rate */}
                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-fg flex items-center gap-1.5">
                        <Truck className="h-4 w-4 text-indigo-500" />
                        Large Weight / Heavy Order Fee (₹)
                      </span>
                      <p className="text-[10px] text-muted">
                        Applied to large resin statues, 1/4 scales, 3-sword sets &amp; orders 2kg+
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-500/10 text-indigo-500">
                      Heavy / Fragile
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={settings.largeWeightFee ?? 299}
                    onChange={(e) =>
                      setSettings({ ...settings, largeWeightFee: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-fg text-sm font-bold focus:border-brand focus:outline-none"
                    placeholder="299"
                  />
                </div>

                {/* Heavy Threshold */}
                <div>
                  <label className="block text-xs font-bold text-fg mb-1">
                    Heavy Order Cutoff Threshold (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    value={settings.heavyWeightThresholdKg ?? 2.0}
                    onChange={(e) =>
                      setSettings({ ...settings, heavyWeightThresholdKg: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-fg text-sm focus:border-brand focus:outline-none"
                    placeholder="2.0"
                  />
                  <p className="text-[10px] text-muted mt-1">
                    Any order or item with weight at or above this threshold triggers the Large Weight delivery fee (₹{settings.largeWeightFee ?? 299}).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-fg mb-1">
                    Estimated Delivery Timeline
                  </label>
                  <input
                    type="text"
                    value={settings.nationalEstDays || "2-4 Business Days"}
                    onChange={(e) =>
                      setSettings({ ...settings, nationalEstDays: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-fg text-sm focus:border-brand focus:outline-none"
                    placeholder="2-4 Business Days"
                  />
                </div>

                <div className="pt-2 border-t border-line">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-fg">Free Shipping Qualification</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.isFreeShippingActive}
                        onChange={(e) =>
                          setSettings({ ...settings, isFreeShippingActive: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                  <input
                    type="number"
                    min="0"
                    disabled={!settings.isFreeShippingActive}
                    value={settings.freeShippingThreshold}
                    onChange={(e) =>
                      setSettings({ ...settings, freeShippingThreshold: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-fg text-sm focus:border-brand focus:outline-none disabled:opacity-50"
                    placeholder="1999"
                  />
                  <p className="text-[10px] text-muted mt-1">
                    Orders with subtotal above this amount get ₹0 delivery fee automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Local City & Regional Rules */}
            <div className="p-6 rounded-2xl border border-line bg-surface space-y-5">
              <div className="flex items-center gap-2.5 border-b border-line pb-3">
                <Bike className="h-5 w-5 text-brand" />
                <div>
                  <h2 className="text-sm font-bold text-fg">Local City Courier Rules</h2>
                  <p className="text-[11px] text-muted">Cheaper rates for local Porter / Dunzo / bike deliveries</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-line bg-surface-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-fg">Enable Same-City Local Delivery</span>
                      <p className="text-[10px] text-muted">Special discounted rate for orders within your home city</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enableLocalDelivery}
                        onChange={(e) =>
                          setSettings({ ...settings, enableLocalDelivery: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {settings.enableLocalDelivery && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line">
                      <div>
                        <label className="block text-[11px] font-bold text-fg mb-1">Local City Name</label>
                        <input
                          type="text"
                          value={settings.localCity}
                          onChange={(e) => setSettings({ ...settings, localCity: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-line bg-surface text-fg text-xs"
                          placeholder="Mumbai"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-fg mb-1">Local Delivery Fee (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={settings.localCityFee}
                          onChange={(e) => setSettings({ ...settings, localCityFee: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 rounded-lg border border-line bg-surface text-fg text-xs"
                          placeholder="50"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold text-fg mb-1">Local Estimated Time</label>
                        <input
                          type="text"
                          value={settings.localCityEstDays}
                          onChange={(e) => setSettings({ ...settings, localCityEstDays: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-line bg-surface text-fg text-xs"
                          placeholder="Same Day / 4 Hours"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-line bg-surface-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-fg">Enable Regional State Delivery</span>
                      <p className="text-[10px] text-muted">Intermediate rate for adjacent cities within your state</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enableRegionalDelivery}
                        onChange={(e) =>
                          setSettings({ ...settings, enableRegionalDelivery: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {settings.enableRegionalDelivery && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line">
                      <div>
                        <label className="block text-[11px] font-bold text-fg mb-1">State Name</label>
                        <input
                          type="text"
                          value={settings.regionalState}
                          onChange={(e) => setSettings({ ...settings, regionalState: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-line bg-surface text-fg text-xs"
                          placeholder="Maharashtra"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-fg mb-1">Regional Fee (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={settings.regionalStateFee}
                          onChange={(e) => setSettings({ ...settings, regionalStateFee: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 rounded-lg border border-line bg-surface text-fg text-xs"
                          placeholder="80"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Local Partner Presets Info */}
          <div className="p-6 rounded-2xl border border-line bg-surface">
            <h3 className="text-sm font-bold text-fg mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Supported Local Courier Integrations & Rates
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              {(settings.partnerPresets || []).map((partner) => (
                <div key={partner.id} className="p-3 rounded-xl border border-line bg-surface-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-fg">{partner.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand/10 text-brand">
                      ₹{partner.baseRate}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted mt-1 leading-snug">{partner.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl shadow-md text-sm font-bold"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Save Delivery Pricing Rules</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: PINCODE CUSTOM OVERRIDES */}
      {activeTab === "pincodes" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                value={pincodeSearch}
                onChange={(e) => setPincodeSearch(e.target.value)}
                placeholder="Search by 6-digit Pincode or Area Name..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-line bg-surface text-fg text-xs focus:border-brand focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadMumbaiPresets}
                className="btn btn-secondary btn-sm flex items-center gap-1.5"
                title="Populate common Mumbai local startup hubs"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Load Mumbai Presets</span>
              </button>
              <button
                onClick={() => setShowAddPincodeModal(true)}
                className="btn btn-primary btn-sm flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Add Custom Pincode</span>
              </button>
            </div>
          </div>

          {/* Add Pincode Modal */}
          {showAddPincodeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
              <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
                  <h3 className="text-base font-bold text-fg flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-brand" />
                    Add Custom Pincode Delivery Rate
                  </h3>
                  <button
                    onClick={() => setShowAddPincodeModal(false)}
                    className="text-muted hover:text-fg text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleAddPincode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-fg mb-1">
                      Pincode (e.g. 400050 or 400*)
                    </label>
                    <input
                      type="text"
                      required
                      value={newPincode.pincode}
                      onChange={(e) => setNewPincode({ ...newPincode, pincode: e.target.value })}
                      placeholder="400050"
                      className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-fg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-fg mb-1">Area / Neighborhood Name</label>
                    <input
                      type="text"
                      required
                      value={newPincode.areaName}
                      onChange={(e) => setNewPincode({ ...newPincode, areaName: e.target.value })}
                      placeholder="Bandra West / Linking Road"
                      className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-fg text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-fg mb-1">Custom Delivery Fee (₹)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={newPincode.fee}
                        onChange={(e) => setNewPincode({ ...newPincode, fee: Number(e.target.value) })}
                        placeholder="45"
                        className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-fg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-fg mb-1">Est. Delivery Time</label>
                      <input
                        type="text"
                        value={newPincode.estimatedDays}
                        onChange={(e) => setNewPincode({ ...newPincode, estimatedDays: e.target.value })}
                        placeholder="Same Day / 4 Hours"
                        className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-fg text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-fg mb-1">Courier / Delivery Notes</label>
                    <input
                      type="text"
                      value={newPincode.notes}
                      onChange={(e) => setNewPincode({ ...newPincode, notes: e.target.value })}
                      placeholder="e.g. Local Porter rider delivery"
                      className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-fg text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="pincodeActive"
                      checked={newPincode.isActive}
                      onChange={(e) => setNewPincode({ ...newPincode, isActive: e.target.checked })}
                      className="rounded border-line"
                    />
                    <label htmlFor="pincodeActive" className="text-xs font-semibold text-fg">
                      Active immediately
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-line">
                    <button
                      type="button"
                      onClick={() => setShowAddPincodeModal(false)}
                      className="btn btn-secondary btn-sm"
                    >
                      Cancel
                    </button>
                    <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                      {saving ? "Saving..." : "Save Pincode Rate"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Pincodes Table */}
          <div className="rounded-2xl border border-line bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2 border-b border-line text-[11px] font-bold text-muted uppercase">
                  <tr>
                    <th className="px-4 py-3">Pincode</th>
                    <th className="px-4 py-3">Area / Zone</th>
                    <th className="px-4 py-3">Delivery Fee</th>
                    <th className="px-4 py-3">Delivery Speed</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredPincodes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted">
                        No custom pincodes found. Click &quot;Add Custom Pincode&quot; or &quot;Load Mumbai Presets&quot; to configure local delivery zones!
                      </td>
                    </tr>
                  ) : (
                    filteredPincodes.map((item) => (
                      <tr key={item.pincode} className="hover:bg-surface-2/50 transition">
                        <td className="px-4 py-3 font-bold text-fg font-mono">{item.pincode}</td>
                        <td className="px-4 py-3 font-semibold text-fg">{item.areaName}</td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-brand px-2 py-0.5 rounded-full bg-brand/10">
                            ₹{item.fee}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted">{item.estimatedDays}</td>
                        <td className="px-4 py-3 text-muted text-[11px]">{item.notes || "-"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeletePincode(item.pincode)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                            title="Remove pincode override"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PER-ORDER DELIVERY ADJUSTER */}
      {activeTab === "order" && (
        <div className="space-y-6">
          {/* Instructions banner tailored to startup local delivery context */}
          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xs">
            <h3 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <Bike className="h-4 w-4" />
              Unique Local Delivery Customizer (Small Business Mode)
            </h3>
            <p className="text-fg-2 mt-1">
              As a startup using local delivery partners (Porter, Dunzo, local bike riders), delivery rates vary per customer distance. Search any customer order below to quote and set their unique delivery fee directly. The new Grand Total and UPI QR Code will recalculate immediately.
            </p>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchOrder} className="flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder="Enter Order Number (e.g. FW-018286-EA10) or customer name..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-line bg-surface text-fg text-xs focus:border-brand focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={searchingOrder}
              className="btn btn-primary px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
            >
              {searchingOrder ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              <span>Find Order</span>
            </button>
          </form>

          {/* Order Update Success */}
          {orderUpdateSuccess && (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>{orderUpdateSuccess}</span>
            </div>
          )}

          {/* Selected Order Customization Panel */}
          {selectedOrder && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
              {/* Order Info & Address */}
              <div className="lg:col-span-1 p-6 rounded-2xl border border-line bg-surface space-y-4">
                <div className="border-b border-line pb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Order Details</span>
                  <h3 className="text-base font-black text-fg font-mono">{selectedOrder.orderNumber}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand/10 text-brand">
                      {selectedOrder.paymentMethod}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                      {selectedOrder.paymentStatus}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 text-muted">
                    <User className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span className="text-fg font-semibold">{selectedOrder.customer?.name || "Customer"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted">
                    <Phone className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{selectedOrder.shippingAddress?.phone || selectedOrder.customer?.phone || "N/A"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted">
                    <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      {selectedOrder.shippingAddress
                        ? `${selectedOrder.shippingAddress.streetLine1}, ${selectedOrder.shippingAddress.landmark ? selectedOrder.shippingAddress.landmark + ", " : ""}${selectedOrder.shippingAddress.city}, ${selectedOrder.shippingAddress.state} - ${selectedOrder.shippingAddress.postalCode}`
                        : "No physical address specified"}
                    </span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="border-t border-line pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Items Ordered</span>
                  <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto">
                    {(selectedOrder.items || []).map((it: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="truncate max-w-[180px] text-fg font-medium">{it.productTitle} × {it.quantity}</span>
                        <span className="font-bold text-fg">₹{it.total}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* UPI QR preview if available */}
                {selectedOrder.upiQrDataUrl && (
                  <div className="border-t border-line pt-3 flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1">
                      <QrCode className="h-3.5 w-3.5" />
                      Dynamic UPI QR Code
                    </span>
                    <img
                      src={selectedOrder.upiQrDataUrl}
                      alt="UPI QR Code"
                      className="w-32 h-32 rounded-lg border border-line p-1 bg-white"
                    />
                    <p className="text-[9px] text-muted text-center mt-1">
                      Customer pays new Grand Total when scanned
                    </p>
                  </div>
                )}
              </div>

              {/* Delivery Fee Customization Form */}
              <div className="lg:col-span-2 p-6 rounded-2xl border border-line bg-surface space-y-5">
                <div className="border-b border-line pb-3">
                  <h3 className="text-sm font-bold text-fg flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-brand" />
                    Adjust Customer Delivery Fee
                  </h3>
                  <p className="text-[11px] text-muted">
                    Set unique delivery charges for this specific order based on local delivery distances
                  </p>
                </div>

                {/* Current Financials Breakdown */}
                <div className="grid grid-cols-4 gap-3 p-3 rounded-xl bg-surface-2 border border-line text-center">
                  <div>
                    <span className="text-[10px] font-bold text-muted block uppercase">Subtotal</span>
                    <span className="text-xs font-black text-fg">₹{selectedOrder.pricing?.subtotal || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted block uppercase">Discount</span>
                    <span className="text-xs font-black text-emerald-500">-₹{selectedOrder.pricing?.discountTotal || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted block uppercase">Current Delivery</span>
                    <span className="text-xs font-black text-brand">₹{selectedOrder.pricing?.shippingFee || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted block uppercase">Current Grand Total</span>
                    <span className="text-xs font-black text-fg">₹{selectedOrder.pricing?.grandTotal || 0}</span>
                  </div>
                </div>

                <form onSubmit={handleUpdateOrderDeliveryFee} className="space-y-4">
                  {/* Quick Fee Presets */}
                  <div>
                    <label className="block text-xs font-bold text-fg mb-1.5">Quick Fee Presets</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "Free (₹0)", fee: 0 },
                        { label: "Hyperlocal (₹30)", fee: 30 },
                        { label: "Porter Bike (₹45)", fee: 45 },
                        { label: "Dunzo Drop (₹55)", fee: 55 },
                        { label: "City Express (₹70)", fee: 70 },
                        { label: "Light Weight (₹180)", fee: 180 },
                        { label: "Large Weight (₹299)", fee: 299 },
                        { label: "Outstation (₹350)", fee: 350 },
                      ].map((preset) => (
                        <button
                          key={preset.fee}
                          type="button"
                          onClick={() => {
                            setOrderCustomFee(preset.fee);
                            setOrderCustomReason(preset.label);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                            orderCustomFee === preset.fee
                              ? "bg-brand text-white border-brand"
                              : "border-line bg-surface-2 text-fg hover:border-brand"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-fg mb-1">
                        Custom Delivery Fee (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={orderCustomFee}
                        onChange={(e) => setOrderCustomFee(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-fg text-sm font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-fg mb-1">
                        Local Courier Partner
                      </label>
                      <select
                        value={orderPartnerType}
                        onChange={(e) => setOrderPartnerType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-fg text-xs"
                      >
                        <option value="PORTER">Porter 2-Wheeler / Bike</option>
                        <option value="DUNZO">Dunzo Hyperlocal Express</option>
                        <option value="LOCAL_RIDER">In-House Store Rider</option>
                        <option value="STANDARD_COURIER">Standard Courier (BlueDart / DTDC)</option>
                        <option value="SELF_PICKUP">Self Pickup / Store Collection</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-fg mb-1">
                      Reason / Customer Agreement Note
                    </label>
                    <input
                      type="text"
                      required
                      value={orderCustomReason}
                      onChange={(e) => setOrderCustomReason(e.target.value)}
                      placeholder="e.g. Porter quote for 6km distance, agreed on WhatsApp"
                      className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-fg text-xs"
                    />
                  </div>

                  {/* Live Recalculation Preview */}
                  <div className="p-4 rounded-xl border border-brand/30 bg-brand/5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-fg">Calculated New Grand Total:</span>
                      <p className="text-[10px] text-muted">
                        Subtotal ₹{selectedOrder.pricing?.subtotal} - Discount ₹{selectedOrder.pricing?.discountTotal} + New Delivery ₹{orderCustomFee}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-brand">
                        ₹{Math.max(0, (selectedOrder.pricing?.subtotal || 0) - (selectedOrder.pricing?.discountTotal || 0) + Number(orderCustomFee))}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={updatingOrder}
                      className="btn btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold"
                    >
                      {updatingOrder ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>Apply Custom Delivery Fee & Update Total</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RATE SIMULATOR */}
      {activeTab === "simulator" && (
        <div className="max-w-2xl mx-auto p-6 rounded-2xl border border-line bg-surface space-y-5">
          <div className="border-b border-line pb-3">
            <h2 className="text-sm font-bold text-fg flex items-center gap-2">
              <Navigation className="h-4 w-4 text-brand" />
              Delivery Cost Simulation & Quote Tester
            </h2>
            <p className="text-[11px] text-muted">
              Test how the delivery pricing engine calculates fees for any pincode, city, or cart amount
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-fg mb-1">Postal PIN Code</label>
              <input
                type="text"
                value={simPincode}
                onChange={(e) => setSimPincode(e.target.value)}
                placeholder="400050"
                className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-fg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-fg mb-1">City</label>
              <input
                type="text"
                value={simCity}
                onChange={(e) => setSimCity(e.target.value)}
                placeholder="Mumbai"
                className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-fg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-fg mb-1">State</label>
              <input
                type="text"
                value={simState}
                onChange={(e) => setSimState(e.target.value)}
                placeholder="Maharashtra"
                className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-fg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-fg mb-1">Cart Subtotal (₹)</label>
              <input
                type="number"
                min="0"
                value={simSubtotal}
                onChange={(e) => setSimSubtotal(Number(e.target.value))}
                placeholder="1200"
                className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-fg text-xs"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl border border-line bg-surface-2 space-y-2">
            <label className="block text-xs font-bold text-fg">Package Weight Classification</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  !simHeavy ? "border-brand bg-brand/5 text-fg font-bold" : "border-line text-muted"
                }`}
              >
                <input
                  type="radio"
                  name="simWeightType"
                  checked={!simHeavy}
                  onChange={() => setSimHeavy(false)}
                  className="text-brand"
                />
                <div>
                  <div className="text-xs font-bold">Light Weight Order (₹{settings?.lightWeightFee ?? 180})</div>
                  <div className="text-[10px] text-muted">Katanas, keychains, small figures (&lt; 2kg)</div>
                </div>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  simHeavy ? "border-indigo-500 bg-indigo-500/5 text-fg font-bold" : "border-line text-muted"
                }`}
              >
                <input
                  type="radio"
                  name="simWeightType"
                  checked={simHeavy}
                  onChange={() => setSimHeavy(true)}
                  className="text-indigo-500"
                />
                <div>
                  <div className="text-xs font-bold">Large Weight Order (₹{settings?.largeWeightFee ?? 299})</div>
                  <div className="text-[10px] text-muted">Large resin statues, 1/4 scales (≥ 2kg)</div>
                </div>
              </label>
            </div>
          </div>

          <button
            onClick={handleSimulateRate}
            disabled={simulating}
            className="w-full btn btn-primary py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
          >
            {simulating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            <span>Calculate Live Delivery Cost</span>
          </button>

          {/* Simulation Output */}
          {simResult && (
            <div className="p-4 rounded-xl border border-line bg-surface-2 space-y-3 animate-fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Calculation Result</span>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-fg">{simResult.calculation.ruleName}</h4>
                  <p className="text-[11px] text-muted">
                    Estimated Timeline: {simResult.calculation.estimatedDays} | Suggested Partner: {simResult.calculation.partnerSuggestion}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-brand">₹{simResult.calculation.fee}</span>
                  <p className="text-[10px] text-muted">Delivery Charge</p>
                </div>
              </div>

              <div className="border-t border-line pt-2 flex justify-between text-xs font-bold">
                <span className="text-fg">Customer Grand Total:</span>
                <span className="text-fg">₹{simResult.grandTotal}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
