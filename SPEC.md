# Marginal — Build Spec

**Project name: Marginal** (working title — short for "marginalia," notes in the
margin of a text, which is what the app's highlight/note system is). Use this as the
repo name, package name (`marginal`), and app display name unless told otherwise.

> Note: domain availability (marginal.com / marginal.app / etc.) has not been
> confirmed — check a registrar directly before relying on it for a live URL. An
> existing unrelated project ("Marginal Protocol," a DeFi product) holds some
> Marginal-branded web presence, which doesn't block use of the name for a personal
> tool but is worth knowing.

## 1. Summary

A personal, single-user web app for saving articles and PDFs, reading them in a clean
extracted view, highlighting passages in multiple colors, attaching notes to highlights,
organizing with tags/collections/status, and exporting filtered highlight sets to Markdown.
Includes a distraction-free "focus mode" that must be deliberately unlocked to exit.

This is a **personal tool**, not a multi-tenant SaaS product. Build for one user. No
auth system beyond a simple password gate is required unless specified below.

---

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | Single full-stack app — API routes + frontend together |
| Database | MongoDB Atlas (free M0 tier) | 512MB–5GB free forever, no card required. Sufficient for all text/metadata at personal-tool scale. |
| Binary/object storage | Cloudflare R2 | Free egress, ~$0.015/GB-month storage. Used for PDF files and (later, optional) cached article images. **Not MongoDB** — Mongo only stores text/metadata/references. |
| Article extraction | `@mozilla/readability` + `jsdom` | Same library underlying Firefox Reader Mode / Pocket-style extraction |
| PDF rendering/annotation | `pdfjs-dist` (PDF.js) | Render pages to canvas + text layer for selection |
| Styling | Tailwind CSS | Matches Next.js defaults, fast to build with |
| Deployment | Vercel (free tier) | Pairs naturally with Next.js |

**Do not introduce additional infrastructure** (Redis, separate search service, queues,
etc.) unless a specific feature below explicitly requires it. Keep the stack minimal.

---

## 3. Data Model (MongoDB Collections)

### 3.1 `articles`

```ts
{
  _id: ObjectId,
  type: "article" | "pdf",
  title: string,
  sourceUrl: string,            // original URL, or original filename for uploaded PDFs
  status: "unread" | "archived",
  tags: string[],
  collectionIds: ObjectId[],    // refs to `collections`, many-to-many
  savedAt: Date,
  updatedAt: Date,

  // present only when type === "article"
  content: string | null,       // cleaned/extracted HTML from Readability pass
  images: [{
    originalUrl: string,
    cachedUrl: string | null,   // null until lazily re-hosted to R2 (see §6)
  }] | null,

  // present only when type === "pdf"
  fileUrl: string | null,       // R2 object URL for the PDF binary
  pageCount: number | null,
}
```

Indexes:
- `{ status: 1, savedAt: -1 }` — for the reading queue view
- `{ tags: 1 }` — for tag filtering
- Text index on `{ title: "text", content: "text" }` — for full-text search (see §8)

### 3.2 `highlights`

```ts
{
  _id: ObjectId,
  articleId: ObjectId,          // ref to articles._id
  color: "yellow" | "green" | "blue" | "pink",
  text: string,                 // denormalized highlighted text (safe: articles are immutable after save, see §6)
  note: string | null,
  createdAt: Date,

  // anchor shape depends on parent article's `type`
  anchor: {
    // when parent type === "article"
    blockId: string | null,     // id of the containing block element, for stable anchoring
    startOffset: number | null,
    endOffset: number | null,

    // when parent type === "pdf"
    page: number | null,
    rects: [{ x: number, y: number, width: number, height: number }] | null,
  }
}
```

Indexes:
- `{ articleId: 1 }` — fetch all highlights for one article (reader view)
- `{ createdAt: -1 }` — for the standalone Highlights view

**Important:** Highlights do NOT have their own `tags` field. Tag-based filtering for
export (§9) joins through `articleId → articles.tags`. This is intentional — do not add
a tags field to highlights without explicit instruction.

### 3.3 `collections`

```ts
{
  _id: ObjectId,
  name: string,
  createdAt: Date,
}
```

---

## 4. App-Level Features (Library / Dashboard)

### 4.1 Save flow
- Input: paste a URL, or upload a PDF file.
- **URL save:** server fetches the page HTML, runs it through Readability to extract
  the article content, strips scripts/nav/ads, stores the cleaned HTML in
  `articles.content`. Image `src` URLs found in the extracted content are recorded in
  `articles.images[].originalUrl`; `cachedUrl` starts as `null` (see §6 for the
  lazy re-hosting plan — **do not build eager image downloading in v1**).
- **PDF save:** uploaded file is stored in R2, `fileUrl` set to the R2 object location,
  `pageCount` read from the PDF metadata via `pdfjs-dist`.
- On save, `status` defaults to `"unread"`.

### 4.2 Reading queue
- Default library view shows `status: "unread"` items, sorted by `savedAt` descending.
- Separate "Archived" tab shows `status: "archived"`.
- A button on each article/in the reader view toggles status between the two.

### 4.3 Collections
- User can create/rename/delete collections.
- Articles can belong to zero or more collections (`collectionIds`).
- Library view can be filtered to a single collection.

### 4.4 Tags
- Free-text tags on articles (`articles.tags`). No separate tags collection needed —
  store as plain strings on the article; derive the list of all-tags-in-use by
  distinct query when rendering a tag filter/autocomplete.
- Library view filterable by one or more tags.

### 4.5 Full-text search
- Search box queries across `title` and `content` (articles) via the MongoDB text
  index from §3.1. For PDFs, search against extracted text (see §7 — PDF text layer
  already gives you this per page; concatenate per-document and store as a derived
  field, e.g. `articles.searchableText`, populated at save time for PDFs).
- v1 scope: title + body text search only. Do not build search-within-notes or
  search-within-highlights unless asked.

---

## 5. Reader View — Articles

- Renders `articles.content` (the cleaned HTML) in a clean typographic layout.
- **Highlighting:** user selects text → a color picker (4 colors: yellow/green/blue/pink)
  appears → on selection, create a `highlights` document with `anchor.blockId` +
  `startOffset`/`endOffset` relative to that block.
  - Anchoring approach: wrap each top-level rendered element (p, li, h1-h6, blockquote,
    etc.) with a stable `data-block-id` attribute assigned at save/render time (e.g.
    sequential `b0`, `b1`, ...). Offsets are character offsets within that block's
    text content. This keeps offsets small and avoids whole-document offset drift if
    content above changes (it won't, since articles are immutable — see §6 — but keep
    the design robust regardless).
  - On render, fetch all `highlights` for the article, and for each, wrap the matched
    text range in a `<mark>` styled with the highlight's color.
- **Notes:** clicking an existing highlight opens a small popover to add/edit/delete
  its `note`. An icon indicator shows on highlights that have a note attached.
- **Tags:** editable from the reader view header (adds/removes from `articles.tags`).

## 6. Reader View — PDFs

- Render via `pdfjs-dist`: each page drawn to a `<canvas>`, with PDF.js's text layer
  positioned invisibly on top (standard PDF.js viewer pattern) to enable native text
  selection.
- **Highlighting:** on text selection within a page, PDF.js gives you the selected
  text's bounding client rects. Convert these to page-relative coordinates and store
  as `anchor.page` + `anchor.rects` on the highlight (same 4-color picker as articles).
- On render, for each highlight belonging to the current PDF, draw a semi-transparent
  colored `<div>` overlay positioned at its stored rects, on top of the corresponding
  page's canvas.
- Notes and tags work identically to the article reader (shared `note` field/UI,
  shared `tags` UI at the article level).
- Reference implementation pattern: this mirrors what `react-pdf-highlighter` does
  internally — selection → rects → stored anchor → re-rendered overlay on load. You
  do not need to use that exact library, but the anchor data shape in §3.2 is designed
  to match this established pattern; do not invent a different PDF anchor shape.

**Note on content immutability:** Once saved, an article's `content` (and a PDF's
underlying file) is never edited by the user — only annotated. This is what makes
denormalizing `highlights.text` safe (§3.2) and keeps highlight anchors stable forever.
Do not build an "edit saved article content" feature; it is out of scope and would
break this invariant.

