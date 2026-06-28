"use client";
import { useEffect, useRef, memo } from "react";
import type { Highlight } from "@/lib/types";

const COLOR_CLASS: Record<string, string> = {
  yellow: "bg-yellow-200",
  green:  "bg-green-200",
  blue:   "bg-blue-200",
  pink:   "bg-pink-200",
};

interface Props {
  content: string;
  highlights: Highlight[];
  onHighlightClick: (h: Highlight) => void;
}

function findNodeAtOffset(root: Element, target: number): { node: Text; offset: number } {
  let cur = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    const len = node.textContent?.length ?? 0;
    if (cur + len >= target) return { node, offset: target - cur };
    cur += len;
    node = walker.nextNode() as Text | null;
  }
  const last = walker.currentNode as Text;
  return { node: last, offset: last?.textContent?.length ?? 0 };
}

function HighlightLayer({ content, highlights, onHighlightClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // ── Effect 1: content only ────────────────────────────────────────────────
  // Resets innerHTML — runs ONLY when article content changes, not on every
  // highlight add. Avoids re-parsing a large HTML string on each annotation.
  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    container.innerHTML = content; // eslint-disable-line no-unsanitized/property

    // Ensure every text-bearing element has a data-block-id so captureSelection()
    // can anchor highlights. Articles saved before the server-side block-ID fix
    // have no IDs at all; this client-side pass fills the gap deterministically.
    const BLOCK_SEL = "p,li,h1,h2,h3,h4,h5,h6,blockquote,pre,td,th,dt,dd,figcaption";
    // Start counter AFTER any IDs already assigned server-side to avoid collisions
    let bIdx = container.querySelectorAll("[data-block-id]").length;
    container.querySelectorAll<Element>(BLOCK_SEL).forEach((el) => {
      if (!el.hasAttribute("data-block-id")) el.setAttribute("data-block-id", `b${bIdx++}`);
    });
    // Also cover leaf <div>/<section> containers Readability sometimes emits
    container.querySelectorAll<Element>("div,section").forEach((el) => {
      if (el.hasAttribute("data-block-id")) return;
      if (el.querySelector(BLOCK_SEL + ",div,section")) return; // not a leaf
      if ((el.textContent ?? "").trim()) el.setAttribute("data-block-id", `b${bIdx++}`);
    });

    container.querySelectorAll<HTMLImageElement>("img[data-src]").forEach((img) => {
      if (!img.src && img.dataset.src) img.src = img.dataset.src;
    });
    container.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
      img.loading  = "lazy";
      img.decoding = "async";
      img.onerror  = () => { img.style.display = "none"; };
    });

    if (/\$|\\\(|\\\[/.test(content)) {
      import("katex/contrib/auto-render").then(({ default: renderMathInElement }) => {
        renderMathInElement(container, {
          delimiters: [
            { left: "$$",  right: "$$",  display: true  },
            { left: "$",   right: "$",   display: false },
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true  },
          ],
          throwOnError: false,
        });
      }).catch(() => {});
    }
  }, [content]);

  // ── Effect 2: highlights ──────────────────────────────────────────────────
  // Unwraps existing <mark> nodes and re-wraps — no innerHTML reset.
  // For N highlights on a large article this is O(N * block_text_length) instead
  // of O(article_length) that a full innerHTML reset would be.
  // Depends on `content` too so it re-runs AFTER Effect 1 when content changes.
  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    // Fast mark removal: move children out, then delete the wrapper
    container.querySelectorAll<HTMLElement>("mark[data-highlight-id]").forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
    });

    for (const h of highlights) {
      if (!h.anchor.blockId || h.anchor.startOffset == null || h.anchor.endOffset == null) continue;
      const block = container.querySelector(`[data-block-id="${h.anchor.blockId}"]`);
      if (!block) continue;
      try {
        const { node: sn, offset: so } = findNodeAtOffset(block, h.anchor.startOffset);
        const { node: en, offset: eo } = findNodeAtOffset(block, h.anchor.endOffset);
        const range = document.createRange();
        range.setStart(sn, so);
        range.setEnd(en, eo);
        const mark = document.createElement("mark");
        mark.className = `${COLOR_CLASS[h.color] ?? "bg-yellow-200"} cursor-pointer rounded-sm`;
        mark.dataset.highlightId = h.id;
        mark.addEventListener("click", () => onHighlightClick(h));
        range.surroundContents(mark);
      } catch {
        // stale anchor (content changed) — skip
      }
    }
  }, [highlights, content, onHighlightClick]);

  return <div ref={ref} className="prose-reader" />;
}

// memo: skip re-render when parent updates for unrelated reasons (selection,
// activeHighlight, focusMode, etc.) — only re-render when props actually change.
export default memo(HighlightLayer);
