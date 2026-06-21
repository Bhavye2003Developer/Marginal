import { notFound } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { Article, Highlight } from "@/lib/types";
import ArticleReader from "@/components/reader/ArticleReader";
import PdfReader from "@/components/reader/PdfReader";

export default async function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const db = await getDb();
  const article = await db.collection<Article>("articles").findOne({ _id: new ObjectId(id) });
  if (!article) notFound();

  const highlights = await db
    .collection<Highlight>("highlights")
    .find({ articleId: new ObjectId(id) })
    .toArray();

  // Serialize ObjectIds for client components
  const serialized = JSON.parse(JSON.stringify({ article, highlights }));

  if (article.type === "pdf") {
    return <PdfReader article={serialized.article} highlights={serialized.highlights} />;
  }
  return <ArticleReader article={serialized.article} highlights={serialized.highlights} />;
}