## 7. Focus Mode

- Toggled from the reader view (article or PDF). On activation:
  - Hides all app chrome (nav, sidebar, header) — reading pane only.
  - Requests browser Fullscreen API (`element.requestFullscreen()`).
  - Shows a small lock icon, defaulting to **locked**.
- **While locked:**
  - Clicking elsewhere in the UI to navigate away is blocked/intercepted (e.g. a
    confirmation prompt, or simply no navigation affordances are rendered).
  - Pressing Escape is intercepted via a `fullscreenchange` listener that
    re-requests fullscreen if the lock is still engaged, to discourage casual exit.
  - **Be explicit with the user in the UI** (e.g. a tooltip or first-use note) that
    this is a soft lock: a real browser tab can always be closed by the user, and a
    truly inescapable lock is not possible or appropriate to build. The feature's
    job is to make leaving deliberate, not to trap the user.
- Clicking the lock icon toggles to **unlocked**, after which Escape/navigation/exiting
  fullscreen work normally.
- Focus mode state (locked/unlocked, active/inactive) is pure client-side UI state.
  **No database fields are needed for this feature.**

## 8. Highlights View (App-Level)

- A dedicated page, separate from the article library, listing highlights across the
  whole collection — not nested inside any single article's view.
- Default: flat list of all highlights, most recent first, each row showing: the
  highlighted text, its color, the parent article's title (linking back to that
  article), and the highlight's `createdAt` date.
