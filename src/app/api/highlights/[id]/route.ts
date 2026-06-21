import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (!("note" in body)) return NextResponse.json({ error: "note required" }, { status: 400 });
  const note = body.note === null ? null : String(body.note);

  const db = await getDb();
  const result = await db.collection("highlights").findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { note } },
    { returnDocument: "after" }
  );
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const db = await getDb();
  await db.collection("highlights").deleteOne({ _id: new ObjectId(id) });
  return new NextResponse(null, { status: 204 });
}
