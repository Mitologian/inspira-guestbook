// Naikkan versi ini setiap kali mengubah isi halaman, supaya HP pengunjung mengambil versi baru.
const VERSION = "mi-link-v21";
const SHELL = ["./", "index.html", "tipe.html", "manifest.webmanifest", "mitologi-inspira.vcf",
  "images/logo.png", "images/hero.jpg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;
  // Halaman: coba jaringan dulu (isi selalu terbaru), jatuh ke cache saat offline.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { caches.open(VERSION).then(c => c.put("index.html", "tipe.html", r.clone())); return r; })
      .catch(() => caches.match("index.html")));
    return;
  }
  // Aset: cache dulu, perbarui di belakang.
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") caches.open(VERSION).then(c => c.put(req, r.clone())); return r; })
      .catch(() => hit);
    return hit || net;
  }));
});
