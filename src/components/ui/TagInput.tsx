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
    <div className="flex flex-wrap gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent shadow-sm min-h-[2.5rem] items-center">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-700 px-2.5 py-0.5 text-xs font-medium">
          {t}
          <button
            onClick={() => removeTag(t)}
            className="text-violet-400 hover:text-violet-700 transition-colors leading-none"
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
        className="outline-none text-xs flex-1 min-w-16 bg-transparent text-stone-700 placeholder:text-stone-400"
      />
    </div>
  );
}
