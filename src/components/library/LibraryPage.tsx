"use client";
import { useState, useEffect, useCallback } from "react";
import type { Article, Collection } from "@/lib/types";
import ArticleCard from "./ArticleCard";
import SaveBar from "./SaveBar";
import FilterControls from "./FilterControls";
import { useOfflineCache } from "@/hooks/useOfflineCache";

export default function LibraryPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [status, setStatus] = useState<"unread" | "archived">("unread");
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { cachedIds, cachingId, cacheArticle, uncacheArticle } = useOfflineCache();

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status });
      if (search) params.set("search", search);
      if (selectedTag) params.set("tag", selectedTag);
      if (selectedCollectionId) params.set("collectionId", selectedCollectionId);
      const res = await fetch(`/api/articles?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load articles");
      setArticles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load articles");
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [status, search, selectedTag, selectedCollectionId]);

  const fetchCollections = useCallback(async () => {
    try {
      const res = await fetch("/api/collections");
      if (res.ok) {
        const data = await res.json();
        setCollections(Array.isArray(data) ? data : []);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);
  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  async function toggleStatus(id: string, current: "unread" | "archived") {
    try {
      await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: current === "unread" ? "archived" : "unread" }),
      });
      fetchArticles();
    } catch {}
  }

  async function deleteArticle(id: string) {
    try {
      await fetch(`/api/articles/${id}`, { method: "DELETE" });
      setArticles((prev) => prev.filter((a) => a.id !== id));
    } catch {}
  }

  const allTags = Array.from(new Set(articles.flatMap((a) => a.tags)));

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
          Reading List
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-subtle)" }}>
          {articles.length > 0
            ? `${articles.length} article${articles.length !== 1 ? "s" : ""}`
            : "Save articles to read later"}
        </p>
      </div>

      <div style={{ marginBottom: 36 }}>
        <SaveBar onSaved={fetchArticles} />
      </div>

      {error && (
        <div style={{ marginBottom: 20, padding: "10px 14px", background: "color-mix(in srgb, #DC2626 10%, var(--bg-card))", border: "1px solid color-mix(in srgb, #DC2626 25%, var(--border))", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>
          ⚠ {error}
        </div>
      )}

      <div className="lib-layout">
        {/* Sidebar — always visible on desktop, collapsible on mobile */}
        <aside className="lib-sidebar">
          {/* Mobile-only toggle */}
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            style={{
              display: "none", // shown via CSS on ≤768px
              width: "100%",
              padding: "10px 0",
              marginBottom: 12,
              background: "none",
              border: "none",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              textAlign: "left",
            }}
            className="lib-filter-toggle"
          >
            <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              Filters
              <span style={{ fontSize: 10 }}>{filtersOpen ? "▲" : "▼"}</span>
            </span>
          </button>

          <div className={`lib-filter-body${filtersOpen ? " open" : ""}`}>
            <FilterControls
              status={status}
              onStatusChange={(s) => { setStatus(s); setSelectedTag(null); setSelectedCollectionId(null); }}
              search={search}
              onSearchChange={setSearch}
              allTags={allTags}
              selectedTag={selectedTag}
              onTagChange={setSelectedTag}
              collections={collections}
              selectedCollectionId={selectedCollectionId}
              onCollectionChange={setSelectedCollectionId}
            />
          </div>
        </aside>

        <main className="lib-main">
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
              <div className="spinner" />
            </div>
          ) : articles.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0", color: "var(--text-subtle)" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>◈</p>
              <p style={{ fontSize: 14 }}>
                {status === "unread"
                  ? "No articles yet. Paste a URL above to get started."
                  : "Nothing archived yet."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {articles.map((a) => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  onToggleStatus={toggleStatus}
                  onDelete={deleteArticle}
                  isCached={cachedIds.has(a.id)}
                  isCaching={cachingId === a.id}
                  onCacheToggle={(id) =>
                    cachedIds.has(id) ? uncacheArticle(id) : cacheArticle(id)
                  }
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
