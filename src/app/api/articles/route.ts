import { NextRequest, NextResponse } from "next/server";
import { getSupabase, toArticle } from "@/lib/supabase";
import { extractArticle } from "@/lib/readability";
import { assignBlockIds } from "@/lib/block-ids";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "unread";
  const tag = searchParams.get("tag");
  const collectionId = searchParams.get("collectionId");
  const search = searchParams.get("search");

  const sb = getSupabase();
  let query = sb
    .from("articles")
    .select("*")
    .eq("status", status)
    .order("saved_at", { ascending: false })
    .limit(200);

  if (tag) query = query.contains("tags", [tag]);
  if (collectionId) query = query.contains("collection_ids", [collectionId]);
  if (search) query = query.textSearch("search_vector", search, { type: "websearch" });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(toArticle));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.url || typeof body.url !== "string") {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  let extracted;
  try {
    extracted = await extractArticle(body.url);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const content = assignBlockIds(extracted.content);
  const now = new Date().toISOString();
  const sb = getSupabase();
  const { data, error } = await sb
    .from("articles")
    .insert({
      type: "article",
      title: extracted.title,
      source_url: body.url,
      status: "unread",
      tags: [],
      collection_ids: [],
      saved_at: now,
      updated_at: now,
      content,
      images: extracted.images,
      file_url: null,
      page_count: null,
      searchable_text: null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(toArticle(data), { status: 201 });
}
