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
