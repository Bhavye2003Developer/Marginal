# Marginal Full Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Marginal — a personal single-user read-later web app with URL/PDF saving, clean reader view, multi-color text highlighting with notes, tag/collection organization, and filtered Markdown export.

**Architecture:** Next.js 15 App Router provides the full stack — API routes handle all data mutations, server components fetch initial data. MongoDB Atlas stores all text and metadata; Cloudflare R2 stores PDF binaries only. Client components manage selection-based highlighting using block-offset anchors (articles) and page-relative rect anchors (PDFs).

**Tech Stack:** Next.js 15 (App Router), TypeScript, MongoDB native driver, `@aws-sdk/client-s3` (R2 S3-compatible), `@mozilla/readability` + `jsdom`, `pdfjs-dist` 3.x, Tailwind CSS, Jest + `mongodb-memory-server`, Zod

## Global Constraints

- Single-user — no multi-tenant auth; simple password gate is out-of-scope for v1
- No Redis, queues, or infrastructure beyond MongoDB Atlas + Cloudflare R2 + Vercel
- `highlights` have **no `tags` field** — tag filtering joins via `articleId → articles.tags`
- `articles.content` and PDFs are **immutable after save** — never build content editing
- Image `cachedUrl` starts `null`; no eager image downloading at save time
- Export is always filter-then-export — never "export all" without a filter
- Focus mode is pure client-side state — no DB fields needed

---

## File Map

```
marginal/
├── src/
│   ├── app/
│   │   ├── layout.tsx                        # root layout + nav
│   │   ├── page.tsx                          # redirect → /library
│   │   ├── library/page.tsx                  # library page (server component)
│   │   ├── reader/[id]/page.tsx              # reader page (server component)
│   │   ├── highlights/page.tsx               # highlights page (server component)
│   │   └── api/
│   │       ├── articles/route.ts             # GET (list+filter+search), POST (save URL)
│   │       ├── articles/[id]/route.ts        # GET one, PATCH (status/tags/collections), DELETE
│   │       ├── highlights/route.ts           # GET (all+filter), POST (create)
│   │       ├── highlights/[id]/route.ts      # PATCH (note), DELETE
│   │       ├── collections/route.ts          # GET all, POST create
│   │       ├── collections/[id]/route.ts     # PATCH rename, DELETE
│   │       └── upload/route.ts              # POST: PDF → R2 + store article
│   ├── lib/
│   │   ├── mongodb.ts                        # connection singleton + getDb()
│   │   ├── types.ts                          # Article, Highlight, Collection interfaces
│   │   ├── r2.ts                             # R2 client + uploadPdf()
│   │   ├── readability.ts                    # extractArticle(url)
│   │   ├── pdf.ts                            # extractPdfText(buffer) server-side
│   │   ├── block-ids.ts                      # assignBlockIds(html) + findNodeAtOffset()
│   │   └── export.ts                         # generateMarkdown(highlights[])
│   └── components/
│       ├── library/
│       │   ├── LibraryPage.tsx               # client orchestrator, owns filter state
│       │   ├── ArticleCard.tsx               # single article card
│       │   ├── SaveBar.tsx                   # URL input + PDF upload trigger
│       │   └── FilterControls.tsx            # status tabs, tag chips, collection picker, search
│       ├── reader/
│       │   ├── ArticleReader.tsx             # renders article HTML, wires highlight selection
│       │   ├── HighlightLayer.tsx            # applies <mark> nodes from highlights[]
│       │   ├── PdfReader.tsx                 # PDF.js canvas + text layer per page
│       │   ├── PdfHighlightOverlay.tsx       # colored div overlays on PDF pages
│       │   ├── ColorPicker.tsx               # 4-color popover shown on text selection
│       │   ├── NotePopover.tsx               # add/edit/delete note on highlight click
│       │   └── FocusMode.tsx                 # fullscreen wrapper + lock toggle
│       ├── highlights/
│       │   ├── HighlightsPage.tsx            # client orchestrator, owns filter state
│       │   ├── HighlightRow.tsx              # single highlight row with article link
│       │   └── ExportButton.tsx              # triggers .md download
│       └── ui/
│           ├── TagInput.tsx                  # free-text tag add/remove chip input
│           └── CollectionPicker.tsx          # multi-select collection dropdown
└── tests/
    ├── lib/
    │   ├── block-ids.test.ts
    │   └── export.test.ts
    └── api/
        ├── articles.test.ts
        └── highlights.test.ts
```

---

### Task 1: Project scaffold + environment setup

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`
- Create: `.env.local.example`
- Create: `jest.config.ts`, `jest.setup.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`

**Interfaces:**
- Produces: working `npm run dev`, `npm run build`, `npm test`

- [ ] **Step 1: Bootstrap Next.js into the current directory**

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --yes
```

Expected: Next.js scaffold created. `npm run dev` starts on port 3000.

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install mongodb @aws-sdk/client-s3 @mozilla/readability jsdom zod pdfjs-dist@3.11.174
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install --save-dev jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom mongodb-memory-server @types/jsdom
```

- [ ] **Step 4: Write `jest.config.ts`**

```typescript
// jest.config.ts
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  setupFilesAfterFramework: ["./jest.setup.ts"],
};

export default config;
```

- [ ] **Step 5: Write `jest.setup.ts`**

```typescript
// jest.setup.ts
// empty for now — extend as needed
```

- [ ] **Step 6: Write `.env.local.example`**

```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=marginal
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=marginal-pdfs
R2_PUBLIC_URL=https://pub-<hash>.r2.dev
```

Copy to `.env.local` and fill in real values before running the app.

- [ ] **Step 7: Simplify `src/app/layout.tsx`**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Marginal" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Write `src/app/page.tsx` (redirect to /library)**

```tsx
// src/app/page.tsx
import { redirect } from "next/navigation";
export default function Home() {
  redirect("/library");
}
```

- [ ] **Step 9: Verify dev server starts**

```bash
npm run dev
```

Expected: server starts on http://localhost:3000, redirects to /library (404 for now — that's fine).

- [ ] **Step 10: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Next.js project with deps and jest config"
```

---

### Task 2: MongoDB connection + TypeScript types

**Files:**
- Create: `src/lib/mongodb.ts`
- Create: `src/lib/types.ts`

**Interfaces:**
- Produces: `getDb()` → `Db`, `Article`, `Highlight`, `Collection` interfaces used by all tasks

- [ ] **Step 1: Write `src/lib/types.ts`**

```typescript
// src/lib/types.ts
import { ObjectId } from "mongodb";

export interface Article {
  _id: ObjectId;
  type: "article" | "pdf";
  title: string;
  sourceUrl: string;
  status: "unread" | "archived";
  tags: string[];
  collectionIds: ObjectId[];
  savedAt: Date;
  updatedAt: Date;
  // article-only
  content: string | null;
  images: Array<{ originalUrl: string; cachedUrl: string | null }> | null;
  // pdf-only
  fileUrl: string | null;
  pageCount: number | null;
  searchableText: string | null;
}

export interface Highlight {
  _id: ObjectId;
  articleId: ObjectId;
  color: "yellow" | "green" | "blue" | "pink";
  text: string;
  note: string | null;
  createdAt: Date;
  anchor: {
    blockId: string | null;
    startOffset: number | null;
    endOffset: number | null;
    page: number | null;
    rects: Array<{ x: number; y: number; width: number; height: number }> | null;
  };
}

export interface Collection {
  _id: ObjectId;
  name: string;
  createdAt: Date;
}
```

- [ ] **Step 2: Write `src/lib/mongodb.ts`**

