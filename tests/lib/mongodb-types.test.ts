import type { Article, Highlight, Collection } from "@/lib/types";

test("Article shape compiles", () => {
  const a: Article = {
    id: "aaaaaaaa-0000-0000-0000-000000000001",
    type: "article",
    title: "Test",
    sourceUrl: "https://example.com",
    status: "unread",
    tags: [],
    collectionIds: [],
    savedAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
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
    id: "bbbbbbbb-0000-0000-0000-000000000001",
    articleId: "aaaaaaaa-0000-0000-0000-000000000001",
    color: "yellow",
    text: "selected text",
    note: null,
    createdAt: "2026-01-16T00:00:00.000Z",
    anchor: { blockId: "b0", startOffset: 0, endOffset: 5, page: null, rects: null },
  };
  expect(h.color).toBe("yellow");
});

test("Collection shape compiles", () => {
  const c: Collection = {
    id: "cccccccc-0000-0000-0000-000000000001",
    name: "Reading list",
    createdAt: "2026-01-16T00:00:00.000Z",
  };
  expect(c.name).toBe("Reading list");
});
