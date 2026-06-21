"use client";
import { useEffect, useRef } from "react";

const COLORS = [
  { id: "yellow" as const, label: "Yellow", cls: "bg-yellow-300" },
  { id: "green" as const, label: "Green", cls: "bg-green-300" },
  { id: "blue" as const, label: "Blue", cls: "bg-blue-300" },
  { id: "pink" as const, label: "Pink", cls: "bg-pink-300" },
];

interface Props {
  rect: DOMRect;
  onSelect: (color: "yellow" | "green" | "blue" | "pink") => void;
  onDismiss: () => void;
}

export default function ColorPicker({ rect, onSelect, onDismiss }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onDismiss]);

  const top = rect.top + window.scrollY - 48;
  const left = rect.left + rect.width / 2 - 72;

  return (
    <div
      ref={ref}
      style={{ position: "absolute", top, left, zIndex: 50 }}
      className="flex gap-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2"
    >
      {COLORS.map((c) => (
        <button
          key={c.id}
          title={c.label}
          onClick={() => onSelect(c.id)}
          className={`w-7 h-7 rounded-full ${c.cls} hover:scale-110 transition-transform border border-white shadow`}
        />
      ))}
    </div>
  );
}
