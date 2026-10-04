"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Package,
  ArrowLeft,
  Upload,
  Save,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Image as ImageIcon,
  Sparkles,
  Info,
  RefreshCw,
} from "lucide-react";

interface ICategory {
  _id: string;
  name: string;
  slug: string;
  isRestricted: boolean;
  complianceRequirements?: {
    minAge: number;
    requiresIdVerification: boolean;
    disclaimerText: string;
    restrictedRegions: string[];
  };
}

interface IImageInput {
  url: string;
  altText: string;
  isPrimary: boolean;
}

export default function EditProductPage() {
  const router = useRouter();
  const routeParams = useParams();
  const productId = routeParams.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [sku, setSku] = useState("");
  const [weight, setWeight] = useState("500");
  const [length, setLength] = useState("15");
  const [width, setWidth] = useState("15");
  const [height, setHeight] = useState("25");
  const [unit, setUnit] = useState("cm");
  const [status, setStatus] = useState<"draft" | "active" | "archived" | "preorder">("active");
  const [isFeatured, setIsFeatured] = useState(false);

  // Compliance Fields
  const [isRestricted, setIsRestricted] = useState(false);
  const [ageRequirement, setAgeRequirement] = useState("0");
  const [shippingRestrictionsStr, setShippingRestrictionsStr] = useState("");

  // Images
  const [images, setImages] = useState<IImageInput[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [manualImageUrl, setManualImageUrl] = useState("");

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load Categories and Existing Product
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [catRes, prodRes] = await Promise.all([
          fetch("/api/categories"),
          fetch(`/api/products/${productId}`),
        ]);

        const catData = await catRes.json();
        if (catData.success && catData.data?.categories) {
          setCategories(catData.data.categories);
        }

        const prodData = await prodRes.json();
        if (prodData.success && prodData.data?.product) {
          const p = prodData.data.product;
          setName(p.name || "");
          setSlug(p.slug || "");
          setDescription(p.description || "");
          setPrice(String(p.price || ""));
          setDiscountPrice(p.discountPrice ? String(p.discountPrice) : "");
          setStock(String(p.stock ?? "0"));
          setCategory(typeof p.category === "object" ? p.category._id : p.category);
          setBrand(p.brand || "");
          setSku(p.sku || "");
          setWeight(String(p.weight || "500"));
          setLength(String(p.dimensions?.length || "15"));
          setWidth(String(p.dimensions?.width || "15"));
          setHeight(String(p.dimensions?.height || "25"));
          setUnit(p.dimensions?.unit || "cm");
          setStatus(p.status || "active");
          setIsFeatured(Boolean(p.isFeatured));
          setIsRestricted(Boolean(p.isRestricted));
          setAgeRequirement(String(p.ageRequirement || "0"));
          setShippingRestrictionsStr(p.shippingRestrictions?.join(", ") || "");
          setImages(p.images || []);
        } else {
          setError(prodData.message || "Failed to load product");
        }
      } catch (err: any) {
        setError(err.message || "Error fetching product data");
      } finally {
        setLoading(false);
      }
    }
    if (productId) {
      loadData();
    }
  }, [productId]);

  // Upload image via /api/upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.data?.url) {
        const isFirst = images.length === 0;
        setImages((prev) => [
          ...prev,
          {
            url: data.data.url,
            altText: file.name.split(".")[0],
            isPrimary: isFirst,
          },
        ]);
      } else {
        setError(data.message || "Upload failed");
      }
    } catch (err: any) {
      setError(err.message || "Network error uploading image");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddManualImage = () => {
    if (!manualImageUrl.trim()) return;
    const isFirst = images.length === 0;
    setImages((prev) => [
      ...prev,
      {
        url: manualImageUrl.trim(),
        altText: name || "Product image",
        isPrimary: isFirst,
      },
    ]);
    setManualImageUrl("");
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
        updated[0].isPrimary = true;
      }
      return updated;
    });
  };

  const handleSetPrimary = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        isPrimary: i === index,
      }))
    );
  };

  // Submit product update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const shippingRestrictions = shippingRestrictionsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name,
        slug,
        description,
        price: parseFloat(price),
        discountPrice: discountPrice.trim() ? parseFloat(discountPrice) : undefined,
        stock: parseInt(stock, 10),
        category,
        brand: brand.trim() || undefined,
        sku: sku.toUpperCase().trim(),
        weight: parseFloat(weight) || 500,
        dimensions: {
          length: parseFloat(length) || 0,
          width: parseFloat(width) || 0,
          height: parseFloat(height) || 0,
          unit,
        },
        images,
        status,
        isFeatured,
        isRestricted,
        ageRequirement: isRestricted ? parseInt(ageRequirement, 10) || 18 : 0,
        shippingRestrictions: isRestricted ? shippingRestrictions : [],
      };

      const res = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(`Product "${name}" updated successfully!`);
        setTimeout(() => {
          router.push("/admin/products");
        }, 1200);
      } else {
        setError(data.message || "Failed to update product");
      }
    } catch (err: any) {
      setError(err.message || "Network error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center text-muted">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-brand-ink" />
        <p className="font-semibold text-sm">Loading product details...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-brand-hover"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Products
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">
            Edit Product
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Modify price, inventory, images, and legal compliance.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Product Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Section 1: Basic Information */}
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <Package className="h-4 w-4 text-brand-ink" />
            <h2 className="text-sm font-bold text-fg">Basic Information</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-semibold text-fg-2">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg py-2 px-3 text-fg focus:border-brand focus:bg-surface focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-fg-2">
                Product Slug *
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
                className="mt-1 w-full rounded-xl border border-line bg-bg py-2 px-3 font-mono text-fg focus:border-brand focus:bg-surface focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-fg-2">
                SKU (Stock Keeping Unit) *
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-xl border border-line bg-bg py-2 px-3 font-mono text-fg focus:border-brand focus:bg-surface focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-fg-2">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg py-2 px-3 text-fg focus:border-brand focus:bg-surface focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-fg-2">
                Category *
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg py-2 px-3 text-fg focus:border-brand focus:bg-surface focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.isRestricted ? "⚠️ (Restricted Category — 18+ Rules Apply)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-fg-2">
                Description *
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg py-2 px-3 text-fg focus:border-brand focus:bg-surface focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Pricing & Inventory */}
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <Sparkles className="h-4 w-4 text-brand-ink" />
            <h2 className="text-sm font-bold text-fg">Pricing & Inventory</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block font-semibold text-fg-2">
                Regular Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg py-2 px-3 font-semibold text-fg focus:border-brand focus:bg-surface focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-fg-2">
                Discount Price ($) <span className="font-normal text-muted">(Optional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountPrice}
                onChange={(e) => setDiscountPrice(e.target.value)}
                placeholder="Leave empty if no discount"
                className="mt-1 w-full rounded-xl border border-line bg-bg py-2 px-3 font-semibold text-fg focus:border-brand focus:bg-surface focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-fg-2">
                Inventory Stock *
              </label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg py-2 px-3 font-semibold text-fg focus:border-brand focus:bg-surface focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-fg-2">
                Product Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-line bg-bg py-2 px-3 text-fg focus:border-brand focus:bg-surface focus:outline-none"
              >
                <option value="active">Active (Visible)</option>
                <option value="draft">Draft (Disabled / Hidden)</option>
                <option value="preorder">Pre-Order</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-line-strong accent-brand text-brand-ink focus:ring-brand"
                />
                <span className="font-semibold text-fg">
                  Feature on Homepage
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Physical Specifications */}
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <Info className="h-4 w-4 text-brand-ink" />
            <h2 className="text-sm font-bold text-fg">
              Physical Specifications & Dimensions
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div>
              <label className="block font-semibold text-fg-2">
                Weight (grams)
              </label>
              <input
                type="number"
                min="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg py-2 px-3 font-mono text-fg focus:border-brand focus:bg-surface focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-fg-2">
                Length
              </label>
              <input
                type="number"
                min="0"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg py-2 px-3 font-mono text-fg focus:border-brand focus:bg-surface focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-fg-2">Width</label>
              <input
                type="number"
                min="0"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg py-2 px-3 font-mono text-fg focus:border-brand focus:bg-surface focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-fg-2">
                Height
              </label>
              <input
                type="number"
                min="0"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg py-2 px-3 font-mono text-fg focus:border-brand focus:bg-surface focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-fg-2">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-bg py-2 px-3 text-fg focus:border-brand focus:bg-surface focus:outline-none"
              >
                <option value="cm">Centimeters (cm)</option>
                <option value="in">Inches (in)</option>
                <option value="mm">Millimeters (mm)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Compliance & 18+ Restrictions */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 shadow-xs dark:border-rose-900/50 dark:bg-rose-950/20 space-y-4">
          <div className="flex items-center gap-2 border-b border-rose-200/60 pb-3 dark:border-rose-900/40">
            <ShieldAlert className="h-4 w-4 text-rose-600" />
            <h2 className="text-sm font-bold text-rose-950 dark:text-rose-200">
              Compliance & Age Restrictions
            </h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isRestricted}
                onChange={(e) => setIsRestricted(e.target.checked)}
                className="h-4 w-4 rounded border-line-strong text-rose-600 focus:ring-rose-500"
              />
              <span className="font-bold text-rose-900 dark:text-rose-200">
                Mark as Restricted Product (Subject to 18+ & Legal Restrictions)
              </span>
            </label>

            {isRestricted && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-rose-200/50 dark:border-rose-900/30">
                <div>
                  <label className="block font-semibold text-rose-900 dark:text-rose-300">
                    Minimum Age Requirement
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={ageRequirement}
                    onChange={(e) => setAgeRequirement(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-rose-200 bg-surface py-2 px-3 font-semibold text-rose-900 focus:border-rose-500 focus:outline-none dark:border-rose-900 dark:text-rose-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-rose-900 dark:text-rose-300">
                    Shipping Restrictions (Disallowed Regions)
                  </label>
                  <input
                    type="text"
                    value={shippingRestrictionsStr}
                    onChange={(e) => setShippingRestrictionsStr(e.target.value)}
                    placeholder="UK, NY-NYC, CA-SF (comma separated)"
                    className="mt-1 w-full rounded-xl border border-rose-200 bg-surface py-2 px-3 font-mono text-rose-900 focus:border-rose-500 focus:outline-none dark:border-rose-900 dark:text-rose-100"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Media & Images */}
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-brand-ink" />
              <h2 className="text-sm font-bold text-fg">Product Images</h2>
            </div>
            <span className="text-[11px] text-muted">Manage gallery and primary image</span>
          </div>

          {/* Upload and manual URL controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <input
                type="url"
                value={manualImageUrl}
                onChange={(e) => setManualImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full rounded-xl border border-line bg-bg py-2 px-3 text-fg focus:border-brand focus:bg-surface focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddManualImage}
                className="rounded-xl border border-line bg-surface-3 px-3 py-2 font-semibold text-fg-2 hover:bg-line"
              >
                Add Link
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />
              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-soft border border-brand/30 px-4 py-2 font-semibold text-brand-ink hover:bg-brand/15 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {uploadingImage ? "Uploading..." : "Upload Local File"}
              </button>
            </div>
          </div>

          {/* Images Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            {images.map((img, idx) => (
              <div
                key={idx}
                className={`relative rounded-xl border p-2 flex flex-col items-center gap-2 ${
                  img.isPrimary
                    ? "border-brand bg-brand-soft"
                    : "border-line bg-bg"
                }`}
              >
                <img
                  src={img.url}
                  alt={img.altText || "Product photo"}
                  className="h-28 w-full rounded-lg object-cover bg-surface-3"
                />
                <div className="w-full flex items-center justify-between text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(idx)}
                    className={`px-2 py-0.5 rounded font-bold ${
                      img.isPrimary
                        ? "bg-brand text-white"
                        : "bg-surface-3 text-fg-2 hover:bg-line"
                    }`}
                  >
                    {img.isPrimary ? "Primary" : "Set Primary"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="text-rose-600 hover:text-rose-700 p-1"
                    title="Remove Image"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
          <Link
            href="/admin/products"
            className="rounded-xl border border-line bg-surface px-5 py-2.5 font-semibold text-fg-2 hover:bg-surface-2"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 font-semibold text-white shadow-md shadow-brand/20 hover:bg-brand-hover transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {submitting ? "Saving Changes..." : "Save Product Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
