"use client";
import type { Collection } from "@/lib/types";

interface Props {
  status: "unread" | "archived";
  onStatusChange: (s: "unread" | "archived") => void;
  search: string;
  onSearchChange: (s: string) => void;
  allTags: string[];
  selectedTag: string | null;
  onTagChange: (t: string | null) => void;
  collections?: Collection[];
  selectedCollectionId?: string | null;
  onCollectionChange?: (id: string | null) => void;
}

export default function FilterControls({
  status, onStatusChange, search, onSearchChange,
  allTags, selectedTag, onTagChange,
  collections, selectedCollectionId, onCollectionChange,
}: Props) {
  return (
    <div className="space-y-5">
      {/* Status toggle */}
      <div>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Status</p>
        <div className="flex rounded-xl border border-stone-200 overflow-hidden bg-white shadow-sm">
          {(["unread", "archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                status === s
                  ? "bg-violet-600 text-white"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Search</p>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search articles…"
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
        />
      </div>

      {/* Collections */}
      {collections && collections.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Collection</p>
          <select
            value={selectedCollectionId ?? ""}
            onChange={(e) => onCollectionChange?.(e.target.value || null)}
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
          >
            <option value="">All collections</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tags */}
      {allTags.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onTagChange(null)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                !selectedTag
                  ? "bg-violet-600 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => onTagChange(t === selectedTag ? null : t)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedTag === t
                    ? "bg-violet-600 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
