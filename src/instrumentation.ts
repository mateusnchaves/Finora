import type { Instrumentation } from "next";
import { errorDigest, errorMessage, errorReportingEnabled, sendErrorEvent } from "@/lib/error-reporting";

/** Every server error (render, Route Handler, Server Action, proxy) goes to the logs and to Supabase. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const message = errorMessage(error);
  const digest = errorDigest(error);
  const route = `${context.routeType} ${context.routePath}`;

  // One JSON line, searchable in Vercel's runtime logs by digest.
  console.error(JSON.stringify({ level: "error", message, digest, route, method: request.method }));

  if (!errorReportingEnabled()) return;
  const userAgent = request.headers["user-agent"];
  await sendErrorEvent({
    source: "server",
    message,
    digest,
    path: request.path,
    route,
    context: context.renderSource ?? undefined,
    userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
  });
};
