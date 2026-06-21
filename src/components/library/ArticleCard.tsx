"use client";
import Link from "next/link";
import type { Article } from "@/lib/types";

interface Props {
  article: Article;
  onToggleStatus: (id: string, current: "unread" | "archived") => void;
}

export default function ArticleCard({ article, onToggleStatus }: Props) {
  const id = article._id.toString();
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex gap-4 items-start">
      <div className="flex-1 min-w-0">
        <Link href={`/reader/${id}`} className="font-semibold hover:underline line-clamp-2">
          {article.title}
        </Link>
        <p className="text-sm text-gray-500 truncate mt-0.5">{article.sourceUrl}</p>
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {article.tags.map((t) => (
              <span key={t} className="text-xs bg-gray-100 rounded px-2 py-0.5">{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className="text-xs text-gray-400">
          {new Date(article.savedAt).toLocaleDateString()}
        </span>
        <button
          onClick={() => onToggleStatus(id, article.status)}
          className="text-xs text-blue-600 hover:underline"
        >
          {article.status === "unread" ? "Archive" : "Unarchive"}
        </button>
        {article.type === "pdf" && (
          <span className="text-xs bg-orange-100 text-orange-700 rounded px-1.5 py-0.5">PDF</span>
        )}
      </div>
    </div>
  );
}
