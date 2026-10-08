"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  BadgePercent,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  GalleryHorizontal,
  GripVertical,
  Images,
  Info,
  LayoutGrid,
  LogIn,
  Megaphone,
  Plus,
  RectangleHorizontal,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { PRODUCT_SOURCES, SECTION_META, type LandingSection, type SectionType } from "@/lib/landing/config";
import { IconButton } from "./fields";

export const SECTION_ICONS: Record<SectionType, LucideIcon> = {
  hero: Images,
  topCategories: LayoutGrid,
  announcement: Megaphone,
  cardRow: LayoutGrid,
  dealsShelf: BadgePercent,
  productShelf: GalleryHorizontal,
  spotlight: Sparkles,
  promoBanner: RectangleHorizontal,
  guarantees: ShieldCheck,
  storeInfo: Info,
  signInNudge: LogIn,
};

export function sectionTitle(s: LandingSection): string {
  if (s.label) return s.label;
  switch (s.type) {
    case "topCategories":
    case "dealsShelf":
    case "productShelf":
    case "promoBanner":
      return s.title || SECTION_META[s.type].name;
    default:
      return SECTION_META[s.type].name;
  }
}

function sectionSummary(s: LandingSection): string {
  switch (s.type) {
    case "hero":
      return `${s.slides.length} slide${s.slides.length === 1 ? "" : "s"}`;
    case "topCategories":
      return `${s.items.length} categories`;
    case "cardRow":
      return `${s.cards.length} card${s.cards.length === 1 ? "" : "s"}`;
    case "productShelf":
      return s.source === "category" ? `Category: ${s.categorySlug || "not set"}` : PRODUCT_SOURCES[s.source];
    case "guarantees":
      return `${s.items.length} badges`;
    case "spotlight":
      return s.productSlug ? "Chosen product" : "Automatic product";
    case "announcement":
      return s.text;
    default:
      return SECTION_META[s.type].name;
  }
}

