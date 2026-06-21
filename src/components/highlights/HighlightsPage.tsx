"use client";
import { useState, useEffect, useCallback } from "react";
import type { Highlight, Article } from "@/lib/types";
import HighlightRow from "./HighlightRow";
import ExportButton from "./ExportButton";

type EnrichedHighlight = Highlight & { articleTitle: string };

export default function HighlightsPage() {
  const [highlights, setHighlights] = useState<EnrichedHighlight[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const [unread, archived] = await Promise.all([
        fetch("/api/articles?status=unread").then((r) => r.json()),
        fetch("/api/articles?status=archived").then((r) => r.json()),
      ]);
      const all: Article[] = [...unread, ...archived];
      setArticles(all);
      setAllTags(Array.from(new Set(all.flatMap((a: Article) => a.tags))));
    })();
  }, []);

  const fetchHighlights = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedTag) params.set("tag", selectedTag);
    if (selectedArticleId) params.set("articleId", selectedArticleId);
    const raw: Highlight[] = await fetch(`/api/highlights?${params}`).then((r) => r.json());
    const articleMap = new Map(articles.map((a) => [a._id.toString(), a.title]));
    const enriched = raw.map((h) => ({
      ...h,
      articleTitle: articleMap.get(h.articleId.toString()) ?? "Unknown",
    }));
    setHighlights(enriched);
    setLoading(false);
  }, [selectedTag, selectedArticleId, articles]);

  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Highlights</h1>
        <ExportButton highlights={highlights} articles={articles} />
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <select
          value={selectedArticleId ?? ""}
          onChange={(e) => setSelectedArticleId(e.target.value || null)}
          className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
        >
          <option value="">All articles</option>
          {articles.map((a) => (
            <option key={a._id.toString()} value={a._id.toString()}>{a.title}</option>
          ))}
        </select>

        {allTags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setSelectedTag(null)}
              className={`text-xs px-2 py-1 rounded ${!selectedTag ? "bg-blue-600 text-white" : "bg-gray-100"}`}
            >
              All tags
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTag(t === selectedTag ? null : t)}
                className={`text-xs px-2 py-1 rounded ${selectedTag === t ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : highlights.length === 0 ? (
        <p className="text-gray-400 text-sm">No highlights yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {highlights.map((h) => (
            <HighlightRow key={h._id.toString()} highlight={h} />
          ))}
        </div>
      )}
    </main>
  );
}
