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
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Marginal</h1>
      <SaveBar onSaved={fetchArticles} />
      <FilterControls
        status={status}
        onStatusChange={(s) => { setStatus(s); setSelectedTag(null); }}
        search={search}
        onSearchChange={setSearch}
        allTags={allTags}
        selectedTag={selectedTag}
        onTagChange={setSelectedTag}
        collections={collections}
        selectedCollectionId={selectedCollectionId}
        onCollectionChange={setSelectedCollectionId}
      />
      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : articles.length === 0 ? (
        <p className="text-gray-400 text-sm">No articles yet. Save a URL above.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {articles.map((a) => (
            <ArticleCard key={a._id.toString()} article={a} onToggleStatus={toggleStatus} />
          ))}
        </div>
      )}
    </main>
  );
}
