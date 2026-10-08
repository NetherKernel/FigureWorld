"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Boxes,
  Eye,
  EyeOff,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface IProduct {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  brand?: string;
  category: { _id: string; name: string; slug: string } | string;
  subcategory?: { _id: string; name: string; slug: string } | string;
  price: number;
  discountPrice?: number;
  stock: number;
  status: "active" | "draft" | "archived" | "preorder";
  isFeatured: boolean;
  isRestricted: boolean;
  ageRequirement?: number;
  shippingRestrictions?: string[];
  images: Array<{ url: string; altText?: string; isPrimary: boolean }>;
  createdAt: string;
}

interface ICategory {
  _id: string;
  name: string;
  slug: string;
  isRestricted: boolean;
}

export default function AdminProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [restrictedFilter, setRestrictedFilter] = useState("");

  // Quick edit modal state
  const [quickEditProduct, setQuickEditProduct] = useState<IProduct | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editDiscountPrice, setEditDiscountPrice] = useState<string>("");
  const [editStock, setEditStock] = useState<number>(0);
  const [savingQuickEdit, setSavingQuickEdit] = useState(false);

  // Delete modal state
  const [deleteProductTarget, setDeleteProductTarget] = useState<IProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.success && data.data?.categories) {
        setCategories(data.data.categories);
      }
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (selectedStatus) params.set("status", selectedStatus);
      if (restrictedFilter) params.set("isRestricted", restrictedFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data?.products) {
        setProducts(data.data.products);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedStatus, restrictedFilter, searchQuery]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Quick status toggle (active <-> draft)
  const handleToggleStatus = async (product: IProduct) => {
    const newStatus = product.status === "active" ? "draft" : "active";
    try {
      const res = await fetch(`/api/products/${product._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Updated status of "${product.name}" to ${newStatus}.`);
        setProducts((prev) =>
          prev.map((p) => (p._id === product._id ? { ...p, status: newStatus } : p))
        );
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        setError(data.message || "Failed to update product status");
      }
    } catch (err: any) {
      setError(err.message || "Network error updating product status");
    }
  };

  // Open Quick Edit modal
  const handleOpenQuickEdit = (product: IProduct) => {
    setQuickEditProduct(product);
    setEditPrice(product.price);
    setEditDiscountPrice(product.discountPrice ? String(product.discountPrice) : "");
    setEditStock(product.stock);
  };

  // Save Quick Edit (Price & Stock)
  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditProduct) return;
    setSavingQuickEdit(true);
    try {
      const payload: any = {
        price: Number(editPrice),
        stock: Number(editStock),
      };
      if (editDiscountPrice.trim() === "") {
        payload.discountPrice = null;
      } else {
        payload.discountPrice = Number(editDiscountPrice);
      }

      const res = await fetch(`/api/products/${quickEditProduct._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Updated price and stock for "${quickEditProduct.name}".`);
        setProducts((prev) =>
          prev.map((p) =>
            p._id === quickEditProduct._id
              ? {
                  ...p,
                  price: payload.price,
                  discountPrice: payload.discountPrice === null ? undefined : payload.discountPrice,
                  stock: payload.stock,
                }
              : p
          )
        );
        setQuickEditProduct(null);
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        setError(data.message || "Failed to update product");
      }
    } catch (err: any) {
      setError(err.message || "Network error saving quick edit");
    } finally {
      setSavingQuickEdit(false);
    }
  };

  // Confirm Delete Product
  const handleDeleteProduct = async () => {
    if (!deleteProductTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${deleteProductTarget._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`Successfully deleted "${deleteProductTarget.name}".`);
        setProducts((prev) => prev.filter((p) => p._id !== deleteProductTarget._id));
        setDeleteProductTarget(null);
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        setError(data.error?.message || data.message || "Failed to delete product");
      }
    } catch (err: any) {
      setError(err.message || "Network error deleting product");
    } finally {
      setDeleting(false);
    }
  };

  const getCategoryName = (cat: any) => {
    if (typeof cat === "object" && cat?.name) return cat.name;
    const match = categories.find((c) => c._id === cat);
    return match ? match.name : "Uncategorized";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-brand-hover"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-fg">
                Product Catalog Management
              </h1>
              <p className="text-xs text-muted">
                Manage items, modify prices, update stock, control statuses, and configure 18+ compliance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchProducts()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-fg-2 shadow-xs hover:bg-surface-2"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand/20 hover:bg-brand-hover transition"
          >
            <Plus className="h-4 w-4" /> Add New Product
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, SKU, brand..."
              className="w-full rounded-xl border border-line bg-bg py-2 pl-9 pr-3 text-xs font-medium text-fg placeholder:text-muted focus:border-brand focus:bg-surface focus:outline-none"
            />
          </div>

          {/* Category filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-xl border border-line bg-bg py-2 px-3 text-xs font-medium text-fg focus:border-brand focus:bg-surface focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name} {cat.isRestricted ? "⚠️ (Restricted)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-line bg-bg py-2 px-3 text-xs font-medium text-fg focus:border-brand focus:bg-surface focus:outline-none"
            >
              <option value="">All Statuses (Active & Draft)</option>
              <option value="active">Active only</option>
              <option value="draft">Draft (Disabled)</option>
              <option value="archived">Archived</option>
              <option value="preorder">Pre-Order</option>
            </select>
          </div>

          {/* Compliance/Restricted filter */}
          <div>
            <select
              value={restrictedFilter}
              onChange={(e) => setRestrictedFilter(e.target.value)}
              className="w-full rounded-xl border border-line bg-bg py-2 px-3 text-xs font-medium text-fg focus:border-brand focus:bg-surface focus:outline-none"
            >
              <option value="">All Products</option>
              <option value="true">18+ Restricted Only (Katanas, etc.)</option>
              <option value="false">Standard Products Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Data Table */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-muted font-semibold uppercase tracking-wider">
                <th className="px-4 py-3.5">Product</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Price</th>
                <th className="px-4 py-3.5">Stock</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Compliance</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-ink" />
                    Loading product catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold text-fg-2">
                      No products found
                    </p>
                    <p className="text-xs mt-1">Try adjusting your search criteria or add a new product.</p>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const primaryImage =
                    p.images?.find((img) => img.isPrimary)?.url ||
                    p.images?.[0]?.url ||
                    "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200";

                  return (
                    <tr key={p._id} className="hover:bg-surface-2 transition">
                      {/* Product Thumbnail & Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={primaryImage}
                            alt={p.name}
                            className="h-12 w-12 shrink-0 rounded-xl object-cover border border-line bg-surface-3"
                          />
                          <div className="min-w-0 max-w-xs">
                            <p className="font-bold text-fg truncate">
                              {p.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted">
                              <span className="font-mono">{p.sku}</span>
                              {p.brand && <span>• {p.brand}</span>}
                              {p.isFeatured && (
                                <span className="rounded bg-amber-100 text-amber-800 px-1 py-0.2 text-[9px] font-bold dark:bg-amber-950 dark:text-amber-300">
                                  Featured
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center rounded-lg bg-surface-3 px-2 py-0.5 text-[11px] font-semibold text-fg-2">
                            {getCategoryName(p.category)}
                          </span>
                          {p.subcategory && (
                            <span className="inline-flex items-center text-[10px] text-muted font-medium">
                              › {getCategoryName(p.subcategory)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Price & Discount */}
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-bold text-fg">
                            ₹{p.price.toLocaleString("en-IN")}
                          </span>
                          {p.discountPrice && (
                            <span className="ml-1.5 text-[11px] text-emerald-600 font-semibold line-through opacity-75">
                              ₹{p.discountPrice.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock count */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              p.stock > 10
                                ? "bg-emerald-500"
                                : p.stock > 0
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                          />
                          <span
                            className={`font-semibold ${
                              p.stock === 0
                                ? "text-rose-600"
                                : p.stock <= 5
                                ? "text-amber-600"
                                : "text-fg"
                            }`}
                          >
                            {p.stock} units
                          </span>
                        </div>
                      </td>

                      {/* Status & Quick Toggle */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p)}
                          title={`Click to ${p.status === "active" ? "disable" : "enable"}`}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition ${
                            p.status === "active"
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : p.status === "draft"
                              ? "bg-surface-3 text-fg-2 hover:bg-line"
                              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {p.status === "active" ? (
                            <>
                              <Eye className="h-3 w-3 text-emerald-600" /> Active
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 text-muted" /> {p.status}
                            </>
                          )}
                        </button>
                      </td>

                      {/* Compliance requirement flag */}
                      <td className="px-4 py-3">
                        {p.isRestricted ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                            <ShieldAlert className="h-3 w-3 text-rose-500" />
                            {p.ageRequirement ? `${p.ageRequirement}+ Required` : "Restricted"}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted">Standard</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Quick Price/Stock edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenQuickEdit(p)}
                            title="Quick Edit Price & Stock"
                            className="rounded-lg border border-line bg-surface-2 p-1.5 text-fg-2 hover:bg-surface-3 hover:text-brand-hover"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                          </button>

                          {/* Edit Full Product */}
                          <Link
                            href={`/admin/products/${p._id}/edit`}
                            title="Edit Product"
                            className="rounded-lg border border-line bg-surface-2 p-1.5 text-fg-2 hover:bg-surface-3 hover:text-brand-hover"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Link>

                          {/* Delete Product (Admin only) */}
                          <button
                            type="button"
                            onClick={() => setDeleteProductTarget(p)}
                            title="Delete Product"
                            className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Edit Price & Stock Modal */}
      {quickEditProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <h3 className="text-base font-bold text-fg">
              Quick Update: Price & Stock
            </h3>
            <p className="text-xs text-muted mt-1 truncate">{quickEditProduct.name}</p>

            <form onSubmit={handleSaveQuickEdit} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-fg-2">
                  Regular Price (₹) *
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-bold">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-line bg-bg py-2 pl-7 pr-3 font-semibold text-fg focus:border-brand focus:bg-surface focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-fg-2">
                  Discount Price (₹) <span className="font-normal text-muted">(Optional)</span>
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-bold">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={editDiscountPrice}
                    onChange={(e) => setEditDiscountPrice(e.target.value)}
                    placeholder="Leave empty if no discount"
                    className="w-full rounded-xl border border-line bg-bg py-2 pl-7 pr-3 font-semibold text-fg focus:border-brand focus:bg-surface focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-fg-2">
                  Inventory Stock Count *
                </label>
                <div className="relative mt-1">
                  <Boxes className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <input
                    type="number"
                    min="0"
                    required
                    value={editStock}
                    onChange={(e) => setEditStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl border border-line bg-bg py-2 pl-9 pr-3 font-semibold text-fg focus:border-brand focus:bg-surface focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setQuickEditProduct(null)}
                  className="rounded-xl border border-line bg-surface px-4 py-2 font-semibold text-fg-2 hover:bg-surface-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuickEdit}
                  className="rounded-xl bg-brand px-4 py-2 font-semibold text-white shadow-md shadow-brand/20 hover:bg-brand-hover disabled:opacity-50"
                >
                  {savingQuickEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteProductTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-surface p-6 shadow-2xl dark:border-rose-900/50">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/60">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-fg">Delete Product</h3>
            </div>

            <p className="mt-3 text-xs text-fg-2">
              Are you sure you want to permanently delete{" "}
              <strong className="text-fg">{deleteProductTarget.name}</strong> (SKU:{" "}
              <code className="font-mono text-brand-ink">{deleteProductTarget.sku}</code>)?
              This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setDeleteProductTarget(null)}
                className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-fg-2 hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteProduct}
                className="rounded-xl border border-rose-300 bg-surface px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40 transition disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
