"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderTree,
  Plus,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Edit2,
  Trash2,
  Layers,
  ArrowRight,
  Flame,
  Package,
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

export default function SubcategoriesDashboardPage() {
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

  // Filter State
  const [selectedParentFilter, setSelectedParentFilter] = useState("all");
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
  const subcategories = categories.filter((c) => Boolean(c.parentCategory));

  const openCreateModal = (initialParentId?: string) => {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setDescription("");
    // Default to first root category or provided ID
    setParentCategory(initialParentId || (rootCategories[0]?._id || ""));
    setDisplayOrder(subcategories.length + 1);
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
    if (!parentCategory) {
      setFeedback({ type: "error", text: "Please select a parent category for this subcategory." });
      return;
    }
    setSubmitting(true);
    setFeedback(null);

    const payload = {
      name,
      slug: slug.toLowerCase().trim().replace(/\s+/g, "-"),
      description,
      parentCategory,
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
          text: editingCategory ? `Subcategory "${name}" updated!` : `Subcategory "${name}" created!`,
        });
        setShowModal(false);
        fetchCategories();
      } else {
        setFeedback({
          type: "error",
          text: json.error?.message || "Failed to save subcategory",
        });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to save subcategory" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`Are you sure you want to delete subcategory "${catName}"?`)) return;

    try {
      setFeedback(null);
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success !== false) {
        setCategories((prev) => prev.filter((c) => c._id !== id));
        setFeedback({ type: "success", text: `Deleted subcategory "${catName}".` });
      } else {
        const errorMsg = json?.error?.message || json?.message || "Could not delete subcategory.";
        setFeedback({ type: "error", text: errorMsg });
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: "error", text: err.message || "Network error deleting subcategory" });
    }
  };

  const handleSeedFranchises = async () => {
    if (!confirm("Seed or sync all anime franchises (Dragon Ball, Marvel, DC, Jujutsu Kaisen, One Piece, etc.)?"))
      return;
    try {
      setSeeding(true);
      setFeedback(null);
      const res = await fetch("/api/categories/seed", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          text: `Anime franchises seeded successfully! (${json.data?.createdSubs || 0} new added)`,
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

  const filteredSubcategories = subcategories.filter((cat) => {
    const parentId = typeof cat.parentCategory === "object" ? cat.parentCategory?._id : cat.parentCategory;
    const parentSlug = typeof cat.parentCategory === "object" ? cat.parentCategory?.slug : "";
    if (selectedParentFilter !== "all" && parentId !== selectedParentFilter && parentSlug !== selectedParentFilter) {
      return false;
    }
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

  const actionFigureSubCount = subcategories.filter((c) => {
    const pslug = typeof c.parentCategory === "object" ? c.parentCategory?.slug : "";
    return pslug === "action-figures";
  }).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="rounded-3xl bg-gradient-to-br from-surface to-surface-2 p-6 md:p-8 border border-line shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-brand/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft text-brand-ink text-xs font-bold mb-3 border border-brand/20">
              <Flame className="h-3.5 w-3.5 text-brand" />
              <span>Anime Franchises & Universe Catalog</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-fg flex items-center gap-3">
              <FolderTree className="h-8 w-8 text-brand" />
              Franchises & Subcategories
            </h1>
            <p className="text-sm text-muted mt-1.5 max-w-2xl leading-relaxed">
              Organize your store by anime universe (Dragon Ball, Jujutsu Kaisen, Marvel, DC, One Piece) and nested
              franchise departments with custom display order and compliance flags.
            </p>
          </div>

          {/* Action Buttons: STYLISH AND BIG BUTTONS */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSeedFranchises}
              disabled={seeding}
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50/80 px-4 py-3 text-xs font-bold text-amber-900 hover:bg-amber-100 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
              title="Auto-seed 17+ anime franchises (Dragon Ball, Marvel, DC, One Piece, etc.)"
            >
              <Sparkles className={`h-4 w-4 text-amber-600 ${seeding ? "animate-spin" : ""}`} />
              <span>{seeding ? "Syncing Franchises..." : "Seed Franchises"}</span>
            </button>

            <button
              type="button"
              onClick={() => openCreateModal()}
              className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-brand px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.03] active:scale-[0.98] transition-all"
            >
              <Plus className="h-5 w-5 stroke-[2.5]" />
              <span className="tracking-wide uppercase text-xs">+ Add Subcategory</span>
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl p-4 text-xs font-medium flex items-center gap-2.5 shadow-xs ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wider">Total Subcategories</p>
            <p className="text-2xl font-black text-fg mt-1">{subcategories.length}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-brand-soft flex items-center justify-center text-brand-ink">
            <FolderTree className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wider">Action Figure Franchises</p>
            <p className="text-2xl font-black text-fg mt-1">{actionFigureSubCount}</p>
            <p className="text-[11px] text-muted mt-0.5">Dragon Ball, JJK, Marvel, DC, One Piece...</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 flex items-center justify-center">
            <Flame className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wider">Parent Departments</p>
            <p className="text-2xl font-black text-fg mt-1">{rootCategories.length}</p>
            <Link href="/dashboard/categories" className="text-[11px] font-semibold text-brand-ink hover:underline inline-flex items-center gap-1 mt-0.5">
              Manage parent categories <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center">
            <Layers className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Parent Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-surface-2 p-1.5 border border-line text-xs font-medium">
          <button
            type="button"
            onClick={() => setSelectedParentFilter("all")}
            className={`rounded-xl px-3.5 py-2 transition font-bold ${
              selectedParentFilter === "all" ? "bg-surface text-fg shadow-xs" : "text-muted hover:text-fg"
            }`}
          >
            All Franchises ({subcategories.length})
          </button>
          {rootCategories.map((rc) => {
            const count = subcategories.filter((s) => {
              const pid = typeof s.parentCategory === "object" ? s.parentCategory?._id : s.parentCategory;
              return pid === rc._id;
            }).length;

            return (
              <button
                key={rc._id}
                type="button"
                onClick={() => setSelectedParentFilter(rc._id)}
                className={`rounded-xl px-3 py-2 transition ${
                  selectedParentFilter === rc._id ? "bg-surface font-bold text-fg shadow-xs" : "text-muted hover:text-fg"
                }`}
              >
                {rc.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anime franchises..."
            className="w-full rounded-2xl border border-line bg-surface pl-10 pr-4 py-2.5 text-xs text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>
      </div>

      {/* Subcategories Table */}
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-fg flex items-center gap-2">
            <span>Franchises & Subcategories</span>
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-ink">
              {filteredSubcategories.length}
            </span>
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchCategories}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-fg-2 hover:bg-surface-2 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="border-b border-line text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="pb-3 w-16">Order</th>
                <th className="pb-3">Subcategory / Franchise</th>
                <th className="pb-3">Parent Department</th>
                <th className="pb-3">URL Slug</th>
                <th className="pb-3">Compliance</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredSubcategories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <FolderTree className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-fg">No subcategories found</p>
                    <p className="text-xs text-muted mt-1">Try switching tabs or click &quot;Seed Franchises&quot; to auto-generate all franchises.</p>
                  </td>
                </tr>
              ) : (
                filteredSubcategories.map((cat) => {
                  const parentName =
                    typeof cat.parentCategory === "object" ? cat.parentCategory?.name : "Parent Department";

                  return (
                    <tr key={cat._id} className="hover:bg-surface-2 transition">
                      <td className="py-3.5 font-bold text-muted">#{cat.displayOrder || 1}</td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-brand shrink-0" />
                          <div>
                            <p className="font-bold text-fg text-sm">{cat.name}</p>
                            {cat.description && (
                              <p className="text-[11px] text-muted line-clamp-1 max-w-sm mt-0.5">{cat.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-surface-3 px-2.5 py-1 text-[11px] font-bold text-fg-2">
                          <Layers className="h-3 w-3 text-muted" />
                          <span>{parentName}</span>
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className="font-mono text-[11px] text-brand-ink bg-brand-soft px-2.5 py-1 rounded-md font-semibold">
                          {cat.slug}
                        </span>
                      </td>
                      <td className="py-3.5">
                        {cat.isRestricted ? (
                          <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                            <span>18+ Gate</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Standard
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="p-2 rounded-xl text-muted hover:text-fg hover:bg-surface-3 transition"
                          title="Edit Subcategory"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat._id, cat.name)}
                          className="p-2 rounded-xl text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Delete Subcategory"
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

      {/* Create / Edit Subcategory Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-surface p-6 shadow-2xl border border-line space-y-4 max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-base font-bold text-fg flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-brand" />
                <span>{editingCategory ? "Edit Subcategory" : "Create New Franchise / Subcategory"}</span>
              </h2>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-fg-2 mb-1">
                  Parent Category Department *
                </label>
                <select
                  required
                  value={parentCategory}
                  onChange={(e) => setParentCategory(e.target.value)}
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 bg-surface text-fg font-medium focus:ring-2 focus:ring-brand/40"
                >
                  <option value="">Select Parent Department</option>
                  {rootCategories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-fg-2 mb-1">
                  Franchise / Subcategory Name *
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
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 bg-surface text-fg focus:ring-2 focus:ring-brand/40"
                  placeholder="e.g. Dragon Ball, Jujutsu Kaisen, Marvel"
                />
              </div>

              <div>
                <label className="block font-semibold text-fg-2 mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 bg-surface text-fg font-mono focus:ring-2 focus:ring-brand/40"
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
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 bg-surface text-fg focus:ring-2 focus:ring-brand/40"
                  placeholder="Franchise description and character figure range..."
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
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 bg-surface text-fg focus:ring-2 focus:ring-brand/40"
                />
              </div>

              {/* Compliance Section */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20 space-y-3">
                <label className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRestricted}
                    onChange={(e) => setIsRestricted(e.target.checked)}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>18+ Restricted Legal Franchise (e.g. Steel Replica Blades)</span>
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

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-fg-2 hover:bg-surface-2 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:brightness-110 shadow-md transition"
                >
                  {submitting ? "Saving..." : editingCategory ? "Update Subcategory" : "Create Subcategory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
