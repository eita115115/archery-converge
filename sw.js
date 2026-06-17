const CACHE = "archery-converge-v4";
const ASSETS = ["./index.html", "./manifest.json", "./icon.svg", "./apple-touch-icon.png", "./version.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => e.request.mode === "navigate"
        ? caches.match("./index.html")
        : caches.match(e.request, { ignoreSearch: true }))
  );
});