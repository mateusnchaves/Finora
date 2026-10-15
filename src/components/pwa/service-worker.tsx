"use client";

import { useEffect } from "react";

/** Whose pages the offline cache holds. Kept in localStorage, cleared with the cache. */
const OWNER_KEY = "finora-cache-owner";

function clearCachedPages() {
  navigator.serviceWorker?.controller?.postMessage({ type: "clear-data" });
}

/**
 * Registers the service worker (production builds only: in development it would cache
 * stale code) and keeps the offline cache to one person: it is wiped when nobody is
 * signed in or when a different user signs in on the same device.
 */
export function ServiceWorker({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});

    try {
      const owner = localStorage.getItem(OWNER_KEY);
      if (owner !== userId) {
        clearCachedPages();
        if (userId) localStorage.setItem(OWNER_KEY, userId);
        else localStorage.removeItem(OWNER_KEY);
      }
    } catch {
      // Storage blocked (private mode): clear to be safe.
      clearCachedPages();
    }
  }, [userId]);

  return null;
}
