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
      className="text-sm border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Export .md ({highlights.length})
    </button>
  );
}
