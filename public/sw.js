const STATIC_CACHE = "jotday-static-v1";
const SHARE_CACHE = "jotday-share";

// 설치: 즉시 활성화
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

// 활성화: 이전 캐시 정리
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("jotday-") && k !== STATIC_CACHE && k !== SHARE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 갤러리 공유 수신: 이미지 파일을 캐시에 저장 후 홈으로 리다이렉트
  if (url.pathname === "/share-target" && request.method === "POST") {
    event.respondWith(
      (async () => {
        const formData = await request.formData();
        const files = formData.getAll("images");
        const cache = await caches.open(SHARE_CACHE);
        const existing = await cache.keys();
        await Promise.all(existing.map((k) => cache.delete(k)));
        await Promise.all(
          files.map((file, i) =>
            cache.put(
              `/share-file-${i}`,
              new Response(file, { headers: { "Content-Type": file.type } })
            )
          )
        );
        return Response.redirect("/?share=incoming", 303);
      })()
    );
    return;
  }

  // /_next/static/ 파일: 콘텐츠 해시 기반이므로 영구 캐시
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

  // 페이지 HTML 및 API: 브라우저가 직접 네트워크에 요청 (SW 미개입)
});
