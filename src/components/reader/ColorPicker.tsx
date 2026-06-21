"use client";
import { useEffect, useRef } from "react";

const COLORS = [
  { id: "yellow" as const, bg: "#FCD34D", label: "Yellow" },
  { id: "green"  as const, bg: "#34D399", label: "Green" },
  { id: "blue"   as const, bg: "#60A5FA", label: "Blue" },
  { id: "pink"   as const, bg: "#F472B6", label: "Pink" },
];

interface Props {
  rect: DOMRect;
  onSelect: (color: "yellow" | "green" | "blue" | "pink") => void;
  onDismiss: () => void;
}

export default function ColorPicker({ rect, onSelect, onDismiss }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === "Escape") onDismiss(); }
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

  const top = rect.top + window.scrollY - 56;
  const left = rect.left + rect.width / 2 - 92;

  return (
    <div
      ref={ref}
      className="color-picker-popup"
      style={{
        position: "absolute",
        top,
        left,
        display: "flex",
        gap: 8,
        zIndex: 50,
      }}
    >
      {COLORS.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          title={c.label}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: c.bg,
            border: "2px solid transparent",
            cursor: "pointer",
            transition: "transform 0.1s ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.18)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
        />
      ))}
    </div>
  );
}
