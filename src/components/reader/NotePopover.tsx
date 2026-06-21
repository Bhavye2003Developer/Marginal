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
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.18)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#ffffff",
          border: "1px solid #E8E6E1",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          marginBottom: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ fontSize: 13, color: "#6B6B6B", fontStyle: "italic", marginBottom: 12, lineHeight: 1.6 }}>
          &ldquo;{highlight.text}&rdquo;
        </p>
        <textarea
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          className="input"
          style={{ resize: "none", fontSize: 13, marginBottom: 12 }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onSave(note.trim() || null)}
            className="btn-primary"
            style={{ flex: 1, fontSize: 13, padding: "8px 16px" }}
          >
            Save note
          </button>
          <button
            onClick={onDelete}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #FCA5A5",
              background: "transparent",
              color: "#DC2626",
              fontSize: 13,
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#FEF2F2"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ fontSize: 13, padding: "8px 14px" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
