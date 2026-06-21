"use client";
import Link from "next/link";
import type { Highlight } from "@/lib/types";

const COLOR_ACCENT: Record<string, string> = {
  yellow: "#D97706",
  green:  "#059669",
  blue:   "#2563EB",
  pink:   "#DB2777",
};

const COLOR_BG_LIGHT: Record<string, string> = {
  yellow: "rgba(251,191,36,0.12)",
  green:  "rgba(16,185,129,0.10)",
  blue:   "rgba(59,130,246,0.10)",
  pink:   "rgba(236,72,153,0.10)",
};

interface Props {
  highlight: Highlight & { articleTitle: string };
}

export default function HighlightRow({ highlight }: Props) {
  const accent = COLOR_ACCENT[highlight.color] ?? "var(--border)";
  const quoteBg = COLOR_BG_LIGHT[highlight.color] ?? "var(--bg-surface)";

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${accent}`,
        borderRadius: 10,
        padding: "14px 16px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <blockquote
        style={{
          fontSize: 14,
          lineHeight: 1.7,
          color: "var(--text)",
          margin: "0 0 8px 0",
          background: quoteBg,
          borderRadius: 6,
          padding: "8px 12px",
        }}
      >
        &ldquo;{highlight.text}&rdquo;
      </blockquote>
      {highlight.note && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", marginBottom: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          Note: {highlight.note}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent, flexShrink: 0, display: "inline-block" }} />
        <Link
          href={`/reader/${highlight.articleId}`}
          style={{ fontSize: 12, fontWeight: 500, color: "var(--accent)", textDecoration: "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}
        >
          {highlight.articleTitle}
        </Link>
        <span style={{ fontSize: 12, color: "var(--text-subtle)", flexShrink: 0 }}>
          {new Date(highlight.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}
