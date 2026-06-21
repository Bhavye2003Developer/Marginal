import { notFound } from "next/navigation";
import { getSupabase, toArticle, toHighlight } from "@/lib/supabase";
import ArticleReader from "@/components/reader/ArticleReader";

export default async function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getSupabase();

  const { data: articleRow } = await sb.from("articles").select("*").eq("id", id).single();
  if (!articleRow) notFound();

  const { data: highlightRows } = await sb
    .from("highlights")
    .select("*")
    .eq("article_id", id)
    .order("created_at", { ascending: false });

  const article = toArticle(articleRow);
  const highlights = (highlightRows ?? []).map(toHighlight);

  if (article.type === "pdf") {
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", color: "#6B6B6B", padding: "0 24px" }}>
        <p style={{ fontSize: 40, marginBottom: 16 }}>📄</p>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1A1A1A", marginBottom: 8 }}>PDF reading not supported</h2>
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>PDF reading is currently disabled. Save articles from the web instead.</p>
        <a href="/library" style={{ display: "inline-block", marginTop: 24, fontSize: 13, color: "#5B5BD6", textDecoration: "none" }}>← Back to library</a>
      </div>
    );
  }
  return <ArticleReader article={article} highlights={highlights} />;
}
