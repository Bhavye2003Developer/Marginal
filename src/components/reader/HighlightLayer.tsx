"use client";
import { useEffect, useRef } from "react";
import type { Highlight } from "@/lib/types";

const COLOR_CLASS: Record<string, string> = {
  yellow: "bg-yellow-200",
  green: "bg-green-200",
  blue: "bg-blue-200",
  pink: "bg-pink-200",
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
  // fallback to last node end
  const last = walker.currentNode as Text;
  return { node: last, offset: last?.textContent?.length ?? 0 };
}

export default function HighlightLayer({ content, highlights, onHighlightClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    // content is Readability-extracted server-side (scripts/event handlers stripped).
    // We set innerHTML imperatively so React doesn't own this node and won't
    // overwrite our <mark> elements on re-render.
    container.innerHTML = content; // eslint-disable-line no-unsanitized/property

    // Apply each highlight
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
        mark.dataset.highlightId = h._id.toString();
        mark.addEventListener("click", () => onHighlightClick(h));
        range.surroundContents(mark);
      } catch {
        // stale anchor — skip silently
      }
    }
  }, [highlights, content]);

  return (
    <div
      ref={ref}
      className="leading-relaxed text-base text-gray-800 max-w-none"
    />
  );
}
