/* =========================================================
   Hazama 狭間 (root = 没入版/逆統合) — Service Worker
   - root スコープ /hazama/ で動作（相対パスのみ）。
   - HTML と depths-shell.json は network-first（デプロイ伝播を速く）。
   - 同一オリジン静的アセットは exact-version cache-first。
   - cache prefix=hazama-pwa- ＝旧 forward 版 cache(hazama-pwa-v2.45 等)を activate で掃除し更新。
========================================================= */

const VERSION = "hazama-pwa-e56";
const RELEASE = VERSION.replace("hazama-pwa-", "");
const CACHE_PREFIX = "hazama-pwa-";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

// runtime shellは原子的に更新する。coreが一つでも欠けたらinstallを失敗させ、
// 現在activeなHazama worker/cacheを温存する。視覚assetだけはbest-effort。
// E56: precache は HTTP cache（Pages の max-age=600）を経由せず再検証する＝デプロイ直後の更新でも
//   版の付かない ./ index.html depths manifest が旧中身のまま新版 cache に入らない（304 なら転送はほぼ増えない）。
const freshRequest = (url) => new Request(url, { cache: "no-cache" });

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
  "assets/hazama-descent-entry-e47.webp",
  "assets/hazama-descent-drift.webp",
  "assets/hazama-descent-bottom.webp",
  "assets/hazama-descent-surfaced.webp",
  "assets/hazama-descent-omega.webp",
  "assets/hazama-descent-drift-b.webp",
  "assets/hazama-descent-bottom-b.webp",
  "assets/hazama-descent-surfaced-b.webp",
  "assets/hazama-descent-omega-b.webp"
];

self.addEventListener("install", (event) => {
  // E56: install が待つのは core だけ（約120KB）。視覚 asset（約1.6MB）は activate 後に best-effort で埋める＝
  //   旧 SW からの takeover 待ち（inline boot の10秒）が遅い回線で偽の失敗にならない。
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(CORE_PRECACHE_URLS.map(freshRequest)))
      .then(() => self.skipWaiting())
  );
});

// E56: 視覚 asset の best-effort precache。既に cache にあるものは取り直さない（更新直後の page 側取得と二重にしない）。
function precacheOptional() {
  return caches.open(STATIC_CACHE).then((cache) =>
    Promise.all(
      OPTIONAL_PRECACHE_URLS.map((url) =>
        cache.match(url).then((hit) => hit || cache.add(freshRequest(url))).catch((err) => {
          console.warn("[Hazama slice SW] precache miss:", url, err);
        })
      )
    )
  );
}

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
      .then(() => { precacheOptional(); })   // E56: 待たない＝activating 中に fetch を止めない。欠けた分は静的分岐が拾う
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
    // E56: network の HTML を cache に書かない＝旧 SW が新版 HTML を旧版 cache へ入れ、更新途中の offline で
    //   「新 HTML＋旧 css/js」になる経路を塞ぐ（offline の HTML は install 時の precache だけ＝同版の資産と対）。
    //   fallback は scope 直下（./ と index.html）だけ＝docs/tools の深い path に入口を返さない。
    event.respondWith(
      fetch(request).catch(() => {
        const dir = new URL("./", self.location.href).pathname;
        if (url.pathname !== dir && url.pathname !== dir + "index.html") return Response.error();
        return caches.match(request)
          .then((cached) => cached || caches.match("index.html"))
          .then((cached) => cached || caches.match("./"));
      })
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
