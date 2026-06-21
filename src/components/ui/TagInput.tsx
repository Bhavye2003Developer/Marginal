"use client";
import { useState, KeyboardEvent } from "react";

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagInput({ tags, onChange }: Props) {
  const [input, setInput] = useState("");

  function addTag() {
    const t = input.trim().toLowerCase();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    if (e.key === "Backspace" && !input && tags.length) removeTag(tags[tags.length - 1]);
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        background: "#ffffff",
        border: "1px solid #E8E6E1",
        borderRadius: 8,
        padding: "7px 12px",
        minHeight: 38,
        alignItems: "center",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      }}
      onFocusCapture={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#5B5BD6";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(91,91,214,0.12)";
      }}
      onBlurCapture={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#E8E6E1";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {tags.map((t) => (
        <span key={t} className="tag">
          {t}
          <button
            onClick={() => removeTag(t)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#5B5BD6", opacity: 0.6, padding: 0, lineHeight: 1, fontSize: 13 }}
            aria-label={`Remove tag ${t}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? "Add tags…" : ""}
        style={{
          outline: "none",
          border: "none",
          fontSize: 13,
          flex: 1,
          minWidth: 60,
          background: "transparent",
          color: "#1A1A1A",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}
