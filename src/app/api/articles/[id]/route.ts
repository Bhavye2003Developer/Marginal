import { NextRequest, NextResponse } from "next/server";
import { getSupabase, toArticle } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const sb = getSupabase();
    const { data, error } = await sb.from("articles").select("*").eq("id", id).single();
    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(toArticle(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status === "unread" || body.status === "archived") updates.status = body.status;
    if (Array.isArray(body.tags)) updates.tags = body.tags.map(String);
    if (Array.isArray(body.collectionIds)) updates.collection_ids = body.collectionIds.map(String);

    const sb = getSupabase();
    const { data, error } = await sb
      .from("articles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(toArticle(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const sb = getSupabase();
    // highlights.article_id becomes null via FK ON DELETE SET NULL
    await sb.from("articles").delete().eq("id", id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
