const VER = 'v1';
const READER_CACHE = 'marginal-reader-' + VER;
const ASSET_CACHE  = 'marginal-assets-' + VER;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('marginal-') && !k.endsWith(VER))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request: req } = e;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  // Next.js static assets are content-hashed — cache forever
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res.ok) caches.open(ASSET_CACHE).then((c) => c.put(req, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // Reader pages: network-first, auto-cache on success
  if (url.origin === self.location.origin && url.pathname.startsWith('/reader/')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(READER_CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || new Response(
            `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>
            <style>body{font-family:system-ui,sans-serif;padding:40px 24px;text-align:center;background:#F8F7F5;color:#18181A}h2{font-size:20px;font-weight:700;margin-bottom:8px}p{color:#706E6B;margin-bottom:24px}a{color:#5B5BD6;text-decoration:none;font-size:14px}</style></head>
            <body><h2>Article not cached</h2><p>Visit this article while online first to read it offline.</p><a href="/library">← Back to library</a></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Other navigation: network with silent fallback
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
});

// Messages from the app
self.addEventListener('message', (e) => {
  if (!e.data) return;

  if (e.data.type === 'CACHE_ARTICLE') {
    const articleUrl = `${self.location.origin}/reader/${e.data.id}`;
    caches.open(READER_CACHE).then(async (cache) => {
      try {
        const res = await fetch(articleUrl);
        if (res.ok) {
          await cache.put(articleUrl, res);
          e.source?.postMessage({ type: 'CACHE_DONE', id: e.data.id, ok: true });
        } else {
          e.source?.postMessage({ type: 'CACHE_DONE', id: e.data.id, ok: false });
        }
      } catch {
        e.source?.postMessage({ type: 'CACHE_DONE', id: e.data.id, ok: false });
      }
    });
  }

  if (e.data.type === 'UNCACHE_ARTICLE') {
    const articleUrl = `${self.location.origin}/reader/${e.data.id}`;
    caches.open(READER_CACHE).then(async (cache) => {
      await cache.delete(articleUrl);
      e.source?.postMessage({ type: 'UNCACHE_DONE', id: e.data.id });
    });
  }

  if (e.data.type === 'GET_CACHED_IDS') {
    caches.open(READER_CACHE).then(async (cache) => {
      const keys = await cache.keys();
      const ids = keys
        .map((r) => new URL(r.url).pathname.match(/^\/reader\/(.+)$/)?.[1])
        .filter(Boolean);
      e.source?.postMessage({ type: 'CACHED_IDS', ids });
    });
  }
});
