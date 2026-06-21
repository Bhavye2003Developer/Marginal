"use client";
import { useEffect, useRef } from "react";

const COLORS = [
  { id: "yellow" as const, bg: "bg-yellow-300", label: "Yellow" },
  { id: "green" as const, bg: "bg-green-400", label: "Green" },
  { id: "blue" as const, bg: "bg-blue-400", label: "Blue" },
  { id: "pink" as const, bg: "bg-pink-400", label: "Pink" },
];

interface Props {
  rect: DOMRect;
  onSelect: (color: "yellow" | "green" | "blue" | "pink") => void;
  onDismiss: () => void;
}

export default function ColorPicker({ rect, onSelect, onDismiss }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [onDismiss]);

  const top = rect.top + window.scrollY - 52;
  const left = rect.left + rect.width / 2 - 88;

  return (
    <div
      ref={ref}
      style={{ position: "absolute", top, left }}
      className="flex gap-1.5 bg-white rounded-2xl shadow-xl border border-stone-200 px-3 py-2.5 z-50"
    >
      {COLORS.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          title={c.label}
          className={`w-7 h-7 rounded-full ${c.bg} hover:scale-110 transition-transform ring-2 ring-transparent hover:ring-stone-300`}
        />
      ))}
    </div>
  );
}
