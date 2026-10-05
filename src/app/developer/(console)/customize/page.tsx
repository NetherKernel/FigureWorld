"use client";

import React, { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Redo2,
  RotateCcw,
  Save,
  Send,
  Undo2,
} from "lucide-react";
import {
  DEFAULT_LANDING_CONFIG,
  SECTION_META,
  cloneWithNewIds,
  createSection,
  landingConfigSchema,
  type LandingConfig,
  type LandingSection,
  type SectionType,
} from "@/lib/landing/config";
import type { LandingState } from "@/lib/landing/store";
import { PreviewPane } from "@/components/admin/landing/PreviewPane";
import { SectionEditor, type SectionErrors } from "@/components/admin/landing/SectionEditor";
import {
  AddSectionDialog,
  PLACE_END,
  PLACE_TOP,
  SECTION_ICONS,
  SectionActions,
  SectionList,
  sectionTitle,
} from "@/components/admin/landing/SectionList";

/* ------------------------------------------------------------------ */
/* Editing state with undo/redo. Rapid edits to the same section (typing) coalesce into one undo step. */

interface History {
  config: LandingConfig | null;
  past: LandingConfig[];
  future: LandingConfig[];
  lastKey: string | null;
  lastAt: number;
}

type HistoryAction =
  | { type: "load"; config: LandingConfig }
  | { type: "edit"; config: LandingConfig; key?: string; at: number }
  | { type: "undo" }
  | { type: "redo" };

const MAX_HISTORY = 100;

function historyReducer(state: History, action: HistoryAction): History {
  switch (action.type) {
    case "load":
      return { config: action.config, past: [], future: [], lastKey: null, lastAt: 0 };
    case "edit": {
      if (!state.config) return state;
      const coalesce = !!action.key && action.key === state.lastKey && action.at - state.lastAt < 1000;
      return {
        config: action.config,
        past: coalesce ? state.past : [...state.past, state.config].slice(-MAX_HISTORY),
        future: [],
        lastKey: action.key ?? null,
        lastAt: action.at,
      };
    }
    case "undo": {
      if (!state.config || !state.past.length) return state;
      return {
        config: state.past[state.past.length - 1],
        past: state.past.slice(0, -1),
        future: [state.config, ...state.future],
        lastKey: null,
        lastAt: 0,
      };
    }
    case "redo": {
      if (!state.config || !state.future.length) return state;
      return {
        config: state.future[0],
        past: [...state.past, state.config],
        future: state.future.slice(1),
        lastKey: null,
        lastAt: 0,
      };
    }
  }
}

