"use client";
import { useState, useEffect } from "react";
import type { Highlight } from "@/lib/types";

interface Props {
  highlight: Highlight;
  onSave: (note: string | null) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function NotePopover({ highlight, onSave, onDelete, onClose }: Props) {
  const [note, setNote] = useState(highlight.note ?? "");

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={onClose}
    >
      <div className="bg-white rounded-xl shadow-xl p-5 w-80" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-gray-700 mb-3 line-clamp-2 italic">"{highlight.text}"</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          autoFocus
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onSave(note.trim() || null)}
            className="flex-1 bg-blue-600 text-white text-sm py-1.5 rounded-md hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={onDelete}
            className="text-sm text-red-600 px-3 py-1.5 hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