```typescript
// src/lib/mongodb.ts
import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB ?? "marginal";

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  const g = global as typeof globalThis & { _mongo?: Promise<MongoClient> };
  if (!g._mongo) g._mongo = new MongoClient(uri).connect();
  clientPromise = g._mongo;
} else {
  clientPromise = new MongoClient(uri).connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}
```

- [ ] **Step 3: Write `tests/lib/mongodb-types.test.ts`** (compile-only — catches type regressions)

```typescript
// tests/lib/mongodb-types.test.ts
import type { Article, Highlight, Collection } from "@/lib/types";
import { ObjectId } from "mongodb";

test("Article shape compiles", () => {
  const a: Article = {
    _id: new ObjectId(),
    type: "article",
    title: "Test",
    sourceUrl: "https://example.com",
    status: "unread",
    tags: [],
    collectionIds: [],
    savedAt: new Date(),
    updatedAt: new Date(),
    content: "<p>hello</p>",
    images: [],
    fileUrl: null,
    pageCount: null,
    searchableText: null,
  };
  expect(a.type).toBe("article");
});

test("Highlight shape compiles", () => {
  const h: Highlight = {
    _id: new ObjectId(),
    articleId: new ObjectId(),
    color: "yellow",
    text: "selected text",
    note: null,
    createdAt: new Date(),
    anchor: { blockId: "b0", startOffset: 0, endOffset: 5, page: null, rects: null },
  };
  expect(h.color).toBe("yellow");
});
```

- [ ] **Step 4: Run test**

```bash
npx jest tests/lib/mongodb-types.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mongodb.ts src/lib/types.ts tests/lib/mongodb-types.test.ts
git commit -m "feat: add MongoDB connection singleton and TypeScript types"
```

---

### Task 3: Article extraction + save API

**Files:**
- Create: `src/lib/readability.ts`
- Create: `src/lib/block-ids.ts`
- Create: `src/app/api/articles/route.ts`
- Create: `src/app/api/articles/[id]/route.ts`
- Create: `tests/lib/block-ids.test.ts`

**Interfaces:**
- Produces:
  - `extractArticle(url: string): Promise<{ title: string; content: string; images: Array<{originalUrl:string;cachedUrl:null}> }>`
  - `assignBlockIds(html: string): string`
  - `POST /api/articles` body `{ url: string }` → `Article` JSON
  - `GET /api/articles` → `Article[]` JSON
  - `PATCH /api/articles/[id]` body `{ status?, tags?, collectionIds? }` → updated `Article`

- [ ] **Step 1: Write `src/lib/readability.ts`**

```typescript
// src/lib/readability.ts
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export interface ExtractedArticle {
  title: string;
  content: string;
  images: Array<{ originalUrl: string; cachedUrl: null }>;
}

export async function extractArticle(url: string): Promise<ExtractedArticle> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Marginal/1.0)" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  if (!article) throw new Error("Readability could not parse article");
  const images = extractImages(article.content, url);
  return { title: article.title, content: article.content, images };
}

function extractImages(
  html: string,
  baseUrl: string
): Array<{ originalUrl: string; cachedUrl: null }> {
  const dom = new JSDOM(html, { url: baseUrl });
  return Array.from(dom.window.document.querySelectorAll("img"))
    .map((img) => img.src)
    .filter(Boolean)
    .map((src) => ({ originalUrl: src, cachedUrl: null }));
}
```

- [ ] **Step 2: Write `src/lib/block-ids.ts`**

```typescript
// src/lib/block-ids.ts
import { JSDOM } from "jsdom";

const BLOCK_SELECTOR = "p,li,h1,h2,h3,h4,h5,h6,blockquote,pre";

export function assignBlockIds(html: string): string {
  const dom = new JSDOM(html);
  let i = 0;
  dom.window.document.querySelectorAll(BLOCK_SELECTOR).forEach((el) => {
    el.setAttribute("data-block-id", `b${i++}`);
  });
  return dom.window.document.body.innerHTML;
}
```

- [ ] **Step 3: Write failing test for `assignBlockIds`**

```typescript
// tests/lib/block-ids.test.ts
import { assignBlockIds } from "@/lib/block-ids";

test("assigns sequential data-block-id to block elements", () => {
  const html = "<p>First</p><p>Second</p><h2>Heading</h2>";
  const result = assignBlockIds(html);
  expect(result).toContain('data-block-id="b0"');
  expect(result).toContain('data-block-id="b1"');
  expect(result).toContain('data-block-id="b2"');
});

test("does not assign block-id to non-block elements", () => {
  const html = "<p>Text <strong>bold</strong></p>";
  const result = assignBlockIds(html);
  expect(result).not.toContain('data-block-id="b1"');
  expect(result).toContain('data-block-id="b0"');
});

test("returns empty string body for empty input", () => {
  expect(assignBlockIds("")).toBe("");
});
```

- [ ] **Step 4: Run test to verify it fails (block-ids not yet wired)**

```bash
npx jest tests/lib/block-ids.test.ts
```

Expected: PASS (implementation is already written above — run to confirm)

- [ ] **Step 5: Write `src/app/api/articles/route.ts`**

```typescript
// src/app/api/articles/route.ts
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
  if (collectionId) query.collectionIds = new ObjectId(collectionId);

  let cursor = db.collection("articles").find(query);

  if (search) {
    // use MongoDB text search; overrides status filter
    const textQuery: Record<string, unknown> = { $text: { $search: search } };
    if (tag) textQuery.tags = tag;
    cursor = db.collection("articles").find(textQuery);
  }

  const articles = await cursor.sort({ savedAt: -1 }).limit(100).toArray();
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
```

- [ ] **Step 6: Write `src/app/api/articles/[id]/route.ts`**

```typescript
// src/app/api/articles/[id]/route.ts
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
```

- [ ] **Step 7: Create MongoDB indexes (run once against Atlas)**

Add this script as `scripts/init-db.ts`:

```typescript
// scripts/init-db.ts
import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB ?? "marginal");
  await db.collection("articles").createIndex({ status: 1, savedAt: -1 });
  await db.collection("articles").createIndex({ tags: 1 });
  await db.collection("articles").createIndex(
    { title: "text", content: "text", searchableText: "text" },
    { name: "article_text_search" }
  );
  await db.collection("highlights").createIndex({ articleId: 1 });
  await db.collection("highlights").createIndex({ createdAt: -1 });
  console.log("Indexes created");
  await client.close();
}
main().catch(console.error);
```

Run with:
```bash
npx ts-node --project tsconfig.json scripts/init-db.ts
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/readability.ts src/lib/block-ids.ts src/app/api/articles/ scripts/init-db.ts tests/lib/block-ids.test.ts
git commit -m "feat: article extraction, block-id assignment, and articles API"
```

---

### Task 4: Library view — list, status toggle, save bar

**Files:**
- Create: `src/app/library/page.tsx`
- Create: `src/components/library/LibraryPage.tsx`
- Create: `src/components/library/ArticleCard.tsx`
- Create: `src/components/library/SaveBar.tsx`
- Create: `src/components/library/FilterControls.tsx`

**Interfaces:**
- Consumes: `GET /api/articles?status=`, `POST /api/articles`, `PATCH /api/articles/[id]`
- Produces: navigable library page at `/library`

- [ ] **Step 1: Write `src/app/library/page.tsx`**

```tsx
// src/app/library/page.tsx
import LibraryPage from "@/components/library/LibraryPage";

export default function Library() {
  return <LibraryPage />;
}
```

- [ ] **Step 2: Write `src/components/library/ArticleCard.tsx`**

