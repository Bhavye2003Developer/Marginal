import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const articleId = searchParams.get("articleId");
  const tag = searchParams.get("tag");

  const db = await getDb();
  const query: Record<string, unknown> = {};

  if (articleId && ObjectId.isValid(articleId)) {
    query.articleId = new ObjectId(articleId);
  } else if (tag) {
    const articles = await db
      .collection("articles")
      .find({ tags: tag }, { projection: { _id: 1 } })
      .toArray();
    query.articleId = { $in: articles.map((a) => a._id) };
  }

  const highlights = await db
    .collection("highlights")
    .find(query)
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray();

  return NextResponse.json(highlights);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.articleId || !body?.color || !body?.text || !body?.anchor) {
    return NextResponse.json({ error: "articleId, color, text, anchor required" }, { status: 400 });
  }
  if (!ObjectId.isValid(body.articleId)) {
    return NextResponse.json({ error: "Invalid articleId" }, { status: 400 });
  }
  const COLORS = ["yellow", "green", "blue", "pink"];
  if (!COLORS.includes(body.color)) {
    return NextResponse.json({ error: "Invalid color" }, { status: 400 });
  }

  const doc = {
    articleId: new ObjectId(body.articleId),
    color: body.color as string,
    text: String(body.text),
    note: null as string | null,
    createdAt: new Date(),
    anchor: {
      blockId: body.anchor.blockId ?? null,
      startOffset: body.anchor.startOffset ?? null,
      endOffset: body.anchor.endOffset ?? null,
      page: body.anchor.page ?? null,
      rects: body.anchor.rects ?? null,
    },
  };

  const db = await getDb();
  const result = await db.collection("highlights").insertOne(doc);
  return NextResponse.json({ ...doc, _id: result.insertedId }, { status: 201 });
}
