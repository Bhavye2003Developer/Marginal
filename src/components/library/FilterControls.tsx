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
  status, onStatusChange,
  search, onSearchChange,
  allTags, selectedTag, onTagChange,
  collections, selectedCollectionId, onCollectionChange,
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="status-toggle">
        {(["unread", "archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            className={`status-toggle-btn${status === s ? " active" : ""}`}
          >
            {s === "unread" ? "Inbox" : "Archived"}
          </button>
        ))}
      </div>

      <div>
        <p className="section-label">Search</p>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search articles…"
          className="input"
          style={{ fontSize: 13 }}
        />
      </div>

      {collections && collections.length > 0 && (
        <div>
          <p className="section-label">Collection</p>
          <select
            value={selectedCollectionId ?? ""}
            onChange={(e) => onCollectionChange?.(e.target.value || null)}
            className="input"
            style={{ fontSize: 13, cursor: "pointer" }}
          >
            <option value="">All collections</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {allTags.length > 0 && (
        <div>
          <p className="section-label">Tags</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button
              className={`filter-tag${!selectedTag ? " active" : ""}`}
              onClick={() => onTagChange(null)}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                className={`filter-tag${selectedTag === t ? " active" : ""}`}
                onClick={() => onTagChange(t === selectedTag ? null : t)}
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
