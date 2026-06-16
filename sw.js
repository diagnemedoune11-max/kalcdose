// KalcDose — Service Worker (mise en cache hors-ligne)
const CACHE_NAME = "kalcdose-v3";
const ASSETS = [
  "./index.html",
  "./login.html",
  "./style.css",
  "./app.js",
  "./auth.js",
  "./meds.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Installation : mise en cache de tous les fichiers
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activation : suppression des anciens caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch : network first pour auth, cache first pour le reste
self.addEventListener("fetch", e => {
  // Pour Firebase — toujours réseau
  if (e.request.url.includes("firebaseio.com") || 
      e.request.url.includes("googleapis.com") ||
      e.request.url.includes("gstatic.com")) {
    e.respondWith(fetch(e.request).catch(() => new Response("{}", {headers: {"Content-Type": "application/json"}})));
    return;
  }
  // Pour les fichiers locaux — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, response.clone());
          return response;
        });
      });
    }).catch(() => caches.match("./index.html"))
  );
});
