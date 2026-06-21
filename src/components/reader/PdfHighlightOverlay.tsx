"use client";
import type { Highlight } from "@/lib/types";

const COLOR_STYLE: Record<string, string> = {
  yellow: "rgba(253,224,71,0.4)",
  green: "rgba(134,239,172,0.4)",
  blue: "rgba(147,197,253,0.4)",
  pink: "rgba(249,168,212,0.4)",
};

interface Props {
  highlights: Highlight[];
  page: number;
  pageWidth: number;
  pageHeight: number;
  onHighlightClick: (h: Highlight) => void;
}

export default function PdfHighlightOverlay({ highlights, page, pageWidth, pageHeight, onHighlightClick }: Props) {
  const pageHighlights = highlights.filter((h) => h.anchor.page === page && h.anchor.rects);
  return (
    <>
      {pageHighlights.map((h) =>
        h.anchor.rects!.map((rect, i) => (
          <div
            key={`${h._id.toString()}-${i}`}
            onClick={() => onHighlightClick(h)}
            style={{
              position: "absolute",
              left: rect.x * pageWidth,
              top: rect.y * pageHeight,
              width: rect.width * pageWidth,
              height: rect.height * pageHeight,
              background: COLOR_STYLE[h.color] ?? "rgba(253,224,71,0.4)",
              cursor: "pointer",
              pointerEvents: "all",
            }}
          />
        ))
      )}
    </>
  );
}
