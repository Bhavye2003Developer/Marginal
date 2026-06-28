"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import type { Article, Highlight } from "@/lib/types";
import HighlightLayer from "./HighlightLayer";
import ColorPicker from "./ColorPicker";
import FloatingHighlighter from "./FloatingHighlighter";
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

function captureSelection(): SelectionState | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  const anchor = (range.startContainer.nodeType === Node.TEXT_NODE
    ? (range.startContainer as Text).parentElement
    : range.startContainer as Element
  )?.closest("[data-block-id]");
  if (!anchor) return null;
  const blockId = anchor.getAttribute("data-block-id")!;
  const startOffset = getCharOffset(anchor, range.startContainer, range.startOffset);
  const endOffset = getCharOffset(anchor, range.endContainer, range.endOffset);
  if (startOffset === endOffset) return null;
  return { blockId, startOffset, endOffset, text: sel.toString(), rect: range.getBoundingClientRect() };
}

export default function ArticleReader({ article, highlights: initial }: Props) {
  const [highlights, setHighlights] = useState<Highlight[]>(initial);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [tags, setTags] = useState<string[]>(article.tags);
  const [focusMode, setFocusMode] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [offlineSaving, setOfflineSaving] = useState(false);

  // Stores the last valid selection — persists when floating ball is tapped
  const selectionRef = useRef<SelectionState | null>(null);

  // Check if this article is already cached
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const checkCached = async () => {
      const cache = await caches.open("marginal-reader-v1").catch(() => null);
      if (!cache) return;
      const match = await cache.match(`/reader/${article.id}`);
      setOfflineSaved(!!match);
    };
    checkCached();
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "CACHE_DONE" && e.data.id === article.id) {
        setOfflineSaving(false);
        setOfflineSaved(e.data.ok);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [article.id]);

  // Track selection continuously — debounced so it doesn't fire on every cursor blink
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handleSelectionChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const s = captureSelection();
        if (s) selectionRef.current = s;
      }, 80);
    };
    document.addEventListener("selectionchange", handleSelectionChange, { passive: true });
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  function toggleOffline() {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return;
    if (offlineSaved) {
      navigator.serviceWorker.controller.postMessage({ type: "UNCACHE_ARTICLE", id: article.id });
      setOfflineSaved(false);
    } else {
      setOfflineSaving(true);
      navigator.serviceWorker.controller.postMessage({ type: "CACHE_ARTICLE", id: article.id });
    }
  }

  // Desktop: show ColorPicker popup above selection on mouseup
  const handleMouseUp = useCallback(() => {
    const s = captureSelection();
    if (s) setSelection(s);
  }, []);

  async function saveHighlight(
    color: "yellow" | "green" | "blue" | "pink",
    override?: SelectionState
  ) {
    const sel = override ?? selection;
    if (!sel) return;
    try {
      const res = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: article.id,
          color,
          text: sel.text,
          anchor: {
            blockId: sel.blockId,
            startOffset: sel.startOffset,
            endOffset: sel.endOffset,
            page: null,
            rects: null,
          },
        }),
      });
      if (!res.ok) return;
      const h = await res.json();
      setHighlights((prev) => [...prev, h]);
    } finally {
      setSelection(null);
      selectionRef.current = null;
      window.getSelection()?.removeAllRanges();
    }
  }

  // Called by the floating ball — reads from selectionRef so selection survives the tap
  async function handleFloatHighlight(color: "yellow" | "green" | "blue" | "pink") {
    const sel = selectionRef.current;
    if (!sel) return;
    await saveHighlight(color, sel);
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
      <div className="reader-wrap">
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40, flexWrap: "wrap", gap: 8 }}>
          <Link
            href="/library"
            style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
          >
            ← Library
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={toggleOffline}
              disabled={offlineSaving}
              title={offlineSaved ? "Cached offline — click to remove" : "Save for offline reading"}
              className={`offline-badge${offlineSaved ? " cached" : ""}`}
            >
              {offlineSaving ? (
                <><span className="spinner" style={{ width: 8, height: 8, borderWidth: 1.5 }} /> Saving…</>
              ) : offlineSaved ? (
                <>✓ Offline</>
              ) : (
                <>↓ Save offline</>
              )}
            </button>
            <button
              onClick={() => setFocusMode((v) => !v)}
              style={{ fontSize: 12, color: "var(--text-subtle)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)"; }}
            >
              {focusMode ? "Exit focus" : "Focus mode"}
            </button>
          </div>
        </div>

        <header style={{ marginBottom: 40, paddingBottom: 32, borderBottom: "1px solid var(--border)" }}>
          <h1 className="reader-h1" style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", lineHeight: 1.3, marginBottom: 12 }}>
            {article.title}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
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
          <ColorPicker
            rect={selection.rect}
            onSelect={(color) => saveHighlight(color)}
            onDismiss={() => setSelection(null)}
          />
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

      {/* Floating highlight ball — always visible, works on mobile */}
      <FloatingHighlighter onHighlight={handleFloatHighlight} />
    </FocusMode>
  );
}
