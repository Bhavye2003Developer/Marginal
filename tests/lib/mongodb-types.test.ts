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

test("Collection shape compiles", () => {
  const c: Collection = {
    _id: new ObjectId(),
    name: "Reading list",
    createdAt: new Date(),
  };
  expect(c.name).toBe("Reading list");
});