- Filter controls:
  - By tag (filters to highlights whose **parent article** has the given tag — see
    §3.2's note on no highlight-level tags).
  - By specific article(s).
- This same filtered result set is the input to the export feature (§9) — there is no
  separate "build a list" staging step; the active filter state **is** the export
  selection.

## 9. Export

- Available from the Highlights view (§8), operating on the currently filtered set
  (never "export everything" with no filter applied as a separate mode — filtering
  and export selection are the same mechanism, per product decision).
- Output: a single downloaded `.md` file.
- Structure: grouped by source article, each highlight rendered as a blockquote with
  a color emoji marker, followed by an attribution line containing the highlight's
  note **only if one exists**.

Exact format to implement:

```markdown
# Exported Highlights
Exported: {date} · {N} highlights · {M} sources

## {Article Title}
**Source:** {sourceUrl} · Saved: {savedAt date}

> {colorEmoji} {highlight text}
— *Note: {note text}*

> {colorEmoji} {highlight text}

---

## {Next Article Title} (PDF)
**Source:** {original filename} · Page {page} · Saved: {savedAt date}

> {colorEmoji} {highlight text}
```

Color → emoji mapping: `yellow → 🟡, green → 🟢, blue → 🔵, pink → 🩷`.

For PDF-sourced highlights, include `Page {n}` in the source line (using
`anchor.page`); article-sourced highlights use the article's `sourceUrl` instead.

---

## 10. Explicitly Out of Scope for v1

Do not build these unless the user asks — they were deliberately deferred during
planning and adding them prematurely will complicate the data model in ways that
don't match current decisions:

- Highlight-level tags (tags are article-level only — see §3.2)
- Eager/synchronous image downloading at save time (images are hotlinked by URL;
  re-hosting to R2, if ever built, should be a lazy/background process that
  populates `images[].cachedUrl` opportunistically — do not block the save flow on it)
- Full article content editing after save
- YouTube/video transcripts, RSS, newsletters, EPUBs — articles and PDFs only
- An "always-growing master highlights export" mode — export is always
  filter-then-export, never a running auto-export log
- Multi-user accounts/auth beyond a single simple gate
- Real-time sync, offline mode, mobile apps

---

## 11. Build Order Suggestion

A sensible incremental build order (Claude Code can adjust if a different order is
more natural given tooling, but dependencies flow roughly this way):

1. Next.js scaffold + MongoDB connection + `articles`/`highlights`/`collections` schemas
2. Save flow: URL → Readability extraction → store article (no highlighting yet)
3. Library view: list, status toggle (unread/archived), tags, collections, search
4. Article reader view + text highlighting + notes
5. PDF upload (→ R2) + PDF reader view + PDF highlighting
6. Focus mode
7. Highlights view (app-level) with tag/article filtering
8. Export to Markdown


claude --resume 824fb3f2-3d04-47d3-85f5-5976d0b93ec0