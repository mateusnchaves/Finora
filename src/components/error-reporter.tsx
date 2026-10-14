"use client";

import { useEffect } from "react";
import { reportClientError } from "@/app/report-error-action";

/** At most this many reports per page load, so a render loop cannot flood the table. */
const MAX_REPORTS = 5;
let sent = 0;

export function reportBrowserError(error: unknown, context: string) {
  // Errors with a digest came from the server, which already reported them.
  if (typeof error === "object" && error !== null && "digest" in error && error.digest) return;
  if (sent >= MAX_REPORTS) return;
  sent += 1;

  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  reportClientError({ message, path: window.location.pathname, context }).catch(() => {});
}

/** Listens for uncaught browser errors on every page. */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => reportBrowserError(event.error ?? event.message, "window.error");
    const onRejection = (event: PromiseRejectionEvent) => reportBrowserError(event.reason, "unhandledrejection");
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
