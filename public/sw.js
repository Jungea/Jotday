const STATIC_CACHE = "jotday-static-v1";
const PAGE_CACHE = "jotday-pages-v1";

// 설치: 메인 페이지 미리 캐시 + 즉시 활성화
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(PAGE_CACHE).then((cache) =>
        fetch("/").then((res) => { if (res.ok) cache.put("/", res); }).catch(() => {})
      ),
      self.skipWaiting(),
    ])
  );
});

// 활성화: 이전 캐시 정리
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("jotday-") && k !== STATIC_CACHE && k !== PAGE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // /_next/static/ 파일: 콘텐츠 해시로 고유하므로 영구 캐시
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // 이미지·폰트 등 public 파일: 캐시 우선
  if (
    request.method === "GET" &&
    (url.pathname.startsWith("/_next/image") ||
      url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff2?)$/))
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // 페이지 HTML: stale-while-revalidate (캐시 즉시 응답 후 백그라운드 갱신)
  if (request.mode === "navigate") {
    event.respondWith(
      caches.open(PAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached ?? networkFetch;
      })
    );
    return;
  }

  // 그 외(API): 항상 네트워크 우선
});
