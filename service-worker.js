// Satomi — service worker
// Bumps the version string whenever index.html (or any cached asset) changes,
// so returning visitors pick up the update instead of a stale cache.
const CACHE_VERSION = "satomi-v1";
const CACHE_NAME = `satomi-cache-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./music.mp3",
  "./light_rain.mp3",
  "./heavy_rain.mp3",
  "./thunderstorm.mp3",
  "./icons/icon-72.png",
  "./icons/icon-96.png",
  "./icons/icon-128.png",
  "./icons/icon-144.png",
  "./icons/icon-152.png",
  "./icons/icon-192.png",
  "./icons/icon-384.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache.addAll() fails entirely if any single asset 404s. Add each
      // asset independently so a missing file (e.g. an mp3 not yet uploaded)
      // doesn't prevent the rest of the app shell from being cached.
      Promise.all(
        ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[service-worker] could not cache ${url}:`, err);
          })
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("satomi-cache-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Cache-first for app shell assets, falling back to network.
// Network requests that succeed are stashed for next time; if the network
// fails (offline) we serve whatever we have cached.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
