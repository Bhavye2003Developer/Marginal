import { NextRequest, NextResponse } from "next/server";
import { getSupabase, toHighlight } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    if (!("note" in body)) return NextResponse.json({ error: "note required" }, { status: 400 });
    const note = body.note === null ? null : String(body.note);

    const sb = getSupabase();
    const { data, error } = await sb
      .from("highlights")
      .update({ note })
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(toHighlight(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const sb = getSupabase();
    await sb.from("highlights").delete().eq("id", id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
