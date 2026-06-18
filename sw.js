const CACHE = "archery-converge-v82";
const ASSETS = [
  "./index.html",
  "./style.css",
  "./compat.js",
  "./geometry.js",
  "./physics.js",
  "./engine.js",
  "./beginner.js",
  "./app-state.js",
  "./ui/helpers.js",
  "./storage.js",
  "./screens/home.js",
  "./screens/record.js",
  "./screens/return.js",
  "./screens/history.js",
  "./app.js",
  "./manifest.json",
  "./icon.svg",
  "./apple-touch-icon.png",
  "./assets/.cache/f/a7f3c201.jpg",
  "./assets/.cache/f/b8e4d302.jpg",
  "./assets/.cache/f/c9f5e413.jpg",
  "./assets/.cache/f/d0a6f524.jpg",
  "./assets/.cache/f/e1b7a635.jpg",
  "./assets/.cache/f/f2c8b746.jpg",
  "./assets/.cache/f/03d9c857.jpg",
  "./assets/.cache/f/14eab968.jpg",
  "./assets/.cache/f/25fbc079.jpg",
  "./version.json",
];

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