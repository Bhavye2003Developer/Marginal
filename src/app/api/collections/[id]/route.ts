import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const db = await getDb();
  const result = await db.collection("collections").findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { name: body.name.trim() } },
    { returnDocument: "after" }
  );
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const db = await getDb();
  const oid = new ObjectId(id);
  await db.collection("collections").deleteOne({ _id: oid });
  await db.collection("articles").updateMany(
    { collectionIds: oid },
    { $pull: { collectionIds: oid } } as Record<string, unknown>
  );
  return new NextResponse(null, { status: 204 });
}
