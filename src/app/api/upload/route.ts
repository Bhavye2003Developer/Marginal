import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongodb";
import { uploadPdf } from "@/lib/r2";
import { extractPdfText } from "@/lib/pdf";

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if ((file as File).type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  const buffer = Buffer.from(await (file as File).arrayBuffer());
  const key = `pdfs/${randomUUID()}.pdf`;

  let fileUrl: string;
  try {
    fileUrl = await uploadPdf(key, buffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let pageCount = 0;
  let searchableText = "";
  try {
    const extracted = await extractPdfText(buffer);
    pageCount = extracted.pageCount;
    searchableText = extracted.text;
  } catch {
    // non-fatal — PDF stored, just not searchable
  }

  const now = new Date();
  const doc = {
    type: "pdf" as const,
    title: (file as File).name.replace(/\.pdf$/i, ""),
    sourceUrl: (file as File).name,
    status: "unread" as const,
    tags: [] as string[],
    collectionIds: [] as never[],
    savedAt: now,
    updatedAt: now,
    content: null,
    images: null,
    fileUrl,
    pageCount,
    searchableText,
  };

  const db = await getDb();
  const result = await db.collection("articles").insertOne(doc);
  return NextResponse.json({ ...doc, _id: result.insertedId }, { status: 201 });
}
