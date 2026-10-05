"use client";

import { useCallback, useSyncExternalStore } from "react";

const LOCAL_EVENT = "fw-storage";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LOCAL_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LOCAL_EVENT, callback);
  };
}

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/**
 * A localStorage-backed string shared by every component that uses the same key
 * (and across tabs). Renders "" on the server and during hydration.
 */
export function useStoredValue(key: string): [string, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => ""
  );

  const setValue = useCallback(
    (next: string) => {
      try {
        localStorage.setItem(key, next);
      } catch {
        /* storage unavailable (private mode) */
      }
      window.dispatchEvent(new Event(LOCAL_EVENT));
    },
    [key]
  );

  return [value, setValue];
}

export const DELIVERY_PIN_KEY = "fw_delivery_pin";
