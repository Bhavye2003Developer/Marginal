import type { Highlight, Article } from "./types";

const EMOJI: Record<string, string> = {
  yellow: "🟡",
  green: "🟢",
  blue: "🔵",
  pink: "🩷",
};

export function generateMarkdown(highlights: Highlight[], articles: Article[]): string {
  if (highlights.length === 0) return "";

  const articleMap = new Map(articles.map((a) => [a.id, a]));

  // Group highlights by article
  const grouped = new Map<string, Highlight[]>();
  for (const h of highlights) {
    const key = h.articleId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(h);
  }

  const date = new Date().toISOString().split("T")[0];
  const lines: string[] = [
    "# Exported Highlights",
    `Exported: ${date} · ${highlights.length} highlights · ${grouped.size} sources`,
    "",
  ];

  for (const [articleId, group] of grouped) {
    const article = articleMap.get(articleId);
    if (!article) continue;

    const isPdf = article.type === "pdf";
    lines.push(`## ${article.title}${isPdf ? " (PDF)" : ""}`);

    // For PDFs, include page number of first highlight with a page
    const firstPage = isPdf ? group.find((h) => h.anchor.page != null)?.anchor.page : undefined;
    const pageNote = firstPage != null ? ` · Page ${firstPage}` : "";
    const savedDate = new Date(article.savedAt).toISOString().split("T")[0];
    lines.push(`**Source:** ${article.sourceUrl}${pageNote} · Saved: ${savedDate}`);
    lines.push("");

    for (const h of group) {
      const emoji = EMOJI[h.color] ?? "•";
      lines.push(`> ${emoji} ${h.text}`);
      if (h.note) lines.push(`— *Note: ${h.note}*`);
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}
