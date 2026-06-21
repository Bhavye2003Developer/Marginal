"use client";
import Link from "next/link";
import type { Article } from "@/lib/types";

interface Props {
  article: Article;
  onToggleStatus: (id: string, current: "unread" | "archived") => void;
}

export default function ArticleCard({ article, onToggleStatus }: Props) {
  const domain = (() => {
    try { return new URL(article.sourceUrl).hostname.replace(/^www\./, ""); }
    catch { return article.sourceUrl; }
  })();

  const dateStr = new Date(article.savedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });

  return (
    <div className="card px-5 py-4">
      <div className="flex gap-4 items-start">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/reader/${article.id}`}
            className="block text-[15px] font-semibold leading-snug text-[#1A1A1A] hover:text-[#5B5BD6] line-clamp-2 mb-1 transition-colors"
          >
            {article.title}
          </Link>
          <p className="text-[12px] text-[#A8A49C] truncate mb-2.5">{domain}</p>
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {article.tags.map((t) => (
                <span key={t} className="tag">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="shrink-0 flex flex-col items-end gap-2 pt-0.5">
          <span className="text-[12px] text-[#A8A49C]">{dateStr}</span>
          <button
            onClick={() => onToggleStatus(article.id, article.status)}
            className="text-[12px] text-[#A8A49C] hover:text-[#5B5BD6] transition-colors font-medium"
          >
            {article.status === "unread" ? "Archive" : "Restore"}
          </button>
        </div>
      </div>
    </div>
  );
}
