"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ExternalLink, Monitor, RotateCw, Smartphone, Tablet, User, UserX } from "lucide-react";
import type { LandingConfig } from "@/lib/landing/config";
import {
  EDITOR_SOURCE,
  PREVIEW_PATH,
  isPreviewMessage,
  type EditorPayload,
  type ViewAs,
} from "@/lib/landing/preview-protocol";

const DEVICES = {
  desktop: { label: "Desktop", width: 1366, icon: Monitor },
  tablet: { label: "Tablet", width: 820, icon: Tablet },
  mobile: { label: "Phone", width: 390, icon: Smartphone },
} as const;
type Device = keyof typeof DEVICES;

/**
 * Live preview of the draft: an iframe of /developer/landing-preview rendered at a real device width
 * and scaled to fit. Every edit is pushed in via postMessage, so changes show instantly without saving.
 */
export function PreviewPane({
  config,
  selectedId,
  scrollRequest,
  onSelect,
}: {
  config: LandingConfig;
  selectedId: string | null;
  /** a new object scrolls the preview to that section (when the selection came from the editor, not the preview) */
  scrollRequest: { id: string } | null;
  onSelect: (id: string) => void;
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const [viewAs, setViewAs] = useState<ViewAs>("guest");
  const [ready, setReady] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const post = useCallback(
    (msg: EditorPayload) => frameRef.current?.contentWindow?.postMessage({ source: EDITOR_SOURCE, ...msg }, window.location.origin),
    []
  );

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Messages from the preview: "ready" (send it the draft) and "select" (admin clicked a section)
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frameRef.current?.contentWindow || !isPreviewMessage(e.data)) return;
      if (e.data.type === "ready") setReady(true);
      if (e.data.type === "select") onSelectRef.current(e.data.id);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Push the draft on every change
  useEffect(() => {
    if (ready) post({ type: "update", config, selectedId, viewAs });
  }, [ready, config, selectedId, viewAs, post]);

  useEffect(() => {
    if (ready && scrollRequest) post({ type: "scrollTo", id: scrollRequest.id });
  }, [scrollRequest, ready, post]);

  const deviceWidth = DEVICES[device].width;
  const scale = box.width ? Math.min(1, box.width / deviceWidth) : 1;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div role="radiogroup" aria-label="Preview device" className="flex rounded-lg bg-surface-2 p-0.5">
          {(Object.keys(DEVICES) as Device[]).map((d) => {
            const { label, icon: Icon } = DEVICES[d];
            return (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={device === d}
                aria-label={label}
                onClick={() => setDevice(d)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                  device === d ? "bg-surface text-fg shadow-sm" : "text-fg-2 hover:text-fg"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        <div role="radiogroup" aria-label="Preview as" className="flex rounded-lg bg-surface-2 p-0.5">
          {(
            [
              ["guest", "Signed out", UserX],
              ["member", "Signed in", User],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={viewAs === v}
              onClick={() => setViewAs(v)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                viewAs === v ? "bg-surface text-fg shadow-sm" : "text-fg-2 hover:text-fg"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="hidden text-[11px] text-muted lg:inline">
            {deviceWidth}px · {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => {
              setReady(false);
              setReloadKey((k) => k + 1);
            }}
            title="Reload preview"
            aria-label="Reload preview"
            className="flex h-7 w-7 items-center justify-center rounded-md text-fg-2 hover:bg-surface-3 hover:text-fg"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <a
            href={PREVIEW_PATH}
            target="_blank"
            rel="noreferrer"
            title="Open saved draft in a new tab"
            aria-label="Open saved draft in a new tab"
            className="flex h-7 w-7 items-center justify-center rounded-md text-fg-2 hover:bg-surface-3 hover:text-fg"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Device viewport */}
      <div ref={boxRef} className="relative min-h-0 flex-1 overflow-hidden bg-[repeating-linear-gradient(45deg,var(--surface-2)_0_10px,var(--surface-3)_10px_20px)]">
        {box.width > 0 && (
          <div
            className="absolute left-1/2 top-0 origin-top overflow-hidden bg-bg shadow-pop"
            style={{
              width: deviceWidth,
              height: box.height / scale,
              transform: `translateX(-50%) scale(${scale})`,
            }}
          >
            <iframe
              key={reloadKey}
              ref={frameRef}
              src={PREVIEW_PATH}
              title="Homepage preview"
              className="h-full w-full border-0"
            />
          </div>
        )}
        {!ready && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold text-fg-2">
            <span className="rounded-full bg-surface px-3 py-1.5 shadow-card">Loading preview…</span>
          </div>
        )}
      </div>
    </div>
  );
}
