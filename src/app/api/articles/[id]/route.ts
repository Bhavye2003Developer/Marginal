import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const db = await getDb();
  const article = await db.collection("articles").findOne({ _id: new ObjectId(id) });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(article);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const body = await req.json().catch(() => ({}));

  const $set: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status === "unread" || body.status === "archived") $set.status = body.status;
  if (Array.isArray(body.tags)) $set.tags = body.tags.map(String);
  if (Array.isArray(body.collectionIds)) {
    $set.collectionIds = body.collectionIds
      .filter((x: string) => ObjectId.isValid(x))
      .map((x: string) => new ObjectId(x));
  }

  const db = await getDb();
  const result = await db
    .collection("articles")
    .findOneAndUpdate({ _id: new ObjectId(id) }, { $set }, { returnDocument: "after" });
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const db = await getDb();
  await db.collection("articles").deleteOne({ _id: new ObjectId(id) });
  await db.collection("highlights").deleteMany({ articleId: new ObjectId(id) });
  return new NextResponse(null, { status: 204 });
}
