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
    <div className="space-y-1">
      {collections.map((c) => (
        <label key={c._id.toString()} className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={selectedIds.includes(c._id.toString())}
            onChange={() => toggle(c._id.toString())}
          />
          {c.name}
        </label>
      ))}
      <form onSubmit={handleCreate} className="flex gap-1 mt-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New collection…"
          className="border border-gray-200 rounded px-2 py-0.5 text-xs flex-1"
        />
        <button type="submit" disabled={creating} className="text-xs text-blue-600 disabled:opacity-50">
          Add
        </button>
      </form>
    </div>
  );
}
