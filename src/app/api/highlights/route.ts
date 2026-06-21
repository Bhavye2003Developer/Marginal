import { NextRequest, NextResponse } from "next/server";
import { getSupabase, toHighlight } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const articleId = searchParams.get("articleId");
  const tag = searchParams.get("tag");

  const sb = getSupabase();

  if (articleId) {
    const { data, error } = await sb
      .from("highlights")
      .select("*")
      .eq("article_id", articleId)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data ?? []).map(toHighlight));
  }

  if (tag) {
    // Join through articles.tags
    const { data: articles } = await sb
      .from("articles")
      .select("id")
      .contains("tags", [tag]);
    const ids = (articles ?? []).map((a: { id: string }) => a.id);
    if (ids.length === 0) return NextResponse.json([]);
    const { data, error } = await sb
      .from("highlights")
      .select("*")
      .in("article_id", ids)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data ?? []).map(toHighlight));
  }

  // No filter — return all
  const { data, error } = await sb
    .from("highlights")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(toHighlight));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.articleId || !body?.color || !body?.text || !body?.anchor) {
    return NextResponse.json({ error: "articleId, color, text, anchor required" }, { status: 400 });
  }
  const COLORS = ["yellow", "green", "blue", "pink"];
  if (!COLORS.includes(body.color)) {
    return NextResponse.json({ error: "Invalid color" }, { status: 400 });
  }

  const sb = getSupabase();
  const { data, error } = await sb
    .from("highlights")
    .insert({
      article_id: body.articleId,
      color: body.color,
      text: String(body.text),
      note: null,
      block_id: body.anchor.blockId ?? null,
      start_offset: body.anchor.startOffset ?? null,
      end_offset: body.anchor.endOffset ?? null,
      page: body.anchor.page ?? null,
      rects: body.anchor.rects ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(toHighlight(data), { status: 201 });
}
