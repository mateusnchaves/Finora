/*
 * Finora service worker.
 * - Pages and RSC payloads: network first; offline, the last copy seen (or /offline).
 * - Build assets (/_next/static, hashed and immutable), icons and fonts: cache first.
 * - Server Actions, API calls and other hosts are never touched.
 * The page asks it to wipe the caches on sign-out, so no financial data stays behind.
 * Push: shows the daily alerts (bill due, budget over, goal reached) and opens their page.
 */
const VERSION = "v2";
const PAGES = `finora-pages-${VERSION}`;
const ASSETS = `finora-assets-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![PAGES, ASSETS].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "clear-data") {
    event.waitUntil(caches.delete(PAGES).then(() => caches.open(PAGES)).then((c) => c.add(OFFLINE_URL)));
  }
});

function isAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET") return;

  // Google Fonts (text and icon font) are safe to keep: no user data.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (isAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  const isPage = request.mode === "navigate";
  const isRsc = request.headers.get("RSC") === "1";
  if (!isPage && !isRsc) return;
  // Auth callbacks and sample downloads always go to the network.
  if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/samples/")) return;

  event.respondWith(networkFirst(request, isPage));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(ASSETS)).put(request, response.clone());
  return response;
}

async function networkFirst(request, isPage) {
  try {
    const response = await fetch(request);
    // Keep good, final pages only: not redirects (e.g. to /login) or errors.
    if (response.ok && !response.redirected) (await caches.open(PAGES)).put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreVary: true });
    if (cached) return cached;
    if (isPage) return (await caches.match(OFFLINE_URL)) ?? Response.error();
    return Response.error();
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Finora", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      lang: "pt-BR",
      data: { url: data.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // Reuse an open Finora window when there is one.
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) return open.navigate(target).then((w) => (w || open).focus());
      return self.clients.openWindow(target);
    }),
  );
});