```tsx
// src/components/library/ArticleCard.tsx
"use client";
import Link from "next/link";
import type { Article } from "@/lib/types";

interface Props {
  article: Article;
  onToggleStatus: (id: string, current: "unread" | "archived") => void;
}

export default function ArticleCard({ article, onToggleStatus }: Props) {
  const id = article._id.toString();
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex gap-4 items-start">
      <div className="flex-1 min-w-0">
        <Link href={`/reader/${id}`} className="font-semibold hover:underline line-clamp-2">
          {article.title}
        </Link>
        <p className="text-sm text-gray-500 truncate mt-0.5">{article.sourceUrl}</p>
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {article.tags.map((t) => (
              <span key={t} className="text-xs bg-gray-100 rounded px-2 py-0.5">{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className="text-xs text-gray-400">
          {new Date(article.savedAt).toLocaleDateString()}
        </span>
        <button
          onClick={() => onToggleStatus(id, article.status)}
          className="text-xs text-blue-600 hover:underline"
        >
          {article.status === "unread" ? "Archive" : "Unarchive"}
        </button>
        {article.type === "pdf" && (
          <span className="text-xs bg-orange-100 text-orange-700 rounded px-1.5 py-0.5">PDF</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/library/SaveBar.tsx`**

```tsx
// src/components/library/SaveBar.tsx
"use client";
import { useState, useRef } from "react";

interface Props {
  onSaved: () => void;
}

export default function SaveBar({ onSaved }: Props) {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUrlSave(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed");
      }
      setUrl("");
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload failed");
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="mb-6">
      <form onSubmit={handleUrlSave} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a URL to save…"
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={saving}
          className="border border-gray-300 px-4 py-2 rounded-md text-sm disabled:opacity-50"
        >
          Upload PDF
        </button>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
      </form>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Write `src/components/library/FilterControls.tsx`**

```tsx
// src/components/library/FilterControls.tsx
"use client";

interface Props {
  status: "unread" | "archived";
  onStatusChange: (s: "unread" | "archived") => void;
  search: string;
  onSearchChange: (s: string) => void;
  allTags: string[];
  selectedTag: string | null;
  onTagChange: (t: string | null) => void;
}

