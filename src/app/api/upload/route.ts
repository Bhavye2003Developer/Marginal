import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "PDF upload is disabled" }, { status: 410 });
}
