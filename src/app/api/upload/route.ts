import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabase, toArticle } from "@/lib/supabase";
import { uploadPdf } from "@/lib/r2";
import { extractPdfText } from "@/lib/pdf";

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if ((file as File).type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  const buffer = Buffer.from(await (file as File).arrayBuffer());
  if (buffer.length > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "PDF too large (max 50MB)" }, { status: 413 });
  }

  const key = `pdfs/${randomUUID()}.pdf`;
  let fileUrl: string;
  try {
    fileUrl = await uploadPdf(key, buffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let pageCount = 0;
  let searchableText = "";
  try {
    const extracted = await extractPdfText(buffer);
    pageCount = extracted.pageCount;
    searchableText = extracted.text;
  } catch {
    // non-fatal — PDF stored, just not searchable
  }

  const now = new Date().toISOString();
  const sb = getSupabase();
  const { data, error } = await sb
    .from("articles")
    .insert({
      type: "pdf",
      title: (file as File).name.replace(/\.pdf$/i, ""),
      source_url: (file as File).name,
      status: "unread",
      tags: [],
      collection_ids: [],
      saved_at: now,
      updated_at: now,
      content: null,
      images: null,
      file_url: fileUrl,
      page_count: pageCount,
      searchable_text: searchableText,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(toArticle(data), { status: 201 });
}
