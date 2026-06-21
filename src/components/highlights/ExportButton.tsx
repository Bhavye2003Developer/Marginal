"use client";
import type { Highlight, Article } from "@/lib/types";

interface Props {
  highlights: Highlight[];
  articles: Article[];
}

export default function ExportButton({ highlights }: Props) {
  return (
    <button
      disabled={highlights.length === 0}
      className="text-sm border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Export .md ({highlights.length})
    </button>
  );
}
