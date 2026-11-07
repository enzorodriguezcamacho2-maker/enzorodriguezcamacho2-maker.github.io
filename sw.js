// Guarda la app para que abra rápido y funcione sin conexión (las búsquedas sí necesitan internet)
const CACHE = "jarvis-v31";
const ARCHIVOS = ["./", "index.html", "estilo.css", "orb.js", "jarvis.js", "extra.js", "apps.js", "mas.js", "vida.js", "plus.js", "control.js", "contactos.js", "futbol.js", "ajustes.js", "versiones.js", "poderes.js", "poderes.css", "captura.js", "icon-192.png", "icon-512.png", "manifest.webmanifest"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // APIs externas: siempre a internet
  // Primero internet (para recibir mejoras), si falla, la copia guardada
  e.respondWith(fetch(e.request, { cache: "no-store" }).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; }).catch(() => caches.match(e.request)));
});
