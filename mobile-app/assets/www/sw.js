const CACHE_NAME = "sysrush-pwa-v5.4";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./sync-config.js",
  "./curriculum-q1.js",
  "./curriculum-q2.js",
  "./curriculum-q3.js",
  "./curriculum-q4.js",
  "./curriculum-data.js",
  "./dojo-engine.js",
  "./app.js",
  "./icon.svg",
  "./manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never intercept API, SSE, Cloud Relay (ntfy.sh), or Gemini AI requests
  if (
    url.origin !== self.location.origin ||
    url.pathname.includes("/api/")
  ) {
    return;
  }

  // Network-first for fresh updates, instant cache fallback when offline / asleep
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match("./index.html")))
  );
});
