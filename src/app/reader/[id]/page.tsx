import { notFound } from "next/navigation";
import { getSupabase, toArticle, toHighlight } from "@/lib/supabase";
import ArticleReader from "@/components/reader/ArticleReader";
import PdfReader from "@/components/reader/PdfReader";

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
    return <PdfReader article={article} highlights={highlights} />;
  }
  return <ArticleReader article={article} highlights={highlights} />;
}
