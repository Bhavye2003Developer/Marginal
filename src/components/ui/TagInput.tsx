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
    <div className="flex flex-wrap gap-1 border border-gray-200 rounded-md px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500">
      {tags.map((t) => (
        <span key={t} className="bg-gray-100 text-xs rounded px-2 py-0.5 flex items-center gap-1">
          {t}
          <button onClick={() => removeTag(t)} className="text-gray-400 hover:text-gray-700">×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? "Add tags…" : ""}
        className="outline-none text-xs flex-1 min-w-16 bg-transparent"
      />
    </div>
  );
}
