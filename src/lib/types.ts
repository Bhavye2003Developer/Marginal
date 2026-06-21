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
