"use client";
import { useState } from "react";
import type { Collection } from "@/lib/types";

interface Props {
  collections: Collection[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreateCollection: (name: string) => Promise<void>;
}

export default function CollectionPicker({ collections, selectedIds, onChange, onCreateCollection }: Props) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try { await onCreateCollection(newName.trim()); }
    finally { setNewName(""); setCreating(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {collections.map((c) => (
        <label
          key={c.id}
          style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text)", cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(c.id)}
            onChange={() => toggle(c.id)}
            style={{ accentColor: "var(--primary)", width: 14, height: 14 }}
          />
          {c.name}
        </label>
      ))}
      <form onSubmit={handleCreate} style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New collection…"
          className="input"
          style={{ fontSize: 12, padding: "6px 10px" }}
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="btn-primary"
          style={{ fontSize: 12, padding: "6px 12px", whiteSpace: "nowrap" }}
        >
          Add
        </button>
      </form>
    </div>
  );
}
