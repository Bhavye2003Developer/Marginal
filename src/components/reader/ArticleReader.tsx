"use client";
import { useState } from "react";
import type { Article, Highlight } from "@/lib/types";
import HighlightLayer from "./HighlightLayer";
import TagInput from "@/components/ui/TagInput";

interface Props {
  article: Article;
  highlights: Highlight[];
}

export default function ArticleReader({ article, highlights: initial }: Props) {
  const [highlights, setHighlights] = useState<Highlight[]>(initial);
  const [tags, setTags] = useState<string[]>(article.tags);

  async function saveTags(newTags: string[]) {
    setTags(newTags);
    await fetch(`/api/articles/${article._id.toString()}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
        <a
          href={article.sourceUrl}
          className="text-sm text-blue-600 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {article.sourceUrl}
        </a>
        <div className="mt-3">
          <TagInput tags={tags} onChange={saveTags} />
        </div>
      </div>
      <HighlightLayer
        content={article.content ?? ""}
        highlights={highlights}
        onHighlightClick={() => {}}
      />
    </main>
  );
}
