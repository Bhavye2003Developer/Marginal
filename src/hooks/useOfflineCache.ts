"use client";
import { useState, useEffect, useCallback } from "react";

export interface OfflineCache {
  cachedIds: Set<string>;
  cachingId: string | null;
  cacheArticle: (id: string) => void;
  uncacheArticle: (id: string) => void;
}

export function useOfflineCache(): OfflineCache {
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const [cachingId, setCachingId] = useState<string | null>(null);
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then(() => {
      setSwReady(true);
      navigator.serviceWorker.controller?.postMessage({ type: 'GET_CACHED_IDS' });
    });

    const handler = (e: MessageEvent) => {
      const { data } = e;
      if (!data) return;
      if (data.type === 'CACHED_IDS') {
        setCachedIds(new Set(data.ids));
      }
      if (data.type === 'CACHE_DONE') {
        setCachingId(null);
        if (data.ok) setCachedIds((prev) => new Set([...prev, data.id]));
      }
      if (data.type === 'UNCACHE_DONE') {
        setCachedIds((prev) => { const s = new Set(prev); s.delete(data.id); return s; });
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (swReady) {
      navigator.serviceWorker.controller?.postMessage({ type: 'GET_CACHED_IDS' });
    }
  }, [swReady]);

  const cacheArticle = useCallback((id: string) => {
    if (!('serviceWorker' in navigator)) return;
    setCachingId(id);
    navigator.serviceWorker.controller?.postMessage({ type: 'CACHE_ARTICLE', id });
  }, []);

  const uncacheArticle = useCallback((id: string) => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.controller?.postMessage({ type: 'UNCACHE_ARTICLE', id });
  }, []);

  return { cachedIds, cachingId, cacheArticle, uncacheArticle };
}
