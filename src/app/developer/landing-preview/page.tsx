"use client";

import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { LandingPage } from "@/components/home/LandingPage";
import { normalizeLandingConfig, type LandingConfig } from "@/lib/landing/config";
import {
  PREVIEW_SOURCE,
  isEditorMessage,
  type PreviewPayload,
  type ViewAs,
} from "@/lib/landing/preview-protocol";

/**
 * Draft homepage preview (DEVELOPER only — guarded by middleware).
 * Embedded in /developer/customize it renders whatever the editor sends, live;
 * opened directly it shows the last saved draft.
 */
const noopSubscribe = () => () => {};

export default function LandingPreviewPage() {
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewAs, setViewAs] = useState<ViewAs>("guest");
  // null during SSR; on the client: is this page inside the editor's iframe?
  const embedded = useSyncExternalStore<boolean | null>(
    noopSubscribe,
    () => window.parent !== window,
    () => null
  );

  const postToEditor = useCallback((msg: PreviewPayload) => {
    if (window.parent !== window) window.parent.postMessage({ source: PREVIEW_SOURCE, ...msg }, window.location.origin);
  }, []);

  useEffect(() => {
    const isEmbedded = window.parent !== window;

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent || !isEditorMessage(e.data)) return;
      const msg = e.data;
      if (msg.type === "update") {
        setConfig(msg.config);
        setSelectedId(msg.selectedId);
        setViewAs(msg.viewAs);
      } else if (msg.type === "scrollTo") {
        // Scroll only this frame (scrollIntoView would also scroll the editor page around the iframe)
        const el = document.querySelector(`[data-section-id="${CSS.escape(msg.id)}"]`);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140, behavior: "smooth" });
      }
    };
    window.addEventListener("message", onMessage);

    // Inside the editor: keep the admin on this page — clicks select sections instead of navigating
    const blockNavigation = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.("a[href]")) e.preventDefault();
    };
    if (isEmbedded) {
      document.addEventListener("click", blockNavigation, true);
      window.parent.postMessage({ source: PREVIEW_SOURCE, type: "ready" }, window.location.origin);
    } else {
      fetch("/api/developer/landing", { cache: "no-store" })
        .then((r) => r.json())
        .then((json) => setConfig(normalizeLandingConfig(json?.data?.draft)))
        .catch(() => setConfig(normalizeLandingConfig(null)));
    }

    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("click", blockNavigation, true);
    };
  }, []);

  const onSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      postToEditor({ type: "select", id });
    },
    [postToEditor]
  );

  if (!config) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-fg-2">Loading preview…</div>;
  }

  return (
    <>
      {embedded === false && (
        <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-warn-soft px-4 py-2 text-center text-sm text-fg">
          <Eye className="h-4 w-4 text-warn" aria-hidden="true" />
          <span>
            <strong>Draft preview.</strong> Visitors still see the published homepage.
          </span>
          <Link href="/developer/customize" className="link">
            Back to editor
          </Link>
        </div>
      )}
      <LandingPage
        config={config}
        preview={embedded ? { viewAs, selectedId, onSelect } : undefined}
      />
    </>
  );
}
