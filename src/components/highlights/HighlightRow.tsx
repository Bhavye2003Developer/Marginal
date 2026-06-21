"use client";
import Link from "next/link";
import type { Highlight } from "@/lib/types";

const COLOR_BORDER: Record<string, string> = {
  yellow: "#F59E0B",
  green: "#10B981",
  blue: "#3B82F6",
  pink: "#EC4899",
};

const COLOR_BG: Record<string, string> = {
  yellow: "#FFFBEB",
  green: "#F0FDF4",
  blue: "#EFF6FF",
  pink: "#FDF2F8",
};

interface Props {
  highlight: Highlight & { articleTitle: string };
}

export default function HighlightRow({ highlight }: Props) {
  const border = COLOR_BORDER[highlight.color] ?? "#E8E6E1";
  const bg = COLOR_BG[highlight.color] ?? "#ffffff";

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #E8E6E1",
        borderLeft: `3px solid ${border}`,
        borderRadius: 10,
        padding: "14px 16px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <blockquote
        style={{
          fontSize: 14,
          lineHeight: 1.7,
          color: "#2C2C2C",
          margin: "0 0 8px 0",
          background: bg,
          borderRadius: 6,
          padding: "8px 12px",
        }}
      >
        &ldquo;{highlight.text}&rdquo;
      </blockquote>
      {highlight.note && (
        <p style={{ fontSize: 12, color: "#6B6B6B", fontStyle: "italic", marginBottom: 8, paddingTop: 8, borderTop: "1px solid #F0EFE9" }}>
          Note: {highlight.note}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: border, flexShrink: 0, display: "inline-block" }} />
        <Link
          href={`/reader/${highlight.articleId}`}
          style={{ fontSize: 12, fontWeight: 500, color: "#5B5BD6", textDecoration: "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {highlight.articleTitle}
        </Link>
        <span style={{ fontSize: 12, color: "#A8A49C", flexShrink: 0 }}>
          {new Date(highlight.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}
