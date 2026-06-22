export interface Article {
  id: string;
  type: "article" | "pdf";
  title: string;
  sourceUrl: string;
  status: "unread" | "archived";
  tags: string[];
  collectionIds: string[];
  savedAt: string;
  updatedAt: string;
  content: string | null;
  images: Array<{ originalUrl: string; cachedUrl: string | null }> | null;
  fileUrl: string | null;
  pageCount: number | null;
  searchableText: string | null;
}

export interface Highlight {
  id: string;
  articleId: string | null;
  color: "yellow" | "green" | "blue" | "pink";
  text: string;
  note: string | null;
  createdAt: string;
  anchor: {
    blockId: string | null;
    startOffset: number | null;
    endOffset: number | null;
    page: number | null;
    rects: Array<{ x: number; y: number; width: number; height: number }> | null;
  };
}

export interface Collection {
  id: string;
  name: string;
  createdAt: string;
}
