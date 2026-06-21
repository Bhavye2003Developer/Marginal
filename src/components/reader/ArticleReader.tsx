"use client";
import { useState, useCallback } from "react";
import type { Article, Highlight } from "@/lib/types";
import HighlightLayer from "./HighlightLayer";
import ColorPicker from "./ColorPicker";
import NotePopover from "./NotePopover";
import FocusMode from "./FocusMode";
import TagInput from "@/components/ui/TagInput";

interface SelectionState {
  blockId: string;
  startOffset: number;
  endOffset: number;
  text: string;
  rect: DOMRect;
}

interface Props {
  article: Article;
  highlights: Highlight[];
}

function getCharOffset(root: Element, container: Node, nodeOffset: number): number {
  let cur = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    if (node === container) return cur + nodeOffset;
    cur += node.textContent?.length ?? 0;
    node = walker.nextNode() as Text | null;
  }
  return cur;
}

export default function ArticleReader({ article, highlights: initial }: Props) {
  const [highlights, setHighlights] = useState<Highlight[]>(initial);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [tags, setTags] = useState<string[]>(article.tags);
  const [focusMode, setFocusMode] = useState(false);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const anchor = (range.startContainer.nodeType === Node.TEXT_NODE
      ? (range.startContainer as Text).parentElement
      : range.startContainer as Element
    )?.closest("[data-block-id]");
    if (!anchor) return;
    const blockId = anchor.getAttribute("data-block-id")!;
    const startOffset = getCharOffset(anchor, range.startContainer, range.startOffset);
    const endOffset = getCharOffset(anchor, range.endContainer, range.endOffset);
    setSelection({ blockId, startOffset, endOffset, text: sel.toString(), rect: range.getBoundingClientRect() });
  }, []);

  async function saveHighlight(color: "yellow" | "green" | "blue" | "pink") {
    if (!selection) return;
    const res = await fetch("/api/highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        articleId: article._id.toString(),
        color,
        text: selection.text,
        anchor: { blockId: selection.blockId, startOffset: selection.startOffset, endOffset: selection.endOffset, page: null, rects: null },
      }),
    });
    if (!res.ok) { console.error("Failed to save highlight", res.status); return; }
    const h = await res.json();
    setHighlights((prev) => [...prev, h]);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  async function saveNote(id: string, note: string | null) {
    const res = await fetch(`/api/highlights/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) { console.error("Failed to save note", res.status); setActiveHighlight(null); return; }
    const updated = await res.json();
    setHighlights((prev) => prev.map((h) => (h._id.toString() === id ? updated : h)));
    setActiveHighlight(null);
  }

  async function deleteHighlight(id: string) {
    const res = await fetch(`/api/highlights/${id}`, { method: "DELETE" });
    if (!res.ok) { console.error("Failed to delete highlight", res.status); return; }
    setHighlights((prev) => prev.filter((h) => h._id.toString() !== id));
    setActiveHighlight(null);
  }

  async function saveTags(newTags: string[]) {
    const prev = tags;
    setTags(newTags);
    const res = await fetch(`/api/articles/${article._id.toString()}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
    if (!res.ok) { console.error("Failed to save tags", res.status); setTags(prev); }
  }

  return (
    <FocusMode active={focusMode} onToggle={() => setFocusMode((v) => !v)}>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
          <a href={article.sourceUrl} className="text-sm text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
            {article.sourceUrl}
          </a>
          <div className="mt-3">
            <TagInput tags={tags} onChange={saveTags} />
          </div>
        </div>
        <div onMouseUp={handleMouseUp} className="relative">
          <HighlightLayer
            content={article.content ?? ""}
            highlights={highlights}
            onHighlightClick={setActiveHighlight}
          />
        </div>
        {selection && (
          <ColorPicker rect={selection.rect} onSelect={saveHighlight} onDismiss={() => setSelection(null)} />
        )}
        {activeHighlight && (
          <NotePopover
            highlight={activeHighlight}
            onSave={(note) => saveNote(activeHighlight._id.toString(), note)}
            onDelete={() => deleteHighlight(activeHighlight._id.toString())}
            onClose={() => setActiveHighlight(null)}
          />
        )}
      </main>
    </FocusMode>
  );
}
