/* ============================================================
   CRETE · WeRoad — Service Worker
   Offline-first for the app shell. Bump CACHE on each release.
   Remote photos are cached opportunistically (stale-while-revalidate).
   ============================================================ */
const CACHE = "crete-weroad-v52";
const SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./css/animations.css",
  "./js/main.js",
  "./js/timeline.js",
  "./js/maps.js",
  "./manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;

  // Same-origin (HTML/CSS/JS/images): NETWORK-FIRST so edits always show when
  // online; fall back to cache only when offline. Avoids stale-content traps.
  if (new URL(request.url).origin === location.origin) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Remote assets (fonts): stale-while-revalidate
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request).then((res) => {
        if (res && res.status === 200) cache.put(request, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
