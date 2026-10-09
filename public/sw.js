const CACHE = "cyberus-shell-v2";
const SHELL = [
  "/offline",
  "/cyberus-logo.png",
  "/cyberus-icon.png",
  "/manifest.webmanifest",
];
self.addEventListener("install", (event) =>
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL))),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const path = new URL(request.url).pathname;
  if (request.method !== "GET") return;
  const cacheable = SHELL.includes(path) || path.startsWith("/_next/static/");
  if (!cacheable) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic")
          caches
            .open(CACHE)
            .then((cache) => cache.put(request, response.clone()));
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
