import { generateMarkdown } from "@/lib/export";
import { ObjectId } from "mongodb";
import type { Highlight, Article } from "@/lib/types";

const aid = new ObjectId();

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
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
  };
}

function makeHighlight(overrides: Partial<Highlight> = {}): Highlight {
  return {
    _id: new ObjectId(),
    articleId: aid,
    color: "yellow",
    text: "highlighted passage",
    note: null,
    createdAt: new Date("2026-01-16"),
    anchor: { blockId: "b0", startOffset: 0, endOffset: 5, page: null, rects: null },
    ...overrides,
  };
}

test("returns empty string for empty highlights", () => {
  expect(generateMarkdown([], [])).toBe("");
});

test("includes header with count and sources", () => {
  const result = generateMarkdown([makeHighlight()], [makeArticle()]);
  expect(result).toContain("# Exported Highlights");
  expect(result).toContain("1 highlights · 1 sources");
});

test("renders yellow emoji for yellow highlight", () => {
  const result = generateMarkdown([makeHighlight({ color: "yellow" })], [makeArticle()]);
  expect(result).toContain("🟡 highlighted passage");
});

test("renders green emoji for green highlight", () => {
  expect(generateMarkdown([makeHighlight({ color: "green" })], [makeArticle()])).toContain("🟢");
});

test("renders blue emoji for blue highlight", () => {
  expect(generateMarkdown([makeHighlight({ color: "blue" })], [makeArticle()])).toContain("🔵");
});

test("renders pink emoji for pink highlight", () => {
  expect(generateMarkdown([makeHighlight({ color: "pink" })], [makeArticle()])).toContain("🩷");
});

test("renders note line when note is present", () => {
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

test("adds (PDF) suffix and Page N for pdf type", () => {
  const result = generateMarkdown(
    [makeHighlight({ anchor: { blockId: null, startOffset: null, endOffset: null, page: 3, rects: [] } })],
    [makeArticle({ type: "pdf" })]
  );
  expect(result).toContain("## Test Article (PDF)");
  expect(result).toContain("Page 3");
});

test("no (PDF) suffix for article type", () => {
  const result = generateMarkdown([makeHighlight()], [makeArticle({ type: "article" })]);
  expect(result).not.toContain("(PDF)");
});
