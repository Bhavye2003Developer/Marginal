import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { extractArticle } from "@/lib/readability";
import { assignBlockIds } from "@/lib/block-ids";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "unread";
  const tag = searchParams.get("tag");
  const collectionId = searchParams.get("collectionId");
  const search = searchParams.get("search");

  const db = await getDb();
  const query: Record<string, unknown> = { status };
  if (tag) query.tags = tag;
  if (collectionId && ObjectId.isValid(collectionId))
    query.collectionIds = new ObjectId(collectionId);
  if (search) query.$text = { $search: search };

  const articles = await db
    .collection("articles")
    .find(query)
    .sort({ savedAt: -1 })
    .limit(100)
    .toArray();
  return NextResponse.json(articles);
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
  const now = new Date();
  const doc = {
    type: "article" as const,
    title: extracted.title,
    sourceUrl: body.url,
    status: "unread" as const,
    tags: [],
    collectionIds: [],
    savedAt: now,
    updatedAt: now,
    content,
    images: extracted.images,
    fileUrl: null,
    pageCount: null,
    searchableText: null,
  };

  const db = await getDb();
  const result = await db.collection("articles").insertOne(doc);
  return NextResponse.json({ ...doc, _id: result.insertedId }, { status: 201 });
}
