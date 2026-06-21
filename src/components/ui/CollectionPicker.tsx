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
    await onCreateCollection(newName.trim());
    setNewName("");
    setCreating(false);
  }

  return (
    <div className="space-y-1.5">
      {collections.map((c) => (
        <label key={c.id} className="flex items-center gap-2.5 text-sm cursor-pointer text-stone-700 hover:text-stone-900 transition-colors">
          <input
            type="checkbox"
            checked={selectedIds.includes(c.id)}
            onChange={() => toggle(c.id)}
            className="accent-violet-600 rounded"
          />
          {c.name}
        </label>
      ))}
      <form onSubmit={handleCreate} className="flex gap-2 mt-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New collection…"
          className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="rounded-xl bg-violet-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          Add
        </button>
      </form>
    </div>
  );
}
