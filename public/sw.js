/* Stay CRM service worker — makes the guest check-in installable + resilient.
 * Only caches public guest pages (/, /checkin) and static assets.
 * Admin pages and /c/[token] links are NEVER cached (private data). */

const CACHE = "staycrm-v6";
const CORE = ["/", "/checkin", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

// Navigations give up after 8s and fall back to cache — the app
// never hangs on a dead network ("no refresh" fix).
const timeout = (ms) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => {}),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Lets the app trigger an update ("Refresh" button in the update toast).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Public guest shell: network-first with timeout, cache fallback.
  if (request.mode === "navigate" && (url.pathname === "/" || url.pathname === "/checkin")) {
    event.respondWith(
      Promise.race([fetch(request), timeout(8000)])
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((m) => m || caches.match("/checkin"))),
    );
    return;
  }

  // Versioned static assets + icons: cache-first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
  }
});
