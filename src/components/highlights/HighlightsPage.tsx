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
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1A1A1A", marginBottom: 4 }}>Highlights</h1>
          <p style={{ fontSize: 14, color: "#A8A49C" }}>
            {highlights.length > 0 ? `${highlights.length} highlight${highlights.length !== 1 ? "s" : ""}` : "Select text in any article to highlight it"}
          </p>
        </div>
        <ExportButton highlights={highlights} articles={articles} />
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: 24, display: "flex", flexWrap: "wrap", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <p className="section-label">Article</p>
          <select
            value={selectedArticleId ?? ""}
            onChange={(e) => setSelectedArticleId(e.target.value || null)}
            className="input"
            style={{ fontSize: 13 }}
          >
            <option value="">All articles</option>
            {articles.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>
        {allTags.length > 0 && (
          <div style={{ flex: 1, minWidth: 180 }}>
            <p className="section-label">Tag</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["All", ...allTags].map((t) => {
                const active = t === "All" ? !selectedTag : selectedTag === t;
                return (
                  <button
                    key={t}
                    onClick={() => setSelectedTag(t === "All" ? null : (t === selectedTag ? null : t))}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 500,
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      background: active ? "#5B5BD6" : "#F0EFE9",
                      color: active ? "#ffffff" : "#6B6B6B",
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
          <div className="spinner" />
        </div>
      ) : highlights.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "#A8A49C" }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>✦</p>
          <p style={{ fontSize: 14 }}>No highlights yet. Select text in any article to highlight it.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {highlights.map((h) => (
            <HighlightRow key={h.id} highlight={h} />
          ))}
        </div>
      )}
    </div>
  );
}
