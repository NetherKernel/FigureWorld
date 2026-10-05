"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Plus,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  Edit2,
  AlertCircle,
  RefreshCw,
  FolderTree,
  CornerDownRight,
  Sparkles,
  Search,
} from "lucide-react";

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parentCategory?: string | { _id: string; name: string; slug: string } | null;
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
  const [parentCategory, setParentCategory] = useState("");
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isRestricted, setIsRestricted] = useState(false);
  const [minAge, setMinAge] = useState(18);
  const [requiresId, setRequiresId] = useState(false);
  const [disclaimer, setDisclaimer] = useState("");
  const [regions, setRegions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<"all" | "parents" | "subcategories">("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const rootCategories = categories.filter((c) => !c.parentCategory);
  const subcategoryItems = categories.filter((c) => Boolean(c.parentCategory));

  const getSubcategoriesCount = (parentId: string) => {
    return categories.filter((c) => {
      const pid = typeof c.parentCategory === "object" ? c.parentCategory?._id : c.parentCategory;
      return pid === parentId;
    }).length;
  };

  const openCreateModal = (initialParentId?: string) => {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setDescription("");
    setParentCategory(initialParentId || "");
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
    const parentId =
      typeof cat.parentCategory === "object" ? cat.parentCategory?._id || "" : cat.parentCategory || "";
    setParentCategory(parentId);
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
      parentCategory: parentCategory ? parentCategory : null,
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
        setFeedback({ type: "success", text: `Deleted "${catName}".` });
      } else {
        alert("Could not delete category.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeedFranchises = async () => {
    if (!confirm("Seed all anime franchises & subcategories (Dragon Ball, Marvel, DC, Jujutsu Kaisen, etc.)?"))
      return;
    try {
      setSeeding(true);
      setFeedback(null);
      const res = await fetch("/api/categories/seed", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          text: `Anime franchises seeded successfully! (${json.data?.createdSubs || 0} subcategories synced)`,
        });
        await fetchCategories();
      } else {
        setFeedback({ type: "error", text: json.error?.message || "Failed to seed franchises" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to seed franchises" });
    } finally {
      setSeeding(false);
    }
  };

  const filteredCategories = categories.filter((cat) => {
    const isSub = Boolean(cat.parentCategory);
    if (activeTab === "parents" && isSub) return false;
    if (activeTab === "subcategories" && !isSub) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const parentName = typeof cat.parentCategory === "object" ? cat.parentCategory?.name : "";
      return (
        cat.name.toLowerCase().includes(q) ||
        cat.slug.toLowerCase().includes(q) ||
        (parentName && parentName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-fg flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-brand" />
            Categories & Franchises
          </h1>
          <p className="text-xs text-muted mt-1">
            Manage parent departments, anime franchise subcategories, and 18+ legal compliance boundaries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSeedFranchises}
            disabled={seeding}
            className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/70 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            title="Seed Dragon Ball, Jujutsu Kaisen, Marvel, DC, One Piece and other franchise subcategories"
          >
            <Sparkles className={`h-3.5 w-3.5 text-amber-600 ${seeding ? "animate-spin" : ""}`} />
            <span>{seeding ? "Seeding..." : "Seed Anime Franchises"}</span>
          </button>
          <button
            type="button"
            onClick={fetchCategories}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-fg-2 hover:bg-surface-2 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-fg hover:bg-surface-2 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Category</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const actionFig = rootCategories.find(
                (c) => c.slug.includes("action") || c.name.toLowerCase().includes("action")
              );
              openCreateModal(actionFig ? actionFig._id : rootCategories[0]?._id || "");
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-brand px-4 py-2.5 text-xs font-black text-white hover:from-violet-500 hover:to-brand-hover transition shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
            title="Create a new anime franchise or subcategory"
          >
            <FolderTree className="h-4 w-4" />
            <span>+ Add Subcategory</span>
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

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-1 border border-line text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-3 py-1.5 transition ${
              activeTab === "all" ? "bg-surface font-bold text-fg shadow-xs" : "text-muted hover:text-fg"
            }`}
          >
            All Categories ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("parents")}
            className={`rounded-lg px-3 py-1.5 transition ${
              activeTab === "parents" ? "bg-surface font-bold text-fg shadow-xs" : "text-muted hover:text-fg"
            }`}
          >
            Parent Departments ({rootCategories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("subcategories")}
            className={`rounded-lg px-3 py-1.5 transition ${
              activeTab === "subcategories" ? "bg-surface font-bold text-fg shadow-xs" : "text-muted hover:text-fg"
            }`}
          >
            Subcategories & Franchises ({subcategoryItems.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/subcategories"
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300"
          >
            <FolderTree className="h-3.5 w-3.5 text-indigo-600" />
            <span>Dedicated Hub &rarr;</span>
          </Link>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter categories & franchises..."
              className="w-full rounded-xl border border-line bg-surface pl-8 pr-3 py-1.5 text-xs text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>
      </div>

      {/* Categories Grid / Table */}
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="border-b border-line text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="pb-3 w-16">Order</th>
                <th className="pb-3">Category / Franchise Name</th>
                <th className="pb-3">URL Slug</th>
                <th className="pb-3">Compliance & 18+ Rules</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">
                    No categories found. Try clearing your search or seed anime franchises.
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => {
                  const isSub = Boolean(cat.parentCategory);
                  const parentName =
                    typeof cat.parentCategory === "object" ? cat.parentCategory?.name : "";

                  return (
                    <tr key={cat._id} className="hover:bg-surface-2 transition">
                      <td className="py-3.5 font-bold text-muted">
                        #{cat.displayOrder || 1}
                      </td>
                      <td className="py-3.5">
                        {isSub ? (
                          <div className="flex items-center gap-2 pl-3">
                            <CornerDownRight className="h-4 w-4 text-brand-ink shrink-0" />
                            <div>
                              <div className="flex items-center gap-1 text-[10px] text-muted">
                                <span className="font-semibold text-fg-2">{parentName || "Parent"}</span>
                                <span>&gt;</span>
                              </div>
                              <p className="font-bold text-fg">{cat.name}</p>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-fg text-sm">{cat.name}</p>
                              <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-muted">
                                {getSubcategoriesCount(cat._id)} subcategories
                              </span>
                            </div>
                          </div>
                        )}
                        {cat.description && (
                          <p className="text-[11px] text-muted line-clamp-1 max-w-sm mt-0.5 pl-3">
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
                      <td className="py-3.5 text-right space-x-1.5">
                        {!isSub && (
                          <button
                            type="button"
                            onClick={() => openCreateModal(cat._id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-brand hover:from-violet-500 hover:to-brand-hover shadow-sm shadow-indigo-500/20 hover:shadow-md hover:scale-105 active:scale-95 transition-all"
                            title={`Add subcategory under ${cat.name}`}
                          >
                            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>+ Subcategory</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface-3 transition"
                          title="Edit Category"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat._id, cat.name)}
                          className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Delete Category"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-surface p-6 shadow-2xl border border-line space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-fg">
              {editingCategory ? "Edit Category & Compliance" : "Create New Category or Subcategory"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-fg-2 mb-1">
                  Parent Category (Optional)
                </label>
                <select
                  value={parentCategory}
                  onChange={(e) => setParentCategory(e.target.value)}
                  className="w-full rounded-xl border border-line px-3 py-2 bg-surface text-fg"
                >
                  <option value="">None (Top-Level Parent Department)</option>
                  {rootCategories
                    .filter((c) => !editingCategory || c._id !== editingCategory._id)
                    .map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-muted mt-1">
                  Select a parent to make this a franchise subcategory (e.g. Action Figures &gt; Dragon Ball).
                </p>
              </div>

              <div>
                <label className="block font-semibold text-fg-2 mb-1">
                  Category / Franchise Name
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
                  placeholder="e.g. Dragon Ball, Jujutsu Kaisen, Marvel"
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
                  placeholder="e.g. dragon-ball"
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
