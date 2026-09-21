"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  User, 
  MapPin, 
  KeyRound, 
  Shield, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Phone, 
  Mail, 
  Building,
  Home,
  Star
} from "lucide-react";

interface Address {
  _id: string;
  type: "shipping" | "billing" | "both";
  fullName: string;
  phone: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<"overview" | "profile" | "addresses" | "security">("overview");

  // Profile edit state
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Addresses state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressMsg, setAddressMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New address form state
  const [newAddress, setNewAddress] = useState({
    type: "shipping" as "shipping" | "billing" | "both",
    fullName: "",
    phone: "",
    streetLine1: "",
    streetLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "United States",
    isDefault: false,
  });

  // Sync profile details
  useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
      setProfilePhone(user.phone || "");
    }
  }, [user]);

  // Load addresses
  const fetchAddresses = useCallback(async () => {
    setLoadingAddresses(true);
    try {
      const res = await fetch("/api/user/addresses");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setAddresses(json.data.addresses || []);
        }
      }
    } catch {
      // Ignore address load error
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName, phone: profilePhone }),
      });
      const json = await res.json();
      setProfileSaving(false);

      if (res.ok && json.success) {
        setProfileMsg({ type: "success", text: "Profile updated successfully!" });
        await refreshUser();
      } else {
        setProfileMsg({ type: "error", text: json.error?.message || "Failed to update profile." });
      }
    } catch {
      setProfileSaving(false);
      setProfileMsg({ type: "error", text: "Network error occurred." });
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      setPasswordSaving(false);

      if (res.ok && json.success) {
        setPasswordMsg({ type: "success", text: "Password changed successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMsg({ type: "error", text: json.error?.message || "Failed to change password." });
      }
    } catch {
      setPasswordSaving(false);
      setPasswordMsg({ type: "error", text: "Network error occurred." });
    }
  };

  // Handle Add Address
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressSaving(true);
    setAddressMsg(null);

    try {
      const res = await fetch("/api/user/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddress),
      });
      const json = await res.json();
      setAddressSaving(false);

      if (res.ok && json.success) {
        setShowAddAddressModal(false);
        setNewAddress({
          type: "shipping",
          fullName: user?.name || "",
          phone: user?.phone || "",
          streetLine1: "",
          streetLine2: "",
          city: "",
          state: "",
          postalCode: "",
          country: "United States",
          isDefault: false,
        });
        await fetchAddresses();
      } else {
        setAddressMsg({ type: "error", text: json.error?.message || "Failed to add address." });
      }
    } catch {
      setAddressSaving(false);
      setAddressMsg({ type: "error", text: "Network error occurred." });
    }
  };

  // Delete Address
  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;

    try {
      const res = await fetch(`/api/user/addresses/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchAddresses();
      }
    } catch {
      // Ignore
    }
  };

  // Set Default Address
  const handleSetDefaultAddress = async (id: string) => {
    try {
      const res = await fetch(`/api/user/addresses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        await fetchAddresses();
      }
    } catch {
      // Ignore
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-xs text-slate-500">Checking your session...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Account Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-extrabold uppercase text-white shadow-lg shadow-indigo-600/30">
              {user.name.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  user.role === "ADMIN"
                    ? "bg-purple-500 text-white"
                    : user.role === "STAFF"
                    ? "bg-blue-500 text-white"
                    : "bg-emerald-500 text-white"
                }`}>
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-800/60 px-3.5 py-2">
              <span className="text-slate-400 block text-[10px]">Saved Addresses</span>
              <span className="font-bold text-white text-sm">{addresses.length}</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-800/60 px-3.5 py-2">
              <span className="text-slate-400 block text-[10px]">Security Status</span>
              <span className="font-bold text-emerald-400 text-sm flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Protected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 gap-2 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 pb-3 px-3 transition-colors border-b-2 ${
            activeTab === "overview"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Home className="h-4 w-4" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 pb-3 px-3 transition-colors border-b-2 ${
            activeTab === "profile"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <User className="h-4 w-4" />
          <span>Edit Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("addresses")}
          className={`flex items-center gap-2 pb-3 px-3 transition-colors border-b-2 ${
            activeTab === "addresses"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span>Saved Addresses ({addresses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 pb-3 px-3 transition-colors border-b-2 ${
            activeTab === "security"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>Security & Password</span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600" /> Account Summary
            </h3>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p><span className="font-semibold text-slate-400">Name:</span> {user.name}</p>
              <p><span className="font-semibold text-slate-400">Email:</span> {user.email}</p>
              <p><span className="font-semibold text-slate-400">Phone:</span> {user.phone || "Not specified"}</p>
              <p><span className="font-semibold text-slate-400">Account Role:</span> {user.role}</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Update Information →
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="h-4 w-4 text-purple-600" /> Primary Address
            </h3>
            {addresses.find((a) => a.isDefault) ? (
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                <span className="inline-block text-[10px] font-bold uppercase bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded">
                  Default {addresses.find((a) => a.isDefault)?.type}
                </span>
                <p className="font-bold text-slate-900 dark:text-white pt-1">
                  {addresses.find((a) => a.isDefault)?.fullName}
                </p>
                <p>{addresses.find((a) => a.isDefault)?.streetLine1}</p>
                <p>{addresses.find((a) => a.isDefault)?.city}, {addresses.find((a) => a.isDefault)?.state} {addresses.find((a) => a.isDefault)?.postalCode}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No default address set yet.</p>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("addresses")}
              className="text-xs font-semibold text-purple-600 hover:underline"
            >
              Manage Address Book ({addresses.length}) →
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" /> Security & Role Access
            </h3>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p><span className="font-semibold text-slate-400">Password Encryption:</span> bcryptjs (12 rounds)</p>
              <p><span className="font-semibold text-slate-400">Session Type:</span> HTTP-Only Signed JWT</p>
              <p><span className="font-semibold text-slate-400">Role Privileges:</span> {
                user.role === "ADMIN" 
                  ? "Superuser (Full Catalog & Staff Management)" 
                  : user.role === "STAFF" 
                  ? "Staff (Catalog & Order Management)" 
                  : "Customer (Standard Purchasing & Profile)"
              }</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Change Password →
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Edit Profile */}
      {activeTab === "profile" && (
        <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit Profile Details</h2>
          <p className="text-xs text-slate-500 mt-1">Update your display name and contact phone</p>

          {profileMsg && (
            <div className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-xs ${
              profileMsg.type === "success" 
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
            }`}>
              {profileMsg.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="mt-6 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
              <div className="relative mt-1">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">Account Email (Immutable)</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">Phone Number</label>
              <div className="relative mt-1">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {profileSaving ? "Saving changes..." : "Save Profile Changes"}
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Saved Addresses */}
      {activeTab === "addresses" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Saved Addresses</h2>
              <p className="text-xs text-slate-500">Manage your shipping and billing destinations</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewAddress({
                  type: "shipping",
                  fullName: user.name,
                  phone: user.phone || "",
                  streetLine1: "",
                  streetLine2: "",
                  city: "",
                  state: "",
                  postalCode: "",
                  country: "United States",
                  isDefault: addresses.length === 0,
                });
                setShowAddAddressModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Address</span>
            </button>
          </div>

          {loadingAddresses ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              <div className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </div>
          ) : addresses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-xs dark:border-slate-800">
              <MapPin className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 font-bold text-slate-700 dark:text-slate-300">No saved addresses found</p>
              <p className="text-slate-500 mt-1">Add a default address to accelerate your checkout process.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div
                  key={addr._id}
                  className={`relative rounded-2xl border p-5 transition-all ${
                    addr.isDefault
                      ? "border-indigo-500 bg-indigo-50/30 dark:border-indigo-500 dark:bg-indigo-950/20 shadow-xs"
                      : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-slate-700 dark:text-slate-300">
                        {addr.type}
                      </span>
                      {addr.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase rounded-md bg-indigo-600 px-2 py-0.5 text-white">
                          <Star className="h-2.5 w-2.5 fill-white" /> Default
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr._id)}
                      className="text-slate-400 hover:text-rose-600 transition"
                      title="Delete address"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{addr.fullName}</p>
                    <p>{addr.streetLine1}</p>
                    {addr.streetLine2 && <p>{addr.streetLine2}</p>}
                    <p>{addr.city}, {addr.state} {addr.postalCode}</p>
                    <p>{addr.country}</p>
                    <p className="text-[11px] text-slate-400 pt-1">Phone: {addr.phone}</p>
                  </div>

                  {!addr.isDefault && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleSetDefaultAddress(addr._id)}
                        className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Set as Default Address
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Address Modal */}
          {showAddAddressModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
              <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Add New Address</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddAddressModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                {addressMsg && (
                  <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                    {addressMsg.text}
                  </div>
                )}

                <form onSubmit={handleAddAddress} className="mt-4 space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">Address Type</label>
                    <select
                      value={newAddress.type}
                      onChange={(e) => setNewAddress({ ...newAddress, type: e.target.value as "shipping" | "billing" | "both" })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="shipping">Shipping Address</option>
                      <option value="billing">Billing Address</option>
                      <option value="both">Both (Shipping & Billing)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
                      <input
                        type="text"
                        required
                        value={newAddress.fullName}
                        onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">Contact Phone</label>
                      <input
                        type="tel"
                        required
                        value={newAddress.phone}
                        onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">Street Address</label>
                    <input
                      type="text"
                      required
                      placeholder="123 Collector Lane"
                      value={newAddress.streetLine1}
                      onChange={(e) => setNewAddress({ ...newAddress, streetLine1: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">Apt, Suite, Unit (Optional)</label>
                    <input
                      type="text"
                      placeholder="Apt 4B"
                      value={newAddress.streetLine2}
                      onChange={(e) => setNewAddress({ ...newAddress, streetLine2: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">City</label>
                      <input
                        type="text"
                        required
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">State / Province</label>
                      <input
                        type="text"
                        required
                        value={newAddress.state}
                        onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">Postal / ZIP Code</label>
                      <input
                        type="text"
                        required
                        value={newAddress.postalCode}
                        onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">Country</label>
                      <input
                        type="text"
                        required
                        value={newAddress.country}
                        onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAddress.isDefault}
                      onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Set as my default address</span>
                  </label>

                  <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowAddAddressModal(false)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addressSaving}
                      className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {addressSaving ? "Saving..." : "Save Address"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Security (Change Password) */}
      {activeTab === "security" && (
        <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Change Password</h2>
          <p className="text-xs text-slate-500 mt-1">Ensure your collector account is guarded with a strong password</p>

          {passwordMsg && (
            <div className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-xs ${
              passwordMsg.type === "success" 
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
            }`}>
              {passwordMsg.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="mt-6 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-4 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">New Password (min 6 chars)</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-4 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-4 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={passwordSaving}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {passwordSaving ? "Updating password..." : "Update Password"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
