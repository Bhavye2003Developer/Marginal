import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Article, Highlight, Collection } from "./types";

let _client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _client;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toArticle(row: any): Article {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    sourceUrl: row.source_url,
    status: row.status,
    tags: row.tags ?? [],
    collectionIds: row.collection_ids ?? [],
    savedAt: row.saved_at,
    updatedAt: row.updated_at,
    content: row.content ?? null,
    images: row.images ?? null,
    fileUrl: row.file_url ?? null,
    pageCount: row.page_count ?? null,
    searchableText: row.searchable_text ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toHighlight(row: any): Highlight {
  return {
    id: row.id,
    articleId: row.article_id,
    color: row.color,
    text: row.text,
    note: row.note ?? null,
    createdAt: row.created_at,
    anchor: {
      blockId: row.block_id ?? null,
      startOffset: row.start_offset ?? null,
      endOffset: row.end_offset ?? null,
      page: row.page ?? null,
      rects: row.rects ?? null,
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toCollection(row: any): Collection {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}