export default function FilterControls({
  status, onStatusChange, search, onSearchChange, allTags, selectedTag, onTagChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <div className="flex rounded-md border border-gray-300 overflow-hidden">
        {(["unread", "archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            className={`px-4 py-1.5 text-sm capitalize ${status === s ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search…"
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
      />
      {allTags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => onTagChange(null)}
            className={`text-xs px-2 py-1 rounded ${!selectedTag ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => onTagChange(t === selectedTag ? null : t)}
              className={`text-xs px-2 py-1 rounded ${selectedTag === t ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Write `src/components/library/LibraryPage.tsx`**

```tsx
// src/components/library/LibraryPage.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import type { Article } from "@/lib/types";
import ArticleCard from "./ArticleCard";
import SaveBar from "./SaveBar";
import FilterControls from "./FilterControls";

export default function LibraryPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [status, setStatus] = useState<"unread" | "archived">("unread");
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status });
    if (search) params.set("search", search);
    if (selectedTag) params.set("tag", selectedTag);
    const res = await fetch(`/api/articles?${params}`);
    const data = await res.json();
    setArticles(data);
    setLoading(false);
  }, [status, search, selectedTag]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  async function toggleStatus(id: string, current: "unread" | "archived") {
    const next = current === "unread" ? "archived" : "unread";
    await fetch(`/api/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    fetchArticles();
  }

  const allTags = Array.from(new Set(articles.flatMap((a) => a.tags)));

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Marginal</h1>
      <SaveBar onSaved={fetchArticles} />
      <FilterControls
        status={status}
        onStatusChange={(s) => { setStatus(s); setSelectedTag(null); }}
        search={search}
        onSearchChange={setSearch}
        allTags={allTags}
        selectedTag={selectedTag}
        onTagChange={setSelectedTag}
      />
      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : articles.length === 0 ? (
        <p className="text-gray-400 text-sm">No articles yet. Save a URL above.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {articles.map((a) => (
            <ArticleCard key={a._id.toString()} article={a} onToggleStatus={toggleStatus} />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 6: Update `src/app/layout.tsx` with nav**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "Marginal" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <nav className="border-b border-gray-200 bg-white px-4 py-2 flex gap-4 text-sm">
          <Link href="/library" className="font-semibold hover:text-blue-600">Library</Link>
          <Link href="/highlights" className="hover:text-blue-600">Highlights</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Start dev server and verify library page loads**

```bash
npm run dev
```

Open http://localhost:3000/library — should show the save bar and "No articles yet."

- [ ] **Step 8: Commit**

```bash
git add src/app/library src/components/library src/app/layout.tsx
git commit -m "feat: library view with save bar, status tabs, tag filter, and search"
```

---

### Task 5: Collections API + UI

**Files:**
- Create: `src/app/api/collections/route.ts`
- Create: `src/app/api/collections/[id]/route.ts`
- Create: `src/components/ui/CollectionPicker.tsx`
- Modify: `src/components/library/FilterControls.tsx` (add collection filter)
- Modify: `src/components/library/LibraryPage.tsx` (load + pass collections)

**Interfaces:**
- Produces:
  - `GET /api/collections` → `Collection[]`
  - `POST /api/collections` body `{ name }` → `Collection`
  - `PATCH /api/collections/[id]` body `{ name }` → `Collection`
  - `DELETE /api/collections/[id]` → 204
  - `CollectionPicker` component

- [ ] **Step 1: Write `src/app/api/collections/route.ts`**

```typescript
// src/app/api/collections/route.ts
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
```

- [ ] **Step 2: Write `src/app/api/collections/[id]/route.ts`**

```typescript
// src/app/api/collections/[id]/route.ts
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
    { $pull: { collectionIds: oid } }
  );
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 3: Write `src/components/ui/CollectionPicker.tsx`**

```tsx
// src/components/ui/CollectionPicker.tsx
"use client";
import { useState } from "react";
import type { Collection } from "@/lib/types";

interface Props {
  collections: Collection[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreateCollection: (name: string) => Promise<void>;
}

export default function CollectionPicker({ collections, selectedIds, onChange, onCreateCollection }: Props) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    await onCreateCollection(newName.trim());
    setNewName("");
    setCreating(false);
  }

  return (
    <div className="space-y-1">
      {collections.map((c) => (
        <label key={c._id.toString()} className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={selectedIds.includes(c._id.toString())}
            onChange={() => toggle(c._id.toString())}
          />
          {c.name}
        </label>
      ))}
      <form onSubmit={handleCreate} className="flex gap-1 mt-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New collection…"
          className="border border-gray-200 rounded px-2 py-0.5 text-xs flex-1"
        />
        <button type="submit" disabled={creating} className="text-xs text-blue-600 disabled:opacity-50">
          Add
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Add collection filter to `FilterControls.tsx`**

Add `collections`, `selectedCollectionId`, `onCollectionChange` props and render a `<select>`:

```tsx
// Add to FilterControls Props interface:
collections?: Collection[];
selectedCollectionId?: string | null;
onCollectionChange?: (id: string | null) => void;
```

Add inside the return:
```tsx
{collections && collections.length > 0 && (
  <select
    value={selectedCollectionId ?? ""}
    onChange={(e) => onCollectionChange?.(e.target.value || null)}
    className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
  >
    <option value="">All collections</option>
    {collections.map((c) => (
      <option key={c._id.toString()} value={c._id.toString()}>{c.name}</option>
    ))}
  </select>
)}
```

Also add `import type { Collection } from "@/lib/types";` at the top.

- [ ] **Step 5: Update `LibraryPage.tsx` to load + pass collections**

Add state + fetch:
```tsx
const [collections, setCollections] = useState<Collection[]>([]);
const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

// Inside fetchArticles, also pass collectionId:
if (selectedCollectionId) params.set("collectionId", selectedCollectionId);

// Add fetchCollections:
const fetchCollections = useCallback(async () => {
  const res = await fetch("/api/collections");
  setCollections(await res.json());
}, []);

async function createCollection(name: string) {
  await fetch("/api/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  fetchCollections();
}

useEffect(() => { fetchCollections(); }, [fetchCollections]);
```

Pass to FilterControls:
```tsx
collections={collections}
selectedCollectionId={selectedCollectionId}
onCollectionChange={setSelectedCollectionId}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/collections src/components/ui/CollectionPicker.tsx src/components/library/
git commit -m "feat: collections API and collection filter in library view"
```

---

### Task 6: Tags UI in reader + TagInput component

**Files:**
- Create: `src/components/ui/TagInput.tsx`

**Interfaces:**
- Produces: `TagInput` component used in reader view (Task 7)
- Consumes: `PATCH /api/articles/[id]` with `{ tags: string[] }`

- [ ] **Step 1: Write `src/components/ui/TagInput.tsx`**

```tsx
// src/components/ui/TagInput.tsx
"use client";
import { useState, KeyboardEvent } from "react";

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagInput({ tags, onChange }: Props) {
  const [input, setInput] = useState("");

  function addTag() {
    const t = input.trim().toLowerCase();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    if (e.key === "Backspace" && !input && tags.length) removeTag(tags[tags.length - 1]);
  }

  return (
    <div className="flex flex-wrap gap-1 border border-gray-200 rounded-md px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500">
      {tags.map((t) => (
        <span key={t} className="bg-gray-100 text-xs rounded px-2 py-0.5 flex items-center gap-1">
          {t}
          <button onClick={() => removeTag(t)} className="text-gray-400 hover:text-gray-700">×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? "Add tags…" : ""}
        className="outline-none text-xs flex-1 min-w-16 bg-transparent"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/TagInput.tsx
git commit -m "feat: TagInput component with chip display and keyboard nav"
```

---

### Task 7: Article reader view + highlight rendering

**Files:**
- Create: `src/app/reader/[id]/page.tsx`
- Create: `src/components/reader/ArticleReader.tsx`
- Create: `src/components/reader/HighlightLayer.tsx`

**Interfaces:**
- Consumes: `GET /api/articles/[id]`, `GET /api/highlights?articleId=`, `PATCH /api/articles/[id]`
- Produces: reader page at `/reader/[id]`, `HighlightLayer` that accepts `highlights: Highlight[]` and `content: string`

- [ ] **Step 1: Write `src/app/reader/[id]/page.tsx`**

```tsx
// src/app/reader/[id]/page.tsx
import { notFound } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { Article, Highlight } from "@/lib/types";
import ArticleReader from "@/components/reader/ArticleReader";
import PdfReader from "@/components/reader/PdfReader";

export default async function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const db = await getDb();
  const article = await db.collection<Article>("articles").findOne({ _id: new ObjectId(id) });
  if (!article) notFound();

  const highlights = await db
    .collection<Highlight>("highlights")
    .find({ articleId: new ObjectId(id) })
    .toArray();

  const serialized = JSON.parse(JSON.stringify({ article, highlights }));

  if (article.type === "pdf") {
    return <PdfReader article={serialized.article} highlights={serialized.highlights} />;
  }
  return <ArticleReader article={serialized.article} highlights={serialized.highlights} />;
}
```

- [ ] **Step 2: Write `src/components/reader/HighlightLayer.tsx`**

```tsx
// src/components/reader/HighlightLayer.tsx
"use client";
import { useEffect, useRef } from "react";
import type { Highlight } from "@/lib/types";

const COLOR_CLASS: Record<string, string> = {
  yellow: "bg-yellow-200",
  green: "bg-green-200",
  blue: "bg-blue-200",
  pink: "bg-pink-200",
};

interface Props {
  content: string;
  highlights: Highlight[];
  onHighlightClick: (h: Highlight) => void;
}

function findNodeAtOffset(root: Element, target: number): { node: Text; offset: number } {
  let cur = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    const len = node.textContent?.length ?? 0;
    if (cur + len >= target) return { node, offset: target - cur };
    cur += len;
    node = walker.nextNode() as Text | null;
  }
  const last = walker.currentNode as Text;
  return { node: last, offset: last?.textContent?.length ?? 0 };
}

export default function HighlightLayer({ content, highlights, onHighlightClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    // Remove old marks
    container.querySelectorAll("mark[data-highlight-id]").forEach((m) => {
      const parent = m.parentNode!;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
    });
    // Normalize text nodes
    container.normalize();
    // Apply highlights
    for (const h of highlights) {
      if (!h.anchor.blockId || h.anchor.startOffset == null || h.anchor.endOffset == null) continue;
      const block = container.querySelector(`[data-block-id="${h.anchor.blockId}"]`);
      if (!block) continue;
      try {
        const { node: sn, offset: so } = findNodeAtOffset(block, h.anchor.startOffset);
        const { node: en, offset: eo } = findNodeAtOffset(block, h.anchor.endOffset);
        const range = document.createRange();
        range.setStart(sn, so);
        range.setEnd(en, eo);
        const mark = document.createElement("mark");
        mark.className = `${COLOR_CLASS[h.color] ?? "bg-yellow-200"} cursor-pointer rounded-sm`;
        mark.dataset.highlightId = h._id.toString();
        mark.addEventListener("click", () => onHighlightClick(h));
        range.surroundContents(mark);
      } catch {
        // ignore — anchor may be stale
      }
    }
  }, [highlights, content]);

  return (
    <div
      ref={ref}
      className="prose prose-lg max-w-none"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
```

- [ ] **Step 3: Write `src/components/reader/ArticleReader.tsx`**

```tsx
// src/components/reader/ArticleReader.tsx
"use client";
import { useState, useCallback } from "react";
import type { Article, Highlight } from "@/lib/types";
import HighlightLayer from "./HighlightLayer";
import ColorPicker from "./ColorPicker";
import NotePopover from "./NotePopover";
import FocusMode from "./FocusMode";
import TagInput from "@/components/ui/TagInput";

interface SelectionState {
  blockId: string;
  startOffset: number;
  endOffset: number;
  text: string;
  rect: DOMRect;
}

interface Props {
  article: Article;
  highlights: Highlight[];
}

export default function ArticleReader({ article, highlights: initial }: Props) {
  const [highlights, setHighlights] = useState<Highlight[]>(initial);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [tags, setTags] = useState<string[]>(article.tags);
  const [focusMode, setFocusMode] = useState(false);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const anchor = (range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : range.startContainer as Element)?.closest("[data-block-id]");
    if (!anchor) return;
    const blockId = anchor.getAttribute("data-block-id")!;

    function getOffset(root: Element, container: Node, nodeOffset: number): number {
      let cur = 0;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode() as Text | null;
      while (node) {
        if (node === container) return cur + nodeOffset;
        cur += node.textContent?.length ?? 0;
        node = walker.nextNode() as Text | null;
      }
      return cur;
    }

    const startOffset = getOffset(anchor, range.startContainer, range.startOffset);
    const endOffset = getOffset(anchor, range.endContainer, range.endOffset);
    const rect = range.getBoundingClientRect();
    setSelection({ blockId, startOffset, endOffset, text: sel.toString(), rect });
  }, []);

  async function saveHighlight(color: "yellow" | "green" | "blue" | "pink") {
    if (!selection) return;
    const res = await fetch("/api/highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        articleId: article._id.toString(),
        color,
        text: selection.text,
        anchor: {
          blockId: selection.blockId,
          startOffset: selection.startOffset,
          endOffset: selection.endOffset,
          page: null,
          rects: null,
        },
      }),
    });
    const h = await res.json();
    setHighlights((prev) => [...prev, h]);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  async function saveNote(id: string, note: string | null) {
    const res = await fetch(`/api/highlights/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    const updated = await res.json();
    setHighlights((prev) => prev.map((h) => (h._id.toString() === id ? updated : h)));
    setActiveHighlight(null);
  }

  async function deleteHighlight(id: string) {
    await fetch(`/api/highlights/${id}`, { method: "DELETE" });
    setHighlights((prev) => prev.filter((h) => h._id.toString() !== id));
    setActiveHighlight(null);
  }

  async function saveTags(newTags: string[]) {
    setTags(newTags);
    await fetch(`/api/articles/${article._id.toString()}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
  }

  return (
    <FocusMode active={focusMode} onToggle={() => setFocusMode((v) => !v)}>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
          <a href={article.sourceUrl} className="text-sm text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
            {article.sourceUrl}
          </a>
          <div className="mt-3">
            <TagInput tags={tags} onChange={saveTags} />
          </div>
        </div>

        <div onMouseUp={handleMouseUp} className="relative">
          <HighlightLayer
            content={article.content ?? ""}
            highlights={highlights}
            onHighlightClick={setActiveHighlight}
          />
        </div>

        {selection && (
          <ColorPicker
            rect={selection.rect}
            onSelect={saveHighlight}
            onDismiss={() => setSelection(null)}
          />
        )}

        {activeHighlight && (
          <NotePopover
            highlight={activeHighlight}
            onSave={(note) => saveNote(activeHighlight._id.toString(), note)}
            onDelete={() => deleteHighlight(activeHighlight._id.toString())}
            onClose={() => setActiveHighlight(null)}
          />
        )}
      </main>
    </FocusMode>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/reader src/components/reader/ArticleReader.tsx src/components/reader/HighlightLayer.tsx
git commit -m "feat: article reader view with highlight layer rendering"
```

---

### Task 8: Highlights API + ColorPicker + NotePopover

**Files:**
- Create: `src/app/api/highlights/route.ts`
- Create: `src/app/api/highlights/[id]/route.ts`
- Create: `src/components/reader/ColorPicker.tsx`
- Create: `src/components/reader/NotePopover.tsx`
- Create: `src/components/reader/FocusMode.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces:
  - `POST /api/highlights` body `{ articleId, color, text, anchor }` → `Highlight`
  - `PATCH /api/highlights/[id]` body `{ note }` → `Highlight`
  - `DELETE /api/highlights/[id]` → 204
  - `ColorPicker`, `NotePopover`, `FocusMode` components

- [ ] **Step 1: Write `src/app/api/highlights/route.ts`**

```typescript
// src/app/api/highlights/route.ts
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
    // join: find articles with tag, then get their highlights
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
    color: body.color,
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
```

- [ ] **Step 2: Write `src/app/api/highlights/[id]/route.ts`**

```typescript
// src/app/api/highlights/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const note = body.note === undefined ? undefined : (body.note === null ? null : String(body.note));
  if (note === undefined) return NextResponse.json({ error: "note required" }, { status: 400 });

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
```

- [ ] **Step 3: Write `src/components/reader/ColorPicker.tsx`**

```tsx
// src/components/reader/ColorPicker.tsx
"use client";
import { useEffect, useRef } from "react";

const COLORS = [
  { id: "yellow" as const, label: "Yellow", class: "bg-yellow-300" },
  { id: "green" as const, label: "Green", class: "bg-green-300" },
  { id: "blue" as const, label: "Blue", class: "bg-blue-300" },
  { id: "pink" as const, label: "Pink", class: "bg-pink-300" },
];

interface Props {
  rect: DOMRect;
  onSelect: (color: "yellow" | "green" | "blue" | "pink") => void;
  onDismiss: () => void;
}

export default function ColorPicker({ rect, onSelect, onDismiss }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onDismiss]);

  const top = rect.top + window.scrollY - 44;
  const left = rect.left + rect.width / 2 - 72;

  return (
    <div
      ref={ref}
      style={{ position: "absolute", top, left }}
      className="z-50 flex gap-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2"
    >
      {COLORS.map((c) => (
        <button
          key={c.id}
          title={c.label}
          onClick={() => onSelect(c.id)}
          className={`w-7 h-7 rounded-full ${c.class} hover:scale-110 transition-transform border border-white shadow`}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Write `src/components/reader/NotePopover.tsx`**

```tsx
// src/components/reader/NotePopover.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import type { Highlight } from "@/lib/types";

interface Props {
  highlight: Highlight;
  onSave: (note: string | null) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function NotePopover({ highlight, onSave, onDelete, onClose }: Props) {
  const [note, setNote] = useState(highlight.note ?? "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div ref={ref} className="bg-white rounded-xl shadow-xl p-5 w-80" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-gray-700 mb-3 line-clamp-2 italic">"{highlight.text}"</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          autoFocus
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onSave(note.trim() || null)}
            className="flex-1 bg-blue-600 text-white text-sm py-1.5 rounded-md hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={onDelete}
            className="text-sm text-red-600 px-3 py-1.5 hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write `src/components/reader/FocusMode.tsx`**

```tsx
// src/components/reader/FocusMode.tsx
"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface Props {
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export default function FocusMode({ active, onToggle, children }: Props) {
  const [locked, setLocked] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const enterFullscreen = useCallback(() => {
    containerRef.current?.requestFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    if (active) {
      setLocked(true);
      enterFullscreen();
    } else {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
  }, [active, enterFullscreen]);

  useEffect(() => {
    function handleChange() {
      if (active && locked && !document.fullscreenElement) {
        // User pressed Escape — re-request fullscreen if still locked
        enterFullscreen();
      } else if (!document.fullscreenElement && active) {
        // Unlocked exit is fine
      }
    }
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, [active, locked, enterFullscreen]);

  if (!active) {
    return (
      <>
        <button
          onClick={onToggle}
          className="fixed bottom-4 right-4 z-40 bg-white border border-gray-300 rounded-full px-3 py-1.5 text-xs shadow hover:shadow-md"
          title="Enter focus mode"
        >
          Focus
        </button>
        {children}
      </>
    );
  }

  return (
    <div ref={containerRef} className="bg-gray-50 min-h-screen overflow-y-auto">
      <div className="fixed top-3 right-3 z-50 flex gap-2">
        <button
          onClick={() => setLocked((l) => !l)}
          className="bg-white border border-gray-300 rounded-full px-3 py-1.5 text-xs shadow"
          title={locked ? "Focus lock is ON — click to unlock" : "Click to lock focus"}
        >
          {locked ? "🔒 Locked" : "🔓 Unlocked"}
        </button>
        {!locked && (
          <button
            onClick={onToggle}
            className="bg-white border border-gray-300 rounded-full px-3 py-1.5 text-xs shadow"
          >
            Exit
          </button>
        )}
      </div>
      {/* soft-lock notice shown once */}
      {locked && (
        <p className="text-center text-xs text-gray-400 pt-2">
          Focus locked — click 🔒 to unlock. You can always close the browser tab.
        </p>
      )}
      {children}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/highlights src/components/reader/ColorPicker.tsx src/components/reader/NotePopover.tsx src/components/reader/FocusMode.tsx
git commit -m "feat: highlights API, color picker, note popover, and focus mode"
```

---

### Task 9: PDF upload → R2 + store article

**Files:**
- Create: `src/lib/r2.ts`
- Create: `src/lib/pdf.ts`
- Create: `src/app/api/upload/route.ts`

**Interfaces:**
- Produces:
  - `uploadPdf(key, buffer) → string` (public URL)
  - `extractPdfText(buffer) → { pageCount: number; text: string }`
  - `POST /api/upload` FormData `file` → `Article` JSON

- [ ] **Step 1: Write `src/lib/r2.ts`**

```typescript
// src/lib/r2.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadPdf(key: string, buffer: Buffer): Promise<string> {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: "application/pdf",
  }));
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
```

- [ ] **Step 2: Write `src/lib/pdf.ts`**

```typescript
// src/lib/pdf.ts
// pdfjs-dist 3.x legacy build works in Node without a worker
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
pdfjsLib.GlobalWorkerOptions.workerSrc = "";

export async function extractPdfText(buffer: Buffer): Promise<{ pageCount: number; text: string }> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const pageCount: number = pdf.numPages;
  const pages: string[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item: { str?: string }) => item.str ?? "")
        .join(" ")
    );
  }
  return { pageCount, text: pages.join("\n\n") };
}
```

- [ ] **Step 3: Write `src/app/api/upload/route.ts`**

```typescript
// src/app/api/upload/route.ts
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
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
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
    // non-fatal — PDF still stored, just won't be searchable
  }

  const now = new Date();
  const doc = {
    type: "pdf" as const,
    title: file.name.replace(/\.pdf$/i, ""),
    sourceUrl: file.name,
    status: "unread" as const,
    tags: [],
    collectionIds: [],
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

export const config = { api: { bodyParser: false } };
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/r2.ts src/lib/pdf.ts src/app/api/upload
git commit -m "feat: PDF upload to R2 with text extraction for search"
```

---

### Task 10: PDF reader — canvas + text layer + highlight overlays

**Files:**
- Create: `src/components/reader/PdfReader.tsx`
- Create: `src/components/reader/PdfHighlightOverlay.tsx`

**Interfaces:**
- Consumes: `article.fileUrl`, `highlights[]` (pdf-type anchors), `POST /api/highlights`
- Produces: `PdfReader` — full-page PDF viewer with selection-based highlighting

- [ ] **Step 1: Write `src/components/reader/PdfHighlightOverlay.tsx`**

```tsx
// src/components/reader/PdfHighlightOverlay.tsx
"use client";
import type { Highlight } from "@/lib/types";

const COLOR_STYLE: Record<string, string> = {
  yellow: "rgba(253,224,71,0.4)",
  green: "rgba(134,239,172,0.4)",
  blue: "rgba(147,197,253,0.4)",
  pink: "rgba(249,168,212,0.4)",
};

interface Props {
  highlights: Highlight[];
  page: number;
  pageWidth: number;
  pageHeight: number;
  onHighlightClick: (h: Highlight) => void;
}

export default function PdfHighlightOverlay({ highlights, page, pageWidth, pageHeight, onHighlightClick }: Props) {
  const pageHighlights = highlights.filter((h) => h.anchor.page === page && h.anchor.rects);
  return (
    <>
      {pageHighlights.map((h) =>
        h.anchor.rects!.map((rect, i) => (
          <div
            key={`${h._id.toString()}-${i}`}
            onClick={() => onHighlightClick(h)}
            style={{
              position: "absolute",
              left: rect.x * pageWidth,
              top: rect.y * pageHeight,
              width: rect.width * pageWidth,
              height: rect.height * pageHeight,
              background: COLOR_STYLE[h.color] ?? "rgba(253,224,71,0.4)",
              cursor: "pointer",
              pointerEvents: "all",
            }}
          />
        ))
      )}
    </>
  );
}
```

- [ ] **Step 2: Write `src/components/reader/PdfReader.tsx`**

```tsx
// src/components/reader/PdfReader.tsx
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { Article, Highlight } from "@/lib/types";
import PdfHighlightOverlay from "./PdfHighlightOverlay";
import ColorPicker from "./ColorPicker";
import NotePopover from "./NotePopover";
import FocusMode from "./FocusMode";
import TagInput from "@/components/ui/TagInput";

interface SelectionState {
  page: number;
  text: string;
  rects: Array<{ x: number; y: number; width: number; height: number }>;
  screenRect: DOMRect;
}

interface Props {
  article: Article;
  highlights: Highlight[];
}

export default function PdfReader({ article, highlights: initial }: Props) {
  const [highlights, setHighlights] = useState<Highlight[]>(initial);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [tags, setTags] = useState<string[]>(article.tags);
  const [focusMode, setFocusMode] = useState(false);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pdfRef = useRef<{ numPages: number } | null>(null);
  const [numPages, setNumPages] = useState(article.pageCount ?? 0);
  const [pageDims, setPageDims] = useState<Map<number, { width: number; height: number }>>(new Map());

  useEffect(() => {
    if (!article.fileUrl) return;
    let cancelled = false;
    (async () => {
      // Dynamic import — pdfjs-dist is browser-only here
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      const pdf = await pdfjsLib.getDocument(article.fileUrl!).promise;
      if (cancelled) return;
      pdfRef.current = pdf;
      setNumPages(pdf.numPages);

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRefs.current.get(pageNum);
        const container = pageRefs.current.get(pageNum);
        if (!canvas || !container || cancelled) continue;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setPageDims((prev) => new Map(prev).set(pageNum, { width: viewport.width, height: viewport.height }));
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Text layer
        const textContent = await page.getTextContent();
        const textLayerDiv = container.querySelector(".textLayer") as HTMLDivElement;
        if (!textLayerDiv) continue;
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;
        // pdfjs text layer rendering via TextLayer API (v3)
        const { renderTextLayer } = pdfjsLib;
        if (renderTextLayer) {
          textLayerDiv.innerHTML = "";
          await renderTextLayer({
            textContentSource: page.streamTextContent(),
            container: textLayerDiv,
            viewport,
          }).promise;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [article.fileUrl]);

  const handlePageMouseUp = useCallback((pageNum: number) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const container = pageRefs.current.get(pageNum);
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const dims = pageDims.get(pageNum);
    if (!dims) return;

    const clientRects = Array.from(range.getClientRects()).map((r) => ({
      x: (r.left - containerRect.left) / dims.width,
      y: (r.top - containerRect.top) / dims.height,
      width: r.width / dims.width,
      height: r.height / dims.height,
    }));

    if (clientRects.length === 0) return;
    setSelection({
      page: pageNum,
      text: sel.toString(),
      rects: clientRects,
      screenRect: range.getBoundingClientRect(),
    });
  }, [pageDims]);

  async function saveHighlight(color: "yellow" | "green" | "blue" | "pink") {
    if (!selection) return;
    const res = await fetch("/api/highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        articleId: article._id.toString(),
        color,
        text: selection.text,
        anchor: {
          blockId: null,
          startOffset: null,
          endOffset: null,
          page: selection.page,
          rects: selection.rects,
        },
      }),
    });
    const h = await res.json();
    setHighlights((prev) => [...prev, h]);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  async function saveNote(id: string, note: string | null) {
    const res = await fetch(`/api/highlights/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    const updated = await res.json();
    setHighlights((prev) => prev.map((h) => (h._id.toString() === id ? updated : h)));
    setActiveHighlight(null);
  }

  async function deleteHighlight(id: string) {
    await fetch(`/api/highlights/${id}`, { method: "DELETE" });
    setHighlights((prev) => prev.filter((h) => h._id.toString() !== id));
    setActiveHighlight(null);
  }

  async function saveTags(newTags: string[]) {
    setTags(newTags);
    await fetch(`/api/articles/${article._id.toString()}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
  }

  return (
    <FocusMode active={focusMode} onToggle={() => setFocusMode((v) => !v)}>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{article.title}</h1>
          <p className="text-sm text-gray-500">{article.sourceUrl} · {numPages} pages</p>
          <div className="mt-2">
            <TagInput tags={tags} onChange={saveTags} />
          </div>
        </div>
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
          const dims = pageDims.get(pageNum);
          return (
            <div
              key={pageNum}
              className="relative mb-6 shadow-md"
              style={{ width: dims?.width ?? "auto", display: "inline-block" }}
              onMouseUp={() => handlePageMouseUp(pageNum)}
            >
              <canvas ref={(el) => { if (el) canvasRefs.current.set(pageNum, el); }} />
              <div
                className="textLayer"
                ref={(el) => {
                  if (el) {
                    const wrapper = el.parentElement!;
                    pageRefs.current.set(pageNum, wrapper as HTMLDivElement);
                  }
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  userSelect: "text",
                  pointerEvents: "all",
                }}
              />
              {dims && (
                <PdfHighlightOverlay
                  highlights={highlights}
                  page={pageNum}
                  pageWidth={dims.width}
                  pageHeight={dims.height}
                  onHighlightClick={setActiveHighlight}
                />
              )}
            </div>
          );
        })}
        {selection && (
          <ColorPicker
            rect={selection.screenRect}
            onSelect={saveHighlight}
            onDismiss={() => setSelection(null)}
          />
        )}
        {activeHighlight && (
          <NotePopover
            highlight={activeHighlight}
            onSave={(note) => saveNote(activeHighlight._id.toString(), note)}
            onDelete={() => deleteHighlight(activeHighlight._id.toString())}
            onClose={() => setActiveHighlight(null)}
          />
        )}
      </main>
    </FocusMode>
  );
}
```

- [ ] **Step 3: Add PDF.js text layer CSS to `src/app/globals.css`**

```css
/* PDF.js text layer — appended to globals.css */
.textLayer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  line-height: 1;
}
.textLayer span {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
}
.textLayer ::selection {
  background: rgba(0,0,255,0.3);
  color: transparent;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/reader/PdfReader.tsx src/components/reader/PdfHighlightOverlay.tsx src/app/globals.css
git commit -m "feat: PDF reader with canvas rendering, text selection, and highlight overlays"
```

---

### Task 11: App-level Highlights view

**Files:**
- Create: `src/app/highlights/page.tsx`
- Create: `src/components/highlights/HighlightsPage.tsx`
- Create: `src/components/highlights/HighlightRow.tsx`

**Interfaces:**
- Consumes: `GET /api/highlights?tag=&articleId=`, `GET /api/articles` (for article list in filter)
- Produces: highlights page at `/highlights`

- [ ] **Step 1: Write `src/app/highlights/page.tsx`**

```tsx
// src/app/highlights/page.tsx
import HighlightsPage from "@/components/highlights/HighlightsPage";

export default function Highlights() {
  return <HighlightsPage />;
}
```

- [ ] **Step 2: Write `src/components/highlights/HighlightRow.tsx`**

```tsx
// src/components/highlights/HighlightRow.tsx
"use client";
import Link from "next/link";
import type { Highlight } from "@/lib/types";

const COLOR_STYLE: Record<string, string> = {
  yellow: "border-yellow-400 bg-yellow-50",
  green: "border-green-400 bg-green-50",
  blue: "border-blue-400 bg-blue-50",
  pink: "border-pink-400 bg-pink-50",
};

interface Props {
  highlight: Highlight & { articleTitle: string };
}

export default function HighlightRow({ highlight }: Props) {
  return (
    <div className={`border-l-4 pl-4 py-2 rounded-r-md ${COLOR_STYLE[highlight.color] ?? "border-gray-300"}`}>
      <p className="text-sm text-gray-800">{highlight.text}</p>
      {highlight.note && (
        <p className="text-xs text-gray-500 italic mt-1">Note: {highlight.note}</p>
      )}
      <div className="flex gap-2 mt-1 items-center">
        <Link
          href={`/reader/${highlight.articleId.toString()}`}
          className="text-xs text-blue-600 hover:underline"
        >
          {highlight.articleTitle}
        </Link>
        <span className="text-xs text-gray-400">
          {new Date(highlight.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/highlights/HighlightsPage.tsx`**

```tsx
// src/components/highlights/HighlightsPage.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import type { Highlight, Article } from "@/lib/types";
import HighlightRow from "./HighlightRow";
import ExportButton from "./ExportButton";

type EnrichedHighlight = Highlight & { articleTitle: string };

export default function HighlightsPage() {
  const [highlights, setHighlights] = useState<EnrichedHighlight[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const [unread, archived] = await Promise.all([
        fetch("/api/articles?status=unread").then((r) => r.json()),
        fetch("/api/articles?status=archived").then((r) => r.json()),
      ]);
      const all: Article[] = [...unread, ...archived];
      setArticles(all);
      setAllTags(Array.from(new Set(all.flatMap((a: Article) => a.tags))));
    })();
  }, []);

  const fetchHighlights = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedTag) params.set("tag", selectedTag);
    if (selectedArticleId) params.set("articleId", selectedArticleId);
    const raw: Highlight[] = await fetch(`/api/highlights?${params}`).then((r) => r.json());
    const articleMap = new Map(articles.map((a) => [a._id.toString(), a.title]));
    const enriched = raw.map((h) => ({
      ...h,
      articleTitle: articleMap.get(h.articleId.toString()) ?? "Unknown",
    }));
    setHighlights(enriched);
    setLoading(false);
  }, [selectedTag, selectedArticleId, articles]);

  useEffect(() => {
    if (articles.length >= 0) fetchHighlights();
  }, [fetchHighlights, articles]);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Highlights</h1>
        <ExportButton highlights={highlights} articles={articles} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <select
          value={selectedArticleId ?? ""}
          onChange={(e) => setSelectedArticleId(e.target.value || null)}
          className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
        >
          <option value="">All articles</option>
          {articles.map((a) => (
            <option key={a._id.toString()} value={a._id.toString()}>{a.title}</option>
          ))}
        </select>

        {allTags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setSelectedTag(null)}
              className={`text-xs px-2 py-1 rounded ${!selectedTag ? "bg-blue-600 text-white" : "bg-gray-100"}`}
            >
              All tags
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTag(t === selectedTag ? null : t)}
                className={`text-xs px-2 py-1 rounded ${selectedTag === t ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : highlights.length === 0 ? (
        <p className="text-gray-400 text-sm">No highlights yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {highlights.map((h) => (
            <HighlightRow key={h._id.toString()} highlight={h} />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/highlights src/components/highlights/HighlightsPage.tsx src/components/highlights/HighlightRow.tsx
git commit -m "feat: app-level highlights view with tag and article filters"
```

---

### Task 12: Export to Markdown

**Files:**
- Create: `src/lib/export.ts`
- Create: `src/components/highlights/ExportButton.tsx`
- Create: `tests/lib/export.test.ts`

**Interfaces:**
- Consumes: `highlights[]` + `articles[]` already in HighlightsPage state
- Produces: `.md` file download triggered from ExportButton

- [ ] **Step 1: Write failing test for `generateMarkdown`**

```typescript
// tests/lib/export.test.ts
import { generateMarkdown } from "@/lib/export";
import { ObjectId } from "mongodb";
import type { Highlight, Article } from "@/lib/types";

const aid = new ObjectId();
const makeArticle = (overrides: Partial<Article> = {}): Article => ({
  _id: aid,
  type: "article",
  title: "Test Article",
  sourceUrl: "https://example.com",
  status: "unread",
  tags: ["tech"],
  collectionIds: [],
  savedAt: new Date("2026-01-15"),
  updatedAt: new Date("2026-01-15"),
  content: null,
  images: null,
  fileUrl: null,
  pageCount: null,
  searchableText: null,
  ...overrides,
});

const makeHighlight = (overrides: Partial<Highlight> = {}): Highlight => ({
  _id: new ObjectId(),
  articleId: aid,
  color: "yellow",
  text: "highlighted passage",
  note: null,
  createdAt: new Date("2026-01-16"),
  anchor: { blockId: "b0", startOffset: 0, endOffset: 5, page: null, rects: null },
  ...overrides,
});

test("includes header with count and date", () => {
  const result = generateMarkdown([makeHighlight()], [makeArticle()]);
  expect(result).toMatch(/# Exported Highlights/);
  expect(result).toMatch(/1 highlights · 1 sources/);
});

test("renders yellow emoji for yellow highlight", () => {
  const result = generateMarkdown([makeHighlight({ color: "yellow" })], [makeArticle()]);
  expect(result).toContain("🟡 highlighted passage");
});

test("renders note when present", () => {
  const result = generateMarkdown([makeHighlight({ note: "my note" })], [makeArticle()]);
  expect(result).toContain("— *Note: my note*");
});

test("omits note line when note is null", () => {
  const result = generateMarkdown([makeHighlight({ note: null })], [makeArticle()]);
  expect(result).not.toContain("Note:");
});

test("groups highlights under article title", () => {
  const result = generateMarkdown([makeHighlight()], [makeArticle()]);
  expect(result).toContain("## Test Article");
  expect(result).toContain("**Source:** https://example.com");
});

test("adds (PDF) suffix for pdf type", () => {
  const result = generateMarkdown(
    [makeHighlight({ anchor: { blockId: null, startOffset: null, endOffset: null, page: 3, rects: [] } })],
    [makeArticle({ type: "pdf" })]
  );
  expect(result).toContain("## Test Article (PDF)");
  expect(result).toContain("Page 3");
});

test("returns empty string for empty highlights", () => {
  expect(generateMarkdown([], [])).toBe("");
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/lib/export.test.ts
```

Expected: FAIL — `generateMarkdown` not found

- [ ] **Step 3: Write `src/lib/export.ts`**

```typescript
// src/lib/export.ts
import type { Highlight, Article } from "./types";

const EMOJI: Record<string, string> = {
  yellow: "🟡",
  green: "🟢",
  blue: "🔵",
  pink: "🩷",
};

export function generateMarkdown(highlights: Highlight[], articles: Article[]): string {
  if (highlights.length === 0) return "";

  const articleMap = new Map(articles.map((a) => [a._id.toString(), a]));

  // Group by article
  const grouped = new Map<string, Highlight[]>();
  for (const h of highlights) {
    const key = h.articleId.toString();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(h);
  }

  const date = new Date().toISOString().split("T")[0];
  const lines: string[] = [
    "# Exported Highlights",
    `Exported: ${date} · ${highlights.length} highlights · ${grouped.size} sources`,
    "",
  ];

  for (const [articleId, group] of grouped) {
    const article = articleMap.get(articleId);
    if (!article) continue;

    const isPdf = article.type === "pdf";
    lines.push(`## ${article.title}${isPdf ? " (PDF)" : ""}`);

    const firstPage = group.find((h) => h.anchor.page != null)?.anchor.page;
    const pageNote = isPdf && firstPage != null ? ` · Page ${firstPage}` : "";
    const savedDate = new Date(article.savedAt).toISOString().split("T")[0];
    lines.push(`**Source:** ${article.sourceUrl}${pageNote} · Saved: ${savedDate}`);
    lines.push("");

    for (const h of group) {
      const emoji = EMOJI[h.color] ?? "•";
      lines.push(`> ${emoji} ${h.text}`);
      if (h.note) lines.push(`— *Note: ${h.note}*`);
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/lib/export.test.ts
```

Expected: PASS

- [ ] **Step 5: Write `src/components/highlights/ExportButton.tsx`**

```tsx
// src/components/highlights/ExportButton.tsx
"use client";
import type { Highlight, Article } from "@/lib/types";
import { generateMarkdown } from "@/lib/export";

interface Props {
  highlights: Highlight[];
  articles: Article[];
}

export default function ExportButton({ highlights, articles }: Props) {
  function handleExport() {
    if (highlights.length === 0) return;
    const md = generateMarkdown(highlights, articles);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `highlights-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      disabled={highlights.length === 0}
      className="text-sm border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Export .md ({highlights.length})
    </button>
  );
}
```

- [ ] **Step 6: Run all tests**

```bash
npx jest
```

Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/export.ts src/components/highlights/ExportButton.tsx tests/lib/export.test.ts
git commit -m "feat: markdown export from filtered highlights view"
```

---

### Task 13: Production readiness + Vercel deploy

**Files:**
- Modify: `next.config.ts` (server external packages for pdfjs + jsdom)
- Modify: `package.json` (add `build` script type check)

**Interfaces:**
- Produces: deployable build; `npm run build` passes

- [ ] **Step 1: Update `next.config.ts`**

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist", "jsdom", "canvas"],
  experimental: {},
};

export default nextConfig;
```

- [ ] **Step 2: Add type-check script to `package.json`**

Find the `"scripts"` block and add:
```json
"type-check": "tsc --noEmit"
```

- [ ] **Step 3: Run type check and build**

```bash
npm run type-check
npm run build
```

Fix any TypeScript errors. Common ones:
- `params` in App Router must be `Promise<{id: string}>` — already handled above
- pdfjs-dist types may need `@types/pdfjs-dist` or a `declare module`

If pdfjs types error, add to `src/env.d.ts`:
```typescript
declare module "pdfjs-dist/legacy/build/pdf.js";
```

- [ ] **Step 4: Set environment variables on Vercel**

In Vercel dashboard → Settings → Environment Variables, add:
- `MONGODB_URI`
- `MONGODB_DB`
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL`

- [ ] **Step 5: Deploy**

```bash
npx vercel --prod
```

Or push to the connected GitHub repo.

- [ ] **Step 6: Final commit**

```bash
git add next.config.ts package.json src/env.d.ts
git commit -m "chore: configure server externals for pdfjs/jsdom and add type-check script"
```

---

## Self-Review: Spec Coverage Checklist

| Spec section | Covered by task |
|---|---|
| §3.1 articles collection + indexes | Task 3 (init-db script) |
| §3.2 highlights collection + indexes | Task 3 (init-db script), Task 8 |
| §3.3 collections | Task 5 |
| §4.1 URL save + Readability | Task 3 |
| §4.1 PDF save → R2 + pageCount | Task 9 |
| §4.2 Reading queue (unread/archived) | Task 4 |
| §4.3 Collections | Task 5 |
| §4.4 Free-text tags on articles | Task 6, Task 7 |
| §4.5 Full-text search | Task 3 (GET /api/articles?search=), Task 4 FilterControls |
| §5 Article reader + text highlighting | Tasks 7, 8 |
| §5 block-id anchoring | Task 3 (assignBlockIds), Task 7 (HighlightLayer) |
| §5 Notes on highlights | Task 8 (NotePopover) |
| §5 Tags editable from reader | Task 7 (ArticleReader TagInput) |
| §6 PDF reader (canvas + text layer) | Task 10 |
| §6 PDF highlighting (rects overlay) | Task 10, 11 |
| §7 Focus mode (fullscreen + lock) | Task 8 (FocusMode) |
| §8 App-level Highlights view | Task 11 |
| §8 Filter by tag (joins through articles) | Task 11 (GET /api/highlights?tag=) |
| §8 Filter by article | Task 11 |
| §9 Export to Markdown | Task 12 |
| §9 Grouped by article, blockquote format | Task 12 |
| §9 Color emoji mapping | Task 12 |
| §9 PDF page in source line | Task 12 |
| §10 No highlight-level tags | Respected throughout |
| §10 No eager image download | images[].cachedUrl=null, never populated |
| §10 No content editing | No PATCH for content field anywhere |