export function SectionList({
  sections,
  selectedId,
  errorIds,
  onSelect,
  onChange,
  onAdd,
}: {
  sections: LandingSection[];
  selectedId: string | null;
  errorIds: Set<string>;
  onSelect: (id: string) => void;
  onChange: (sections: LandingSection[]) => void;
  onAdd: () => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= sections.length || from === to) return;
    const next = [...sections];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <ol className="space-y-1.5" aria-label="Homepage sections, top to bottom">
        {sections.map((s, i) => {
          const Icon = SECTION_ICONS[s.type];
          const selected = s.id === selectedId;
          const hasError = errorIds.has(s.id);
          return (
            <li
              key={s.id}
              draggable
              onDragStart={(e) => {
                setDragIndex(i);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", s.id);
              }}
              onDragOver={(e) => {
                if (dragIndex === null) return;
                e.preventDefault();
                setOverIndex(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) move(dragIndex, i);
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={`group relative flex items-center gap-1 rounded-xl border bg-surface pr-1 transition ${
                selected ? "border-brand ring-2 ring-brand/20" : hasError ? "border-brand/60" : "border-line hover:border-line-strong"
              } ${dragIndex === i ? "opacity-40" : ""} ${
                overIndex === i && dragIndex !== null && dragIndex !== i
                  ? dragIndex < i
                    ? "after:absolute after:inset-x-2 after:-bottom-[5px] after:h-0.5 after:rounded after:bg-brand"
                    : "after:absolute after:inset-x-2 after:-top-[5px] after:h-0.5 after:rounded after:bg-brand"
                  : ""
              }`}
            >
              <span className="flex h-full cursor-grab items-center pl-1.5 text-muted active:cursor-grabbing" title="Drag to reorder" aria-hidden="true">
                <GripVertical className="h-4 w-4" />
              </span>
              <button type="button" onClick={() => onSelect(s.id)} className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-left">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.enabled ? "bg-brand-soft text-brand-ink" : "bg-surface-3 text-muted"}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-xs font-bold ${s.enabled ? "text-fg" : "text-muted line-through"}`}>{sectionTitle(s)}</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-muted">
                    <span className="truncate">{sectionSummary(s)}</span>
                    {s.audience !== "all" && <span className="chip chip-neutral shrink-0 px-1 py-0 text-[9px]">{s.audience === "guests" ? "Signed out" : "Signed in"}</span>}
                    {hasError && <span className="chip chip-soft shrink-0 px-1 py-0 text-[9px]">Needs fixing</span>}
                  </span>
                </span>
              </button>
              <div className="flex items-center opacity-100 transition lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
                <IconButton label="Move up" onClick={() => move(i, i - 1)} disabled={i === 0}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton label="Move down" onClick={() => move(i, i + 1)} disabled={i === sections.length - 1}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </IconButton>
              </div>
              <IconButton
                label={s.enabled ? "Hide section" : "Show section"}
                onClick={() => onChange(sections.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)))}
              >
                {s.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </IconButton>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={onAdd}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong py-2.5 text-xs font-bold text-fg-2 transition hover:border-brand hover:bg-brand-soft hover:text-brand-ink"
      >
        <Plus className="h-4 w-4" /> Add section
      </button>
      <p className="text-center text-[11px] text-muted">Top of the list is the top of the page. Drag or use the arrows to reorder.</p>
    </div>
  );
}

/** Section actions shown in the editor header */
export function SectionActions({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center">
      <IconButton label="Duplicate section" onClick={onDuplicate}>
        <Copy className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton label="Delete section" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  );
}

export const PLACE_TOP = "__top";
export const PLACE_END = "__end";

/**
 * Section library. `placement` is PLACE_TOP, PLACE_END, or the id of the section to insert after.
 */
export function AddSectionDialog({
  open,
  sections,
  defaultPlacement,
  onClose,
  onPick,
}: {
  open: boolean;
  sections: LandingSection[];
  defaultPlacement: string;
  onClose: () => void;
  onPick: (type: SectionType, placement: string) => void;
}) {
  if (!open) return null;
  return createPortal(
    <AddSectionDialogBody sections={sections} defaultPlacement={defaultPlacement} onClose={onClose} onPick={onPick} />,
    document.body
  );
}

function AddSectionDialogBody({
  sections,
  defaultPlacement,
  onClose,
  onPick,
}: {
  sections: LandingSection[];
  defaultPlacement: string;
  onClose: () => void;
  onPick: (type: SectionType, placement: string) => void;
}) {
  const [placement, setPlacement] = useState(defaultPlacement);
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-section-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="max-h-[85vh] w-full max-w-2xl animate-pop-in overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-pop sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="add-section-title" className="text-base font-bold text-fg">
              Add a section
            </h2>
            <p className="text-xs text-muted">Pick where it goes, then what it is. You can drag it somewhere else later.</p>
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <label htmlFor="add-section-placement" className="label text-xs">
          Place it
        </label>
        <select
          id="add-section-placement"
          value={placement}
          onChange={(e) => setPlacement(e.target.value)}
          className="input mb-4 py-2 text-[13px]"
        >
          <option value={PLACE_TOP}>At the top of the page</option>
          {sections.map((s, i) => (
            <option key={s.id} value={s.id}>
              After {i + 1}. {sectionTitle(s)}
              {s.enabled ? "" : " (hidden)"}
            </option>
          ))}
          <option value={PLACE_END}>At the bottom of the page</option>
        </select>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(SECTION_META) as SectionType[]).map((type, i) => {
            const Icon = SECTION_ICONS[type];
            return (
              <button
                key={type}
                type="button"
                autoFocus={i === 0}
                onClick={() => onPick(type, placement)}
                className="flex items-start gap-3 rounded-xl border border-line p-3 text-left transition hover:border-brand hover:bg-brand-soft focus-visible:border-brand"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-xs font-bold text-fg">{SECTION_META[type].name}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-fg-2">{SECTION_META[type].description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
