"use client";
import { useRef, useState, useEffect } from "react";

// iOS system colors
const COLORS = [
  { id: "yellow" as const, bg: "#FFD60A", shadow: "rgba(255,214,10,0.5)" },
  { id: "green"  as const, bg: "#34C759", shadow: "rgba(52,199,89,0.5)"  },
  { id: "blue"   as const, bg: "#007AFF", shadow: "rgba(0,122,255,0.5)"  },
  { id: "pink"   as const, bg: "#FF2D55", shadow: "rgba(255,45,85,0.5)"  },
];

interface Props {
  onHighlight: (color: "yellow" | "green" | "blue" | "pink") => void;
}

export default function FloatingHighlighter({ onHighlight }: Props) {
  const wrapRef   = useRef<HTMLDivElement>(null); // the whole widget (ball + picker)
  const ballRef   = useRef<HTMLDivElement>(null); // draggable surface
  const posRef    = useRef({ x: 0, y: 0 });
  const dragRef   = useRef<{
    startX: number; startY: number;
    startPX: number; startPY: number;
    startTime: number; moved: boolean;
  } | null>(null);

  const [mounted, setMounted]     = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [active, setActive]       = useState(false); // ball pressed

  // ── Init position ────────────────────────────────────────────────────────
  useEffect(() => {
    posRef.current = { x: window.innerWidth - 74, y: 110 };
    applyPos(false);
    setMounted(true);
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function applyPos(animate: boolean) {
    const el = wrapRef.current;
    if (!el) return;
    if (animate) {
      el.style.transition = "transform 0.45s cubic-bezier(0.34,1.56,0.64,1)";
      requestAnimationFrame(() => { requestAnimationFrame(() => { el.style.transition = ""; }); });
      // Remove transition after it finishes
      const cleanup = () => { el.style.transition = ""; el.removeEventListener("transitionend", cleanup); };
      el.addEventListener("transitionend", cleanup, { once: true });
    }
    el.style.transform = `translate(${posRef.current.x}px,${posRef.current.y}px)`;
  }

  function snapToEdge() {
    const { y } = posRef.current;
    const mid   = window.innerWidth / 2;
    const toRight = posRef.current.x + 28 > mid;
    posRef.current = {
      x: toRight ? window.innerWidth - 74 : 16,
      y: Math.max(16, Math.min(window.innerHeight - 74, y)),
    };
    applyPos(true);
  }

  // ── Pointer events (unified mouse + touch via setPointerCapture) ─────────
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Preserve text selection — prevent browser focus change
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(true);
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      startPX: posRef.current.x, startPY: posRef.current.y,
      startTime: Date.now(), moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    // 12 px dead-zone so a tap doesn't accidentally become a drag
    if (!drag.moved && Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    drag.moved = true;
    setShowPicker(false); // hide picker while dragging
    posRef.current = {
      x: Math.max(16, Math.min(window.innerWidth  - 58, drag.startPX + dx)),
      y: Math.max(16, Math.min(window.innerHeight - 58, drag.startPY + dy)),
    };
    // Direct DOM update — zero React re-renders during drag
    applyPos(false);
  };

  const handlePointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    setActive(false);
    if (!drag) return;
    const elapsed = Date.now() - drag.startTime;
    if (!drag.moved && elapsed < 500) {
      // It was a tap — toggle picker
      setShowPicker(v => !v);
    } else if (drag.moved) {
      // Snap to nearest edge like iOS AssistiveTouch
      snapToEdge();
    }
  };

  // ── Close picker when tapping outside ────────────────────────────────────
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    // Delay 1 tick so the same pointerdown that opened it doesn't close it
    const id = setTimeout(() =>
      document.addEventListener("pointerdown", handler, { capture: true }), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("pointerdown", handler, { capture: true });
    };
  }, [showPicker]);

  if (!mounted) return null;

  // ── Picker position: above the ball, clamped to viewport ─────────────────
  const PICKER_W  = 188;
  const PICKER_H  = 56;
  const { x, y }  = posRef.current;
  const pickerTop = y - PICKER_H - 14 > 16 ? y - PICKER_H - 14 : y + 66;
  const pickerLeft = Math.max(16, Math.min(x - PICKER_W / 2 + 29, window.innerWidth - PICKER_W - 16));

  return (
    <>
      {/* ── Picker pill ─────────────────────────────────────────────────── */}
      {showPicker && (
        <div
          style={{
            position: "fixed",
            top:  pickerTop,
            left: pickerLeft,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 18px",
            borderRadius: 999,
            background: "rgba(22,22,24,0.82)",
            backdropFilter: "blur(24px) saturate(200%)",
            WebkitBackdropFilter: "blur(24px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25), inset 0 0.5px 0 rgba(255,255,255,0.08)",
            animation: "floatPickerIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
            pointerEvents: "auto",
          }}
        >
          {COLORS.map((c) => (
            <button
              key={c.id}
              onPointerDown={(e) => {
                e.preventDefault();   // keep text selection alive
                e.stopPropagation();
                onHighlight(c.id);
                setShowPicker(false);
              }}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: c.bg,
                border: "2px solid rgba(255,255,255,0.45)",
                cursor: "pointer",
                boxShadow: `0 0 0 0 ${c.shadow}`,
                flexShrink: 0,
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = "scale(1.3)";
                el.style.boxShadow = `0 4px 12px ${c.shadow}`;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = "scale(1)";
                el.style.boxShadow = `0 0 0 0 ${c.shadow}`;
              }}
            />
          ))}
        </div>
      )}

      {/* ── Ball wrapper — position set via transform ─────────────────────── */}
      <div
        ref={wrapRef}
        style={{
          position: "fixed",
          left: 0,
          top:  0,
          zIndex: 9999,
          willChange: "transform",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <div
          ref={ballRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            cursor: active ? "grabbing" : "grab",
            // Glass morphism — adapts to light/dark via CSS vars
            background: showPicker
              ? "rgba(91,91,214,0.92)"
              : "rgba(120,120,128,0.24)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: showPicker
              ? "1.5px solid rgba(255,255,255,0.40)"
              : "1.5px solid rgba(255,255,255,0.22)",
            boxShadow: showPicker
              ? "0 8px 30px rgba(91,91,214,0.55), inset 0 1px 0 rgba(255,255,255,0.25)"
              : "0 4px 22px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: showPicker ? "#fff" : "rgba(255,255,255,0.88)",
            fontSize: 20,
            fontWeight: 700,
            transition: "background 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
            transform: active ? "scale(0.93)" : showPicker ? "scale(1.06)" : "scale(1)",
          }}
        >
          ✦
        </div>
      </div>
    </>
  );
}
