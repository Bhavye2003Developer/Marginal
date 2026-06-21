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
      {/* Status tabs */}
      <div
        style={{
          display: "inline-flex",
          background: "#F0EFE9",
          borderRadius: 8,
          padding: 3,
          gap: 2,
          alignSelf: "flex-start",
        }}
      >
        {(["unread", "archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: status === s ? "#ffffff" : "transparent",
              color: status === s ? "#1A1A1A" : "#6B6B6B",
              boxShadow: status === s ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
            }}
          >
            {s === "unread" ? "Inbox" : "Archived"}
          </button>
        ))}
      </div>

      {/* Search */}
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

      {/* Collections */}
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

      {/* Tags */}
      {allTags.length > 0 && (
        <div>
          <p className="section-label">Tags</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <FilterTag
              active={!selectedTag}
              onClick={() => onTagChange(null)}
              label="All"
            />
            {allTags.map((t) => (
              <FilterTag
                key={t}
                active={selectedTag === t}
                onClick={() => onTagChange(t === selectedTag ? null : t)}
                label={t}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterTag({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 500,
        border: "none",
        cursor: "pointer",
        transition: "all 0.15s ease",
        background: active ? "#5B5BD6" : "#F0EFE9",
        color: active ? "#ffffff" : "#6B6B6B",
      }}
    >
      {label}
    </button>
  );
}
