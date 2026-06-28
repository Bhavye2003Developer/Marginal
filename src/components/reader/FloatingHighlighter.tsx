"use client";
import { useRef, useState, useEffect } from "react";

const COLORS = [
  { id: "yellow" as const, bg: "#FCD34D", label: "Yellow" },
  { id: "green"  as const, bg: "#34D399", label: "Green" },
  { id: "blue"   as const, bg: "#60A5FA", label: "Blue" },
  { id: "pink"   as const, bg: "#F472B6", label: "Pink" },
];

interface Props {
  onHighlight: (color: "yellow" | "green" | "blue" | "pink") => void;
}

export default function FloatingHighlighter({ onHighlight }: Props) {
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const [showPicker, setShowPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const ballRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, startY: 0, startPX: 0, startPY: 0, moved: false });

  // Initialize position client-side to avoid SSR mismatch
  useEffect(() => {
    setPos({ x: window.innerWidth - 80, y: 100 });
  }, []);

  // Close picker when clicking outside the ball
  useEffect(() => {
    if (!showPicker) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ballRef.current && !ballRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, [showPicker]);

  // Mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault(); // keep text selection intact
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPX: pos.x, startPY: pos.y, moved: false };
    setIsDragging(true);

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true;
      setPos({
        x: Math.max(8, Math.min(window.innerWidth - 60, dragRef.current.startPX + dx)),
        y: Math.max(8, Math.min(window.innerHeight - 60, dragRef.current.startPY + dy)),
      });
    };
    const onUp = () => {
      setIsDragging(false);
      if (!dragRef.current.moved) setShowPicker((v) => !v);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Touch drag
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const t = e.touches[0];
    dragRef.current = { startX: t.clientX, startY: t.clientY, startPX: pos.x, startPY: pos.y, moved: false };
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const dx = t.clientX - dragRef.current.startX;
    const dy = t.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true;
    setPos({
      x: Math.max(8, Math.min(window.innerWidth - 60, dragRef.current.startPX + dx)),
      y: Math.max(8, Math.min(window.innerHeight - 60, dragRef.current.startPY + dy)),
    });
  };
  const handleTouchEnd = () => {
    if (!dragRef.current.moved) setShowPicker((v) => !v);
  };

  if (pos.x < 0) return null; // wait for client mount

  return (
    <div
      ref={ballRef}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {showPicker && (
        <div
          className="color-picker-popup"
          style={{
            position: "absolute",
            bottom: 56,
            right: 0,
            display: "flex",
            gap: 8,
            whiteSpace: "nowrap",
            zIndex: 10000,
          }}
        >
          {COLORS.map((c) => (
            <button
              key={c.id}
              title={c.label}
              onPointerDown={(e) => {
                e.preventDefault(); // preserve text selection
                e.stopPropagation();
                onHighlight(c.id);
                setShowPicker(false);
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: c.bg,
                border: "2.5px solid rgba(255,255,255,0.8)",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.22)",
                flexShrink: 0,
                transition: "transform 0.1s ease",
                touchAction: "manipulation",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            />
          ))}
        </div>
      )}

      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: showPicker
            ? "var(--primary)"
            : "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 75%, #a0a0ff) 100%)",
          boxShadow: showPicker
            ? `0 6px 24px color-mix(in srgb, var(--primary) 55%, transparent)`
            : "0 4px 16px rgba(0,0,0,0.28)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isDragging ? "grabbing" : "grab",
          transition: isDragging ? "none" : "transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
          color: "#fff",
          fontSize: 20,
          fontWeight: 700,
          transform: showPicker ? "scale(1.12)" : "scale(1)",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        ✦
      </div>
    </div>
  );
}
