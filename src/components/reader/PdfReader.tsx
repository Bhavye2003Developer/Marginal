"use client";
import type { Article, Highlight } from "@/lib/types";

interface Props {
  article: Article;
  highlights: Highlight[];
}

export default function PdfReader({ article }: Props) {
  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">{article.title}</h1>
      <p className="text-sm text-gray-500 mt-1">PDF viewer coming soon.</p>
    </main>
  );
}
