import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const db = await getDb();
  const collections = await db.collection("collections").find().sort({ name: 1 }).toArray();
  return NextResponse.json(collections);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const doc = { name: body.name.trim(), createdAt: new Date() };
  const db = await getDb();
  const result = await db.collection("collections").insertOne(doc);
  return NextResponse.json({ ...doc, _id: result.insertedId }, { status: 201 });
}
