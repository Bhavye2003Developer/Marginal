"use client";
import { useState, useEffect, useCallback } from "react";
import type { Article, Collection } from "@/lib/types";
import ArticleCard from "./ArticleCard";
import SaveBar from "./SaveBar";
import FilterControls from "./FilterControls";

export default function LibraryPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [status, setStatus] = useState<"unread" | "archived">("unread");
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status });
    if (search) params.set("search", search);
    if (selectedTag) params.set("tag", selectedTag);
    if (selectedCollectionId) params.set("collectionId", selectedCollectionId);
    const res = await fetch(`/api/articles?${params}`);
    setArticles(await res.json());
    setLoading(false);
  }, [status, search, selectedTag, selectedCollectionId]);

  const fetchCollections = useCallback(async () => {
    const res = await fetch("/api/collections");
    if (res.ok) setCollections(await res.json());
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);
  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  async function toggleStatus(id: string, current: "unread" | "archived") {
    await fetch(`/api/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: current === "unread" ? "archived" : "unread" }),
    });
    fetchArticles();
  }

  const allTags = Array.from(new Set(articles.flatMap((a) => a.tags)));

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1A1A1A", marginBottom: 4 }}>
          Reading List
        </h1>
        <p style={{ fontSize: 14, color: "#A8A49C" }}>
          {articles.length > 0 ? `${articles.length} article${articles.length !== 1 ? "s" : ""}` : "Save articles to read later"}
        </p>
      </div>

      {/* Save bar */}
      <div style={{ marginBottom: 36 }}>
        <SaveBar onSaved={fetchArticles} />
      </div>

      <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
        {/* Sidebar */}
        <aside style={{ width: 200, flexShrink: 0 }}>
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
        </aside>

        {/* Article list */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
              <div className="spinner" />
            </div>
          ) : articles.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0", color: "#A8A49C" }}>
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
                <ArticleCard key={a.id} article={a} onToggleStatus={toggleStatus} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
