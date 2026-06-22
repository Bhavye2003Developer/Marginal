"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
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
    try {
      const res = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: article.id,
          color,
          text: selection.text,
          anchor: { blockId: selection.blockId, startOffset: selection.startOffset, endOffset: selection.endOffset, page: null, rects: null },
        }),
      });
      if (!res.ok) return;
      const h = await res.json();
      setHighlights((prev) => [...prev, h]);
    } finally {
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  }

  async function saveNote(id: string, note: string | null) {
    try {
      const res = await fetch(`/api/highlights/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setHighlights((prev) => prev.map((h) => (h.id === id ? updated : h)));
    } finally {
      setActiveHighlight(null);
    }
  }

  async function deleteHighlight(id: string) {
    try {
      const res = await fetch(`/api/highlights/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    } finally {
      setActiveHighlight(null);
    }
  }

  async function saveTags(newTags: string[]) {
    const prev = tags;
    setTags(newTags);
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: newTags }),
      });
      if (!res.ok) setTags(prev);
    } catch {
      setTags(prev);
    }
  }

  const domain = (() => {
    try { return new URL(article.sourceUrl).hostname.replace("www.", ""); }
    catch { return article.sourceUrl; }
  })();

  return (
    <FocusMode active={focusMode} onToggle={() => setFocusMode((v) => !v)}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <Link
            href="/library"
            style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
          >
            ← Library
          </Link>
          <button
            onClick={() => setFocusMode((v) => !v)}
            style={{ fontSize: 12, color: "var(--text-subtle)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)"; }}
          >
            {focusMode ? "Exit focus" : "Focus mode"}
          </button>
        </div>

        <header style={{ marginBottom: 40, paddingBottom: 32, borderBottom: "1px solid var(--border)" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", lineHeight: 1.3, marginBottom: 12 }}>
            {article.title}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: "var(--text-subtle)", textDecoration: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)"; }}
            >
              {domain}
            </a>
            <span style={{ color: "var(--border-hover)" }}>·</span>
            <span style={{ fontSize: 13, color: "var(--text-subtle)" }}>
              {new Date(article.savedAt).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
          <TagInput tags={tags} onChange={saveTags} />
        </header>

        <article>
          <div onMouseUp={handleMouseUp} style={{ position: "relative" }}>
            <HighlightLayer
              content={article.content ?? ""}
              highlights={highlights}
              onHighlightClick={setActiveHighlight}
            />
          </div>
        </article>

        {selection && (
          <ColorPicker rect={selection.rect} onSelect={saveHighlight} onDismiss={() => setSelection(null)} />
        )}
        {activeHighlight && (
          <NotePopover
            highlight={activeHighlight}
            onSave={(note) => saveNote(activeHighlight.id, note)}
            onDelete={() => deleteHighlight(activeHighlight.id)}
            onClose={() => setActiveHighlight(null)}
          />
        )}
      </div>
    </FocusMode>
  );
}
