/* =========================================================
   Hazama 狭間 (root = 没入版/逆統合) — Service Worker
   - root スコープ /hazama/ で動作（相対パスのみ）。
   - HTML と depths-shell.json は network-first（デプロイ伝播を速く）。
   - 同一オリジン静的アセットは exact-version cache-first。
   - cache prefix=hazama-pwa- ＝旧 forward 版 cache(hazama-pwa-v2.45 等)を activate で掃除し更新。
========================================================= */

const VERSION = "hazama-pwa-e44";
const RELEASE = VERSION.replace("hazama-pwa-", "");
const CACHE_PREFIX = "hazama-pwa-";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

// runtime shellは原子的に更新する。coreが一つでも欠けたらinstallを失敗させ、
// 現在activeなHazama worker/cacheを温存する。視覚assetだけはbest-effort。
const CORE_PRECACHE_URLS = [
  "./",
  "index.html",
  `slice.css?v=${RELEASE}`,
  `slice.js?v=${RELEASE}`,
  "depths-shell.json",
  "manifest.webmanifest"
];

const OPTIONAL_PRECACHE_URLS = [
  `locales/en.json?v=${RELEASE}`,
  "icons/icon-96.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-512-maskable.png",
  "icons/apple-touch-icon.png",
  "assets/hazama-descent-key.webp",
  "assets/hazama-descent-drift.webp",
  "assets/hazama-descent-bottom.webp",
  "assets/hazama-descent-surfaced.webp",
  "assets/hazama-descent-omega.webp",
  "assets/hazama-descent-key-b.webp",
  "assets/hazama-descent-drift-b.webp",
  "assets/hazama-descent-bottom-b.webp",
  "assets/hazama-descent-surfaced-b.webp",
  "assets/hazama-descent-omega-b.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) =>
        cache.addAll(CORE_PRECACHE_URLS).then(() =>
          Promise.all(
            OPTIONAL_PRECACHE_URLS.map((url) =>
              cache.add(url).catch((err) => {
                console.warn("[Hazama slice SW] precache miss:", url, err);
              })
            )
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

function isHtmlRequest(request) {
  return request.mode === "navigate" ||
    (request.method === "GET" && request.headers.get("accept")?.includes("text/html"));
}

function isDepthData(url) {
  return url.origin === self.location.origin && url.pathname.endsWith("/depths-shell.json");
}

function matchCachedRequest(request, options = {}) {
  return caches.match(request).then((cached) => {
    if (cached || !options.ignoreSearch) return cached;
    return caches.match(request, { ignoreSearch: true });
  });
}

function putIfOk(cacheName, request, response) {
  if (!response || !response.ok) return response;
  const copy = response.clone();
  caches.open(cacheName)
    .then((cache) => cache.put(request, copy))
    .catch((err) => console.warn("[Hazama slice SW] cache put failed:", request.url, err));
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (request.headers.get("range")) return;

  const url = new URL(request.url);

  if (isHtmlRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => putIfOk(STATIC_CACHE, request, response))
        .catch(() =>
          caches.match(request)
            .then((cached) => cached || caches.match("index.html"))
            .then((cached) => cached || caches.match("./"))
        )
    );
    return;
  }

  if (isDepthData(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => putIfOk(RUNTIME_CACHE, request, response))
        .catch(() => matchCachedRequest(request, { ignoreSearch: true }))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      matchCachedRequest(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => putIfOk(STATIC_CACHE, request, response));
      })
    );
  }
});
