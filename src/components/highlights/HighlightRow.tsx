"use client";
import Link from "next/link";
import type { Highlight } from "@/lib/types";

const COLOR_STYLE: Record<string, string> = {
  yellow: "border-yellow-400 bg-yellow-50",
  green: "border-green-400 bg-green-50",
  blue: "border-blue-400 bg-blue-50",
  pink: "border-pink-400 bg-pink-50",
};

interface Props {
  highlight: Highlight & { articleTitle: string };
}

export default function HighlightRow({ highlight }: Props) {
  return (
    <div className={`border-l-4 pl-4 py-2 rounded-r-md ${COLOR_STYLE[highlight.color] ?? "border-gray-300"}`}>
      <p className="text-sm text-gray-800">{highlight.text}</p>
      {highlight.note && (
        <p className="text-xs text-gray-500 italic mt-1">Note: {highlight.note}</p>
      )}
      <div className="flex gap-2 mt-1 items-center">
        <Link
          href={`/reader/${highlight.articleId.toString()}`}
          className="text-xs text-blue-600 hover:underline"
        >
          {highlight.articleTitle}
        </Link>
        <span className="text-xs text-gray-400">
          {new Date(highlight.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
