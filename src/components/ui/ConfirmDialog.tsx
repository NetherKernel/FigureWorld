"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}

/**
 * In-page replacement for window.confirm().
 * const [confirmDialog, ask] = useConfirm();  …  if (!(await ask({ title: "Delete?" }))) return;
 * Render {confirmDialog} somewhere in the page.
 */
export function useConfirm(): [React.ReactNode, (opts: ConfirmOptions) => Promise<boolean>] {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const confirmBtn = useRef<HTMLButtonElement>(null);

  const ask = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  }, []);

  useEffect(() => {
    if (!opts) return;
    confirmBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opts, close]);

  const dialog = opts ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <button type="button" aria-label="Cancel" className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => close(false)} />
      <div className="card relative w-full max-w-sm p-5 shadow-pop animate-pop-in">
        <div className="flex items-start gap-3">
          {opts.danger !== false && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-base font-bold text-fg">{opts.title}</h2>
            {opts.message && <p className="mt-1 text-sm text-fg-2">{opts.message}</p>}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => close(false)}>
            Cancel
          </button>
          <button ref={confirmBtn} type="button" className="btn btn-primary btn-sm" onClick={() => close(true)}>
            {opts.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return [dialog, ask];
}
