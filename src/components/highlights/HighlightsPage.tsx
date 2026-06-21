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
    const articleMap = new Map(articles.map((a) => [a.id, a.title]));
    const enriched = raw.map((h) => ({
      ...h,
      articleTitle: articleMap.get(h.articleId) ?? "Unknown",
    }));
    setHighlights(enriched);
    setLoading(false);
  }, [selectedTag, selectedArticleId, articles]);

  useEffect(() => { fetchHighlights(); }, [fetchHighlights]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Highlights</h1>
          {highlights.length > 0 && (
            <p className="text-sm text-stone-500 mt-0.5">{highlights.length} highlight{highlights.length !== 1 ? "s" : ""}</p>
          )}
        </div>
        <ExportButton highlights={highlights} articles={articles} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 mb-6 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5">Article</label>
          <select
            value={selectedArticleId ?? ""}
            onChange={(e) => setSelectedArticleId(e.target.value || null)}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">All articles</option>
            {articles.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>
        {allTags.length > 0 && (
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5">Tag</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedTag(null)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${!selectedTag ? "bg-violet-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
              >
                All
              </button>
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTag(t === selectedTag ? null : t)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${selectedTag === t ? "bg-violet-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : highlights.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-4xl mb-3">✦</p>
          <p className="text-sm">No highlights yet. Select text in any article to highlight it.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {highlights.map((h) => (
            <HighlightRow key={h.id} highlight={h} />
          ))}
        </div>
      )}
    </div>
  );
}
