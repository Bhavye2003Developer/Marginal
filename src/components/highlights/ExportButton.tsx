"use client";
import type { Highlight, Article } from "@/lib/types";
import { generateMarkdown } from "@/lib/export";

interface Props {
  highlights: Highlight[];
  articles: Article[];
}

export default function ExportButton({ highlights, articles }: Props) {
  function handleExport() {
    if (highlights.length === 0) return;
    const md = generateMarkdown(highlights, articles);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `highlights-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      disabled={highlights.length === 0}
      className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
    >
      Export .md
      {highlights.length > 0 && <span className="ml-1 text-stone-400">({highlights.length})</span>}
    </button>
  );
}
