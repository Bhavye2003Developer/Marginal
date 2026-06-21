"use client";
import Link from "next/link";
import type { Highlight } from "@/lib/types";

const COLOR_STYLE: Record<string, string> = {
  yellow: "border-yellow-400 bg-yellow-50",
  green: "border-green-500 bg-green-50",
  blue: "border-blue-500 bg-blue-50",
  pink: "border-pink-400 bg-pink-50",
};

const COLOR_DOT: Record<string, string> = {
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
  pink: "bg-pink-400",
};

interface Props {
  highlight: Highlight & { articleTitle: string };
}

export default function HighlightRow({ highlight }: Props) {
  return (
    <div className={`rounded-2xl border-l-4 bg-white border border-stone-200 shadow-sm ${COLOR_STYLE[highlight.color] ?? "border-stone-300 bg-white"} p-4`}>
      <blockquote className="text-sm text-stone-800 leading-relaxed mb-2">
        &ldquo;{highlight.text}&rdquo;
      </blockquote>
      {highlight.note && (
        <p className="text-xs text-stone-500 italic mb-2 border-t border-stone-100 pt-2">
          Note: {highlight.note}
        </p>
      )}
      <div className="flex items-center gap-2 mt-1">
        <span className={`w-2 h-2 rounded-full shrink-0 ${COLOR_DOT[highlight.color] ?? "bg-stone-400"}`} />
        <Link
          href={`/reader/${highlight.articleId}`}
          className="text-xs font-medium text-violet-600 hover:text-violet-700 hover:underline truncate"
        >
          {highlight.articleTitle}
        </Link>
        <span className="text-xs text-stone-400 ml-auto shrink-0">
          {new Date(highlight.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}