/** Client-side validation with the same schema the API enforces, grouped by section id. */
function validate(config: LandingConfig) {
  const result = landingConfigSchema.safeParse(config);
  const bySection = new Map<string, SectionErrors>();
  const general: string[] = [];
  if (!result.success) {
    for (const issue of result.error.issues) {
      const [root, index, ...rest] = issue.path;
      const section = root === "sections" && typeof index === "number" ? config.sections[index] : undefined;
      if (section && rest.length) {
        const errs = bySection.get(section.id) ?? {};
        errs[rest.join(".")] ??= issue.message;
        bySection.set(section.id, errs);
      } else {
        general.push(issue.message);
      }
    }
  }
  return { valid: result.success, bySection, general };
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null;

type Feedback = { type: "success" | "error"; text: string } | null;

export default function CustomizeLandingPage() {
  const [history, dispatch] = useReducer(historyReducer, { config: null, past: [], future: [], lastKey: null, lastAt: 0 });
  const config = history.config;
  const [server, setServer] = useState<LandingState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "save" | "publish" | "discard">(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrollRequest, setScrollRequest] = useState<{ id: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  // Last section the admin opened — new sections default to going right after it
  const [anchorId, setAnchorId] = useState<string | null>(null);

  const applyServerState = useCallback((state: LandingState) => {
    setServer(state);
    dispatch({ type: "load", config: state.draft });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/developer/landing", { cache: "no-store" });
        const json = await res.json();
        if (res.ok && json.success) applyServerState(json.data);
        else setLoadError(json.error?.message || "Couldn't load the homepage layout.");
      } catch {
        setLoadError("Network error while loading the homepage layout.");
      }
    })();
  }, [applyServerState]);

  const edit = useCallback((next: LandingConfig, key?: string) => dispatch({ type: "edit", config: next, key, at: Date.now() }), []);

  const savedJson = useMemo(() => (server ? JSON.stringify(server.draft) : ""), [server]);
  const publishedJson = useMemo(() => (server ? JSON.stringify(server.published) : ""), [server]);
  const configJson = useMemo(() => (config ? JSON.stringify(config) : ""), [config]);
  const dirty = !!config && configJson !== savedJson;
  const differsFromLive = !!config && configJson !== publishedJson;

  const validation = useMemo(() => (config ? validate(config) : null), [config]);
  const errorIds = useMemo(() => new Set(validation?.bySection.keys() ?? []), [validation]);

  const selected = config?.sections.find((s) => s.id === selectedId) ?? null;

  // Warn before leaving with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const selectSection = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) setAnchorId(id);
  }, []);

  const selectFromEditor = (id: string | null) => {
    selectSection(id);
    if (id) setScrollRequest({ id });
  };

  const ensureValid = (): boolean => {
    if (!validation || validation.valid) return true;
    const firstBad = config?.sections.find((s) => errorIds.has(s.id));
    if (firstBad) selectFromEditor(firstBad.id);
    setFeedback({ type: "error", text: validation.general[0] || "Some fields need fixing first — they're highlighted in the editor." });
    return false;
  };

  const request = async (method: "PUT" | "POST", body: unknown, kind: "save" | "publish" | "discard", successText: string) => {
    setBusy(kind);
    setFeedback(null);
    try {
      const res = await fetch("/api/developer/landing", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        // Keep undo history when saving/publishing what's on screen; reload after discard
        setServer(json.data);
        if (kind === "discard") dispatch({ type: "load", config: json.data.draft });
        setFeedback({ type: "success", text: successText });
      } else {
        const details = json.error?.details && typeof json.error.details === "object" ? Object.values(json.error.details)[0] : null;
        setFeedback({ type: "error", text: (details as string) || json.error?.message || "Something went wrong." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error — your changes are still here, try again." });
    } finally {
      setBusy(null);
    }
  };

  const saveDraft = () => {
    if (!config || !ensureValid()) return;
    request("PUT", { config }, "save", "Draft saved. Visitors won't see it until you publish.");
  };

  const publish = () => {
    if (!config || !ensureValid()) return;
    if (!window.confirm("Publish these changes? Everyone visiting the homepage will see them right away.")) return;
    request("POST", { action: "publish", config }, "publish", "Published — the homepage is live with your changes.");
  };

  const discard = () => {
    if (!window.confirm("Discard all unpublished changes and go back to the live homepage?")) return;
    request("POST", { action: "discard" }, "discard", "Changes discarded. The editor now matches the live homepage.");
  };

  const resetToDefault = () => {
    if (!config || !window.confirm("Replace the layout with the original Figure World homepage? You can undo this, and nothing goes live until you publish.")) return;
    edit(structuredClone(DEFAULT_LANDING_CONFIG));
    setSelectedId(null);
  };

  // Keyboard: Ctrl/⌘+S save, Ctrl/⌘+Z undo, Ctrl/⌘+Shift+Z or Ctrl+Y redo (text fields keep their own undo)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        document.getElementById("landing-save")?.click();
        return;
      }
      const inField = (e.target as HTMLElement | null)?.closest?.("input, textarea, select, [contenteditable]");
      if (inField) return;
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "undo" });
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        dispatch({ type: "redo" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------------- section operations ---------------- */

  const setSections = (sections: LandingSection[], key?: string) => config && edit({ ...config, sections }, key);

  const addSection = (type: SectionType, placement: string) => {
    if (!config) return;
    const section = createSection(type);
    const afterIndex = config.sections.findIndex((s) => s.id === placement);
    const at = placement === PLACE_TOP ? 0 : afterIndex >= 0 ? afterIndex + 1 : config.sections.length;
    const sections = [...config.sections];
    sections.splice(at, 0, section);
    setSections(sections);
    setAddOpen(false);
    // let the preview render it before scrolling there
    setTimeout(() => selectFromEditor(section.id), 50);
  };

  const duplicateSection = (s: LandingSection) => {
    if (!config) return;
    const copy = { ...cloneWithNewIds(s), label: `${sectionTitle(s)} (copy)`.slice(0, 60) };
    const sections = [...config.sections];
    sections.splice(sections.indexOf(s) + 1, 0, copy);
    setSections(sections);
    setTimeout(() => selectFromEditor(copy.id), 50);
  };

  const deleteSection = (s: LandingSection) => {
    if (!config || !window.confirm(`Delete “${sectionTitle(s)}”? You can undo this, or hide it instead to keep its content.`)) return;
    setSections(config.sections.filter((x) => x.id !== s.id));
    setSelectedId(null);
  };

  /* ---------------- render ---------------- */

  if (loadError) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft p-4 text-sm text-brand-ink">
        <AlertCircle className="h-4 w-4 shrink-0" /> {loadError}
      </div>
    );
  }

  if (!config || !server) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-xs text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading homepage layout…
      </div>
    );
  }

  const SelectedIcon = selected ? SECTION_ICONS[selected.type] : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-fg">Customize homepage</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            {dirty ? (
              <span className="chip bg-warn-soft text-warn">Unsaved changes</span>
            ) : differsFromLive ? (
              <span className="chip chip-soft">Draft saved · not live yet</span>
            ) : (
              <span className="chip bg-success-soft text-success">Live version</span>
            )}
            {server.publishedAt && (
              <span>
                Last published {fmt(server.publishedAt)}
                {server.publishedBy ? ` by ${server.publishedBy}` : ""}
              </span>
            )}
            {!server.publishedAt && <span>Showing the original homepage — nothing published from here yet</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-line bg-surface">
            <button
              type="button"
              onClick={() => dispatch({ type: "undo" })}
              disabled={!history.past.length}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
              className="flex h-8 w-9 items-center justify-center rounded-l-full text-fg-2 hover:bg-surface-2 disabled:opacity-30"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "redo" })}
              disabled={!history.future.length}
              title="Redo (Ctrl+Shift+Z)"
              aria-label="Redo"
              className="flex h-8 w-9 items-center justify-center rounded-r-full border-l border-line text-fg-2 hover:bg-surface-2 disabled:opacity-30"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
          <button type="button" onClick={resetToDefault} className="btn btn-ghost btn-sm" title="Start over from the original homepage layout">
            <RotateCcw className="h-3.5 w-3.5" /> Reset to original
          </button>
          {(differsFromLive || server.hasUnpublishedChanges) && (
            <button type="button" onClick={discard} disabled={!!busy} className="btn btn-ghost btn-sm">
              {busy === "discard" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Discard changes
            </button>
          )}
          <button id="landing-save" type="button" onClick={saveDraft} disabled={!!busy || !dirty} className="btn btn-secondary btn-sm" title="Save draft (Ctrl+S)">
            {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save draft
          </button>
          <button type="button" onClick={publish} disabled={!!busy || !differsFromLive} className="btn btn-primary btn-sm">
            {busy === "publish" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Publish
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`flex items-center gap-2 rounded-xl border p-3 text-xs ${
            feedback.type === "success" ? "border-success/30 bg-success-soft text-success" : "border-brand/30 bg-brand-soft text-brand-ink"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span className="flex-1">{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="font-semibold underline-offset-2 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Workspace */}
      <div className="grid gap-4 lg:h-[calc(100vh-150px)] lg:min-h-[620px] lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
          {selected && SelectedIcon ? (
            <>
              <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="flex h-7 items-center gap-1 rounded-md px-1.5 text-xs font-semibold text-fg-2 hover:bg-surface-3 hover:text-fg"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Sections
                </button>
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <SelectedIcon className="h-4 w-4 shrink-0 text-brand-ink" />
                  <span className="truncate text-xs font-bold text-fg">{sectionTitle(selected)}</span>
                </span>
                <SectionActions onDuplicate={() => duplicateSection(selected)} onDelete={() => deleteSection(selected)} />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <p className="mb-4 text-[11px] text-muted">{SECTION_META[selected.type].description}</p>
                <SectionEditor
                  key={selected.id}
                  section={selected}
                  errors={validation?.bySection.get(selected.id) ?? {}}
                  onChange={(next) => setSections(config.sections.map((s) => (s.id === next.id ? next : s)), `section:${next.id}`)}
                />
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-line px-4 py-3">
                <h2 className="text-sm font-bold text-fg">Page sections</h2>
                <p className="text-[11px] text-muted">Choose what appears on the homepage and where. Click a section here or in the preview to edit it.</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <SectionList
                  sections={config.sections}
                  selectedId={selectedId}
                  errorIds={errorIds}
                  onSelect={selectFromEditor}
                  onChange={(sections) => setSections(sections)}
                  onAdd={() => setAddOpen(true)}
                />
              </div>
            </>
          )}
        </aside>

        <div className="h-[75vh] min-h-0 lg:h-auto">
          <PreviewPane config={config} selectedId={selectedId} scrollRequest={scrollRequest} onSelect={selectSection} />
        </div>
      </div>

      <AddSectionDialog
        open={addOpen}
        sections={config.sections}
        defaultPlacement={anchorId && config.sections.some((s) => s.id === anchorId) ? anchorId : PLACE_END}
        onClose={() => setAddOpen(false)}
        onPick={addSection}
      />
    </div>
  );
}
