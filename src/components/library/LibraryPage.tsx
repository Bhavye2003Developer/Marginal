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
    const data = await res.json();
    setArticles(data);
    setLoading(false);
  }, [status, search, selectedTag, selectedCollectionId]);

  const fetchCollections = useCallback(async () => {
    const res = await fetch("/api/collections");
    if (res.ok) setCollections(await res.json());
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);
  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  async function toggleStatus(id: string, current: "unread" | "archived") {
    const next = current === "unread" ? "archived" : "unread";
    await fetch(`/api/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    fetchArticles();
  }

  const allTags = Array.from(new Set(articles.flatMap((a) => a.tags)));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Save bar at top */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900 mb-4">Your Library</h1>
        <SaveBar onSaved={fetchArticles} />
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar filters */}
        <aside className="w-full md:w-56 shrink-0">
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
        <main className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-16 text-stone-400">
              <p className="text-4xl mb-3">◈</p>
              <p className="text-sm">
                {status === "unread" ? "No articles yet. Paste a URL above to get started." : "Nothing archived yet."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
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
