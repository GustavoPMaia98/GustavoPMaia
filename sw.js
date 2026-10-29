/* Service worker: app-shell caching + offline fallback.
   Network-first for HTML, CSS, JS and data (so new content shows at once),
   cache-then-refresh for pictures and other static files. */
const CACHE = "gpm-v58";
const CORE = [
  "./", "index.html", "cientificamente.html",
  "design-system/styles.css", "design-system/tokens/fonts.css", "design-system/tokens/colors.css",
  "design-system/tokens/typography.css", "design-system/tokens/spacing.css", "design-system/tokens/effects.css",
  "style.css", "ui-extra.css", "script.js", "search.js", "render.js", "vendor/lucide-1.48.0.min.js", "favicon.svg",
  "sections/highlights.html", "sections/news.html", "sections/publications.html", "sections/presentations.html",
  "sections/education.html", "sections/experience.html", "sections/courses.html", "sections/awards.html",
  "sections/funding.html", "sections/tree.html", "sections/map.html",
  "data/news.json", "data/tree.json", "data/publications.json"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // leave CDN / map tiles to the network

  const isHTML = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html");
  // CSS/JS change often — keep them fresh (network-first) so an update never
  // leaves the page styled by a stale cached stylesheet/script.
  const isFresh = isHTML || url.pathname.endsWith(".css") || url.pathname.endsWith(".js") || url.pathname.endsWith(".json");
  if (isFresh) {
    e.respondWith(
      // "no-cache": always revalidate with GitHub Pages (a tiny 304 when unchanged)
      fetch(url.href, { cache: "no-cache", credentials: "same-origin" })
        .then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; })
        .catch(() => caches.match(req).then(m => m || (isHTML ? caches.match("index.html") : undefined)))
    );
  } else {
    // Pictures, fonts, molecules: answer from the cache at once, then refresh the
    // cached copy in the background, so a replaced picture shows on the next visit.
    e.respondWith(
      caches.match(req).then(m => {
        const net = fetch(req).then(r => {
          if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
          return r;
        });
        if (m) { e.waitUntil(net.catch(() => {})); return m; }
        return net;
      })
    );
  }
});
