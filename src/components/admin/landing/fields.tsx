"use client";

import React, { useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImageUp, Loader2, Plus, Trash2 } from "lucide-react";
import { ICONS } from "@/components/home/LandingPage";
import { ICON_NAMES, type IconName } from "@/lib/landing/config";

/** Common storefront destinations offered as suggestions in link fields */
const LINK_SUGGESTIONS = [
  "/products",
  "/products?onSale=true",
  "/products?sort=newest",
  "/products?sort=rating",
  "/products?category=anime-figures",
  "/products?category=collectibles",
  "/products?category=katanas-replicas",
  "/products?category=keychains",
  "/products?category=posters",
  "/products?category=accessories",
  "/products?category=manga",
  "/products?maxPrice=2000&sort=price-asc",
  "/cart",
  "/profile",
  "/auth/register",
];

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label text-xs">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-[11px] font-semibold text-brand-ink">{error}</p>
      ) : (
        hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>
      )}
    </div>
  );
}

type Common = { label: string; hint?: string; error?: string };

export function TextField({
  value,
  onChange,
  placeholder,
  maxLength,
  ...field
}: Common & { value: string | undefined; onChange: (v: string) => void; placeholder?: string; maxLength?: number }) {
  const id = useId();
  return (
    <Field {...field} htmlFor={id}>
      <input
        id={id}
        type="text"
        value={value ?? ""}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!field.error}
        className="input py-2 text-[13px]"
      />
    </Field>
  );
}

export function TextArea({
  value,
  onChange,
  rows = 3,
  maxLength,
  ...field
}: Common & { value: string | undefined; onChange: (v: string) => void; rows?: number; maxLength?: number }) {
  const id = useId();
  return (
    <Field {...field} htmlFor={id}>
      <textarea
        id={id}
        rows={rows}
        value={value ?? ""}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!field.error}
        className="input resize-y py-2 text-[13px]"
      />
    </Field>
  );
}

export function NumberField({
  value,
  onChange,
  min,
  max,
  ...field
}: Common & { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const id = useId();
  return (
    <Field {...field} htmlFor={id}>
      <input
        id={id}
        type="number"
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        aria-invalid={!!field.error}
        className="input py-2 text-[13px]"
      />
    </Field>
  );
}

export function SelectField<T extends string>({
  value,
  onChange,
  options,
  ...field
}: Common & { value: T; onChange: (v: T) => void; options: Record<T, string> | Array<{ value: T; label: string }> }) {
  const id = useId();
  const list = Array.isArray(options) ? options : (Object.entries(options) as Array<[T, string]>).map(([v, l]) => ({ value: v, label: l }));
  return (
    <Field {...field} htmlFor={id}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className="input py-2 text-[13px]">
        {list.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3">
      <span>
        <span className="block text-xs font-bold text-fg">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] text-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-brand" : "bg-surface-3 ring-1 ring-inset ring-line-strong"}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

export function LinkField(props: Common & { value: string; onChange: (v: string) => void }) {
  const id = useId();
  const listId = `${id}-links`;
  return (
    <Field label={props.label} hint={props.hint ?? "A page on this site (e.g. /products?onSale=true) or a full https:// link"} error={props.error} htmlFor={id}>
      <input
        id={id}
        type="text"
        list={listId}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        aria-invalid={!!props.error}
        className="input py-2 font-mono text-[12px]"
      />
      <datalist id={listId}>
        {LINK_SUGGESTIONS.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
    </Field>
  );
}

export function ImageField({ label, value, onChange, error }: Common & { value: string; onChange: (v: string) => void }) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = await res.json();
      if (res.ok && json.success && json.data?.url) onChange(json.data.url);
      else setUploadError(json.error?.message || "Upload failed.");
    } catch {
      setUploadError("Network error during upload.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Field label={label} error={error || uploadError || undefined} htmlFor={id} hint="Upload an image (JPG, PNG, WEBP) or paste an image URL">
      <div className="flex gap-2">
        <div className="h-[52px] w-[72px] shrink-0 overflow-hidden rounded-md border border-line bg-surface-2">
          {value && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <input
            id={id}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!error}
            className="input py-1.5 font-mono text-[11px]"
          />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn btn-secondary btn-sm h-7 px-2.5 text-[11px]">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageUp className="h-3.5 w-3.5" />}
            {uploading ? "Uploading…" : "Upload image"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
        </div>
      </div>
    </Field>
  );
}

export function IconField({ value, onChange, label }: { value: IconName; onChange: (v: IconName) => void; label: string }) {
  return (
    <div>
      <span className="label text-xs">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
        {ICON_NAMES.map((name) => {
          const Icon = ICONS[name];
          const active = name === value;
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={name.replace(/-/g, " ")}
              title={name.replace(/-/g, " ")}
              onClick={() => onChange(name)}
              className={`flex h-8 w-8 items-center justify-center rounded-md border transition ${
                active ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-fg-2 hover:bg-surface-3"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Editable list of items (slides, cards, tiles…) with add / remove / reorder. */
export function ListEditor<T extends { id: string }>({
  title,
  items,
  onChange,
  renderItem,
  itemTitle,
  createItem,
  addLabel,
  min = 0,
  max = 20,
  errorFor,
}: {
  title: string;
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  itemTitle: (item: T, index: number) => string;
  createItem?: () => T;
  addLabel?: string;
  min?: number;
  max?: number;
  /** returns true if the item at index has a validation error (to auto-open + flag it) */
  errorFor?: (index: number) => boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold text-fg">
          {title} <span className="font-normal text-muted">({items.length})</span>
        </span>
        {createItem && items.length < max && (
          <button
            type="button"
            onClick={() => {
              const it = createItem();
              onChange([...items, it]);
              setOpenId(it.id);
            }}
            className="btn btn-ghost btn-sm h-7 px-2 text-[11px] text-brand-ink"
          >
            <Plus className="h-3.5 w-3.5" /> {addLabel || "Add"}
          </button>
        )}
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => {
          const open = openId === item.id;
          const hasError = errorFor?.(i);
          return (
            <li key={item.id} className={`rounded-lg border ${hasError ? "border-brand/60" : "border-line"} bg-surface`}>
              <div className="flex items-center gap-1 pr-1">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  aria-expanded={open}
                  className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-xs font-semibold text-fg"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-surface-3 text-[10px] font-bold text-fg-2">{i + 1}</span>
                  <span className="truncate">{itemTitle(item, i) || "Untitled"}</span>
                  {hasError && <span className="chip chip-soft shrink-0">Fix</span>}
                </button>
                <IconButton label="Move up" onClick={() => move(i, i - 1)} disabled={i === 0}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton label="Move down" onClick={() => move(i, i + 1)} disabled={i === items.length - 1}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton label="Remove" onClick={() => onChange(items.filter((x) => x.id !== item.id))} disabled={items.length <= min}>
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
              {(open || hasError) && (
                <div className="space-y-3 border-t border-line p-3">
                  {renderItem(item, (patch) => onChange(items.map((x) => (x.id === item.id ? { ...x, ...patch } : x))), i)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  disabled,
  children,
  active,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition disabled:pointer-events-none disabled:opacity-30 ${
        active ? "bg-brand-soft text-brand-ink" : "text-fg-2 hover:bg-surface-3 hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}
