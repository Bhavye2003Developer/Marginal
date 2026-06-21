"use client";
import Link from "next/link";
import type { Article } from "@/lib/types";

interface Props {
  article: Article;
  onToggleStatus: (id: string, current: "unread" | "archived") => void;
}

export default function ArticleCard({ article, onToggleStatus }: Props) {
  const domain = (() => {
    try { return new URL(article.sourceUrl).hostname.replace("www.", ""); }
    catch { return article.sourceUrl; }
  })();

  return (
    <div className="group bg-white rounded-2xl border border-stone-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex gap-3 items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            {article.type === "pdf" && (
              <span className="shrink-0 mt-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 uppercase tracking-wide">
                PDF
              </span>
            )}
            <Link
              href={`/reader/${article.id}`}
              className="font-semibold text-stone-900 hover:text-violet-700 line-clamp-2 leading-snug transition-colors"
            >
              {article.title}
            </Link>
          </div>
          <p className="text-xs text-stone-400 truncate">{domain}</p>
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {article.tags.map((t) => (
                <span key={t} className="rounded-full bg-violet-50 text-violet-700 px-2.5 py-0.5 text-xs font-medium">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0 text-right">
          <span className="text-xs text-stone-400 whitespace-nowrap">
            {new Date(article.savedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
          </span>
          <button
            onClick={() => onToggleStatus(article.id, article.status)}
            className="text-xs text-stone-400 hover:text-violet-600 transition-colors whitespace-nowrap"
          >
            {article.status === "unread" ? "Archive" : "Unarchive"}
          </button>
        </div>
      </div>
    </div>
  );
}
