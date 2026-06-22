"use client";
import { useEffect, useRef } from "react";

const COLORS = [
  { id: "yellow" as const, bg: "#FCD34D", label: "Yellow" },
  { id: "green"  as const, bg: "#34D399", label: "Green" },
  { id: "blue"   as const, bg: "#60A5FA", label: "Blue" },
  { id: "pink"   as const, bg: "#F472B6", label: "Pink" },
];

const POPUP_W = 184; // approximate width: 4 * 28px buttons + gaps + padding
const POPUP_H = 48;

interface Props {
  rect: DOMRect;
  onSelect: (color: "yellow" | "green" | "blue" | "pink") => void;
  onDismiss: () => void;
}

export default function ColorPicker({ rect, onSelect, onDismiss }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === "Escape") onDismiss(); }
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onDismiss]);

  // Position above the selection, clamped to viewport
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const rawTop  = rect.top + window.scrollY - POPUP_H - 8;
  const rawLeft = rect.left + rect.width / 2 - POPUP_W / 2;

  const top  = Math.max(window.scrollY + 8, rawTop);
  const left = Math.max(8, Math.min(rawLeft, vw - POPUP_W - 8));

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
