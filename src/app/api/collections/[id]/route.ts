import { NextRequest, NextResponse } from "next/server";
import { getSupabase, toCollection } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const sb = getSupabase();
  const { data, error } = await sb
    .from("collections")
    .update({ name: body.name.trim() })
    .eq("id", id)
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(toCollection(data));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const sb = getSupabase();
  // Remove collection from all articles using the SQL helper function
  await sb.rpc("remove_collection_from_articles", { collection_uuid: id });
  await sb.from("collections").delete().eq("id", id);
  return new NextResponse(null, { status: 204 });
}
