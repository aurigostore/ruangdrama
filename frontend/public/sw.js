// Ganti versi ini setiap kali deploy besar agar SW lama di-invalidate
const CACHE_NAME = "ruang-drama-v2";

// Hanya pre-cache aset yang benar-benar statis (bukan JS chunks)
const STATIC_ASSETS = [
  "/manifest.json",
  "/logo.png",
  "/favicon.ico",
];

// Install — pre-cache aset statis saja
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate — hapus semua cache versi lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - API / external: bypass (tidak di-cache)
// - _next/static/ JS chunks: NETWORK-FIRST (selalu ambil versi terbaru)
// - Navigasi halaman: network-first dengan fallback
// - Aset statis (logo, icons, manifest): cache-first
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. Bypass: API calls & request ke domain lain
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname !== self.location.hostname
  ) {
    return;
  }

  // 2. Next.js JS/CSS chunks — selalu network-first agar update langsung terasa
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Jika berhasil, update cache dan return
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: gunakan cache jika ada
          return caches.match(event.request);
        })
    );
    return;
  }

  // 3. Navigasi halaman — network-first
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/").then((r) => r || fetch(event.request))
      )
    );
    return;
  }

  // 4. Aset statis (logo, icons, manifest) — cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
