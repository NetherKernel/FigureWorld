"use client";

import React, { useState, useEffect } from "react";
import { Layers, Plus, ShieldAlert, CheckCircle2, Trash2, Edit2, AlertCircle, RefreshCw } from "lucide-react";

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  isRestricted: boolean;
  complianceRequirements?: {
    minAge?: number;
    requiresIdVerification?: boolean;
    disclaimerText?: string;
    restrictedRegions?: string[];
  };
}

export default function DashboardCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isRestricted, setIsRestricted] = useState(false);
  const [minAge, setMinAge] = useState(18);
  const [requiresId, setRequiresId] = useState(false);
  const [disclaimer, setDisclaimer] = useState("");
  const [regions, setRegions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/categories");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setCategories(json.data.categories || []);
        }
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setDescription("");
    setDisplayOrder(categories.length + 1);
    setIsRestricted(false);
    setMinAge(18);
    setRequiresId(false);
    setDisclaimer("");
    setRegions("");
    setShowModal(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || "");
    setDisplayOrder(cat.displayOrder || 1);
    setIsRestricted(cat.isRestricted);
    setMinAge(cat.complianceRequirements?.minAge || 18);
    setRequiresId(cat.complianceRequirements?.requiresIdVerification || false);
    setDisclaimer(cat.complianceRequirements?.disclaimerText || "");
    setRegions((cat.complianceRequirements?.restrictedRegions || []).join(", "));
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const payload = {
      name,
      slug: slug.toLowerCase().trim().replace(/\s+/g, "-"),
      description,
      displayOrder: Number(displayOrder),
      isRestricted,
      complianceRequirements: isRestricted
        ? {
            minAge: Number(minAge),
            requiresIdVerification: requiresId,
            disclaimerText: disclaimer,
            restrictedRegions: regions
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          }
        : undefined,
    };

    try {
      const url = editingCategory ? `/api/categories/${editingCategory._id}` : "/api/categories";
      const method = editingCategory ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          text: editingCategory ? "Category updated successfully!" : "Category created successfully!",
        });
        setShowModal(false);
        fetchCategories();
      } else {
        setFeedback({
          type: "error",
          text: json.error?.message || "Failed to save category",
        });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to save category" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c._id !== id));
      } else {
        alert("Could not delete category.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-fg">
            Categories & Compliance
          </h1>
          <p className="text-xs text-muted mt-1">
            Store departments, display ordering, and 18+ legal compliance boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCategories}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-fg-2 hover:bg-surface-2 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-hover transition shadow-sm shadow-brand/30"
          >
            <Plus className="h-4 w-4" />
            <span>Add Category</span>
          </button>
        </div>
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

      {/* Categories Grid / Table */}
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead className="border-b border-line text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="pb-3">Order</th>
                <th className="pb-3">Category Name</th>
                <th className="pb-3">Slug</th>
                <th className="pb-3">Compliance & 18+ Rules</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {categories.map((cat) => (
                <tr key={cat._id} className="hover:bg-surface-2">
                  <td className="py-3.5 font-bold text-muted">
                    #{cat.displayOrder || 1}
                  </td>
                  <td className="py-3.5">
                    <p className="font-bold text-fg">{cat.name}</p>
                    {cat.description && (
                      <p className="text-[11px] text-muted line-clamp-1 max-w-xs mt-0.5">
                        {cat.description}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5">
                    <span className="font-mono text-[11px] text-brand-ink bg-brand-soft px-2 py-0.5 rounded-md">
                      {cat.slug}
                    </span>
                  </td>
                  <td className="py-3.5">
                    {cat.isRestricted ? (
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                        <span>Restricted ({cat.complianceRequirements?.minAge || 18}+ Age Gate)</span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                        <CheckCircle2 className="h-3 w-3" /> Standard Catalog
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(cat)}
                      className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface-3 transition"
                      title="Edit Category"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat._id, cat.name)}
                      className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Delete Category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-surface p-6 shadow-2xl border border-line space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-fg">
              {editingCategory ? "Edit Category & Compliance" : "Create New Category"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-fg-2 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingCategory) {
                      setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                    }
                  }}
                  className="w-full rounded-xl border border-line px-3 py-2 bg-surface text-fg"
                  placeholder="e.g. Scale Figures"
                />
              </div>

              <div>
                <label className="block font-semibold text-fg-2 mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-xl border border-line px-3 py-2 bg-surface text-fg font-mono"
                  placeholder="e.g. scale-figures"
                />
              </div>

              <div>
                <label className="block font-semibold text-fg-2 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-line px-3 py-2 bg-surface text-fg"
                  placeholder="Category purpose and product range..."
                />
              </div>

              <div>
                <label className="block font-semibold text-fg-2 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
                  className="w-full rounded-xl border border-line px-3 py-2 bg-surface text-fg"
                />
              </div>

              {/* Compliance section */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20 space-y-3">
                <label className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRestricted}
                    onChange={(e) => setIsRestricted(e.target.checked)}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>18+ Restricted Legal Category (Katanas / Replicas)</span>
                </label>

                {isRestricted && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block font-semibold text-amber-900 dark:text-amber-300 mb-1">
                        Minimum Age Gate
                      </label>
                      <input
                        type="number"
                        min="18"
                        value={minAge}
                        onChange={(e) => setMinAge(parseInt(e.target.value) || 18)}
                        className="w-full rounded-xl border border-amber-200 bg-surface px-3 py-1.5 dark:border-amber-800"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-amber-900 dark:text-amber-300">
                      <input
                        type="checkbox"
                        checked={requiresId}
                        onChange={(e) => setRequiresId(e.target.checked)}
                        className="rounded border-amber-300 text-amber-600"
                      />
                      <span>Enforce Government ID / Age Consent Check at Checkout</span>
                    </label>

                    <div>
                      <label className="block font-semibold text-amber-900 dark:text-amber-300 mb-1">
                        Restricted Territory Regions (comma-separated codes)
                      </label>
                      <input
                        type="text"
                        value={regions}
                        onChange={(e) => setRegions(e.target.value)}
                        placeholder="UK, NY-NYC, CA-SF"
                        className="w-full rounded-xl border border-amber-200 bg-surface px-3 py-1.5 dark:border-amber-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-fg-2 hover:bg-surface-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-hover shadow-md transition"
                >
                  {submitting ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
