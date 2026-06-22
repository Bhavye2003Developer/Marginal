"use client";
import Link from "next/link";
import type { Article } from "@/lib/types";

interface Props {
  article: Article;
  onToggleStatus: (id: string, current: "unread" | "archived") => void;
  onDelete: (id: string) => void;
}

export default function ArticleCard({ article, onToggleStatus, onDelete }: Props) {
  const domain = (() => {
    try { return new URL(article.sourceUrl).hostname.replace(/^www\./, ""); }
    catch { return article.sourceUrl; }
  })();

  const dateStr = new Date(article.savedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });

  return (
    <div className="card" style={{ padding: "14px 18px" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            href={`/reader/${article.id}`}
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              fontSize: 15,
              fontWeight: 600,
              lineHeight: 1.4,
              color: "var(--text)",
              textDecoration: "none",
              marginBottom: 4,
            } as React.CSSProperties}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
          >
            {article.title}
          </Link>
          <p style={{ fontSize: 12, color: "var(--text-subtle)", marginBottom: article.tags.length ? 8 : 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {domain}
          </p>
          {article.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {article.tags.map((t) => (
                <span key={t} className="tag">{t}</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, paddingTop: 2 }}>
          <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{dateStr}</span>
          <button
            onClick={() => onToggleStatus(article.id, article.status)}
            style={{ fontSize: 12, color: "var(--text-subtle)", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: 0, fontFamily: "inherit" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)"; }}
          >
            {article.status === "unread" ? "Archive" : "Restore"}
          </button>
          <button
            onClick={() => { if (window.confirm("Delete this article?")) onDelete(article.id); }}
            style={{ fontSize: 12, color: "var(--text-subtle)", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: 0, fontFamily: "inherit" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#E5534B"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)"; }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
