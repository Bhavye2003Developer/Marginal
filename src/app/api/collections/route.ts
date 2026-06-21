import { NextRequest, NextResponse } from "next/server";
import { getSupabase, toCollection } from "@/lib/supabase";

export async function GET() {
  const sb = getSupabase();
  const { data, error } = await sb.from("collections").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(toCollection));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const sb = getSupabase();
  const { data, error } = await sb
    .from("collections")
    .insert({ name: body.name.trim() })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(toCollection(data), { status: 201 });
}
