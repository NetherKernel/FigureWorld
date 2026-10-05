import type { LandingConfig } from "./config";

/** postMessage protocol between the editor (/developer/customize) and its preview iframe (/developer/landing-preview). Same-origin only. */
export const EDITOR_SOURCE = "fw-landing-editor";
export const PREVIEW_SOURCE = "fw-landing-preview";
export const PREVIEW_PATH = "/developer/landing-preview";

export type ViewAs = "guest" | "member";

export type EditorPayload =
  | { type: "update"; config: LandingConfig; selectedId: string | null; viewAs: ViewAs }
  | { type: "scrollTo"; id: string };

export type PreviewPayload = { type: "ready" } | { type: "select"; id: string };

export type EditorMessage = EditorPayload & { source: typeof EDITOR_SOURCE };
export type PreviewMessage = PreviewPayload & { source: typeof PREVIEW_SOURCE };

export function isEditorMessage(data: unknown): data is EditorMessage {
  return !!data && typeof data === "object" && (data as { source?: unknown }).source === EDITOR_SOURCE;
}

export function isPreviewMessage(data: unknown): data is PreviewMessage {
  return !!data && typeof data === "object" && (data as { source?: unknown }).source === PREVIEW_SOURCE;
}
