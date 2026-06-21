"use client";
import { useState } from "react";
import type { Highlight } from "@/lib/types";

interface Props {
  highlight: Highlight;
  onSave: (note: string | null) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function NotePopover({ highlight, onSave, onDelete, onClose }: Props) {
  const [note, setNote] = useState(highlight.note ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-stone-500 mb-3 line-clamp-2 italic">&ldquo;{highlight.text}&rdquo;</p>
        <textarea
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onSave(note.trim() || null)}
            className="flex-1 rounded-xl bg-violet-600 text-white py-2 text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            Save
          </button>
          <button
            onClick={onDelete}
            className="rounded-xl border border-red-200 text-red-600 px-4 py-2 text-sm hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-stone-200 text-stone-600 px-4 py-2 text-sm hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
