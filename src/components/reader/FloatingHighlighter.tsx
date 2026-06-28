"use client";
import { useRef, useState, useEffect } from "react";

const COLORS = [
  { id: "yellow" as const, bg: "#FFD60A", glow: "rgba(255,214,10,0.55)"  },
  { id: "green"  as const, bg: "#34C759", glow: "rgba(52,199,89,0.55)"   },
  { id: "blue"   as const, bg: "#007AFF", glow: "rgba(0,122,255,0.55)"   },
  { id: "pink"   as const, bg: "#FF2D55", glow: "rgba(255,45,85,0.55)"   },
];

const BALL_SIZE  = 50;
const PICKER_W   = 188;
const PICKER_H   = 56;
const EDGE_PAD   = 14;
const DRAG_DEAD  = 12;
const TAP_MS     = 500;

interface Props {
  onHighlight: (color: "yellow" | "green" | "blue" | "pink") => void;
  onPress?: () => void;
}

export default function FloatingHighlighter({ onHighlight, onPress }: Props) {
  const wrapRef   = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const posRef    = useRef({ x: 0, y: 0 });
  const dragRef   = useRef<{
    startX: number; startY: number;
    startPX: number; startPY: number;
    startTime: number; moved: boolean;
    pointerId: number;
  } | null>(null);

  const [mounted,    setMounted]    = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pressed,    setPressed]    = useState(false);

  useEffect(() => {
    posRef.current = { x: window.innerWidth - BALL_SIZE - EDGE_PAD, y: 110 };
    commit(false);
    setMounted(true);
  }, []);

  function commit(animate: boolean) {
    const el = wrapRef.current;
    if (!el) return;
    if (!animate) {
      el.style.transition = "none";
    } else {
      el.style.transition = "transform 0.42s cubic-bezier(0.34,1.56,0.64,1)";
      setTimeout(() => { if (wrapRef.current) wrapRef.current.style.transition = "none"; }, 460);
    }
    el.style.transform = `translate(${posRef.current.x}px,${posRef.current.y}px)`;
  }

  function snapToEdge() {
    const mid     = window.innerWidth / 2;
    const onRight = posRef.current.x + BALL_SIZE / 2 >= mid;
    posRef.current = {
      x: onRight ? window.innerWidth - BALL_SIZE - EDGE_PAD : EDGE_PAD,
      y: Math.max(EDGE_PAD, Math.min(window.innerHeight - BALL_SIZE - EDGE_PAD, posRef.current.y)),
    };
    commit(true);
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onPress?.();
    setPressed(true);

    // Read the ACTUAL visual position right now — posRef may already hold the snap
    // target position while the spring animation is still in progress. By reading
    // getComputedStyle after clearing the transition, we get the interpolated
    // mid-animation value, freeze the ball there, and start drag from the right origin.
    const el = wrapRef.current;
    if (el) {
      el.style.transition = "none";
      const xform = getComputedStyle(el).transform;
      if (xform && xform !== "none") {
        const m = new DOMMatrix(xform);
        posRef.current = { x: m.m41, y: m.m42 };
        el.style.transform = `translate(${m.m41}px,${m.m42}px)`;
      }
    }

    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      startPX: posRef.current.x, startPY: posRef.current.y,
      startTime: Date.now(), moved: false,
      pointerId: e.pointerId,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.abs(dx) < DRAG_DEAD && Math.abs(dy) < DRAG_DEAD) return;

    drag.moved = true;
    if (showPicker) setShowPicker(false);

    posRef.current = {
      x: Math.max(EDGE_PAD, Math.min(window.innerWidth  - BALL_SIZE - EDGE_PAD, drag.startPX + dx)),
      y: Math.max(EDGE_PAD, Math.min(window.innerHeight - BALL_SIZE - EDGE_PAD, drag.startPY + dy)),
    };
    commit(false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    dragRef.current = null;
    setPressed(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}

    const elapsed = Date.now() - drag.startTime;
    if (!drag.moved && elapsed < TAP_MS) {
      setShowPicker(v => !v);
    } else if (drag.moved) {
      snapToEdge();
    }
  };

  // Close picker when tapping outside both the ball AND the picker itself.
  // Checking pickerRef prevents the outside listener from firing when the user
  // taps a color swatch — that would race with the swatch's own handler.
  useEffect(() => {
    if (!showPicker) return;
    let id: ReturnType<typeof setTimeout>;
    const handler = (e: PointerEvent) => {
      const inBall   = wrapRef.current?.contains(e.target as Node);
      const inPicker = pickerRef.current?.contains(e.target as Node);
      if (!inBall && !inPicker) setShowPicker(false);
    };
    id = setTimeout(() => document.addEventListener("pointerdown", handler, { capture: true }), 0);
    return () => { clearTimeout(id); document.removeEventListener("pointerdown", handler, { capture: true }); };
  }, [showPicker]);

  if (!mounted) return null;

  const isOnRight  = posRef.current.x + BALL_SIZE / 2 >= window.innerWidth / 2;
  const ballRight  = posRef.current.x + BALL_SIZE;
  const pickerLeft = isOnRight
    ? Math.max(EDGE_PAD, ballRight - PICKER_W)
    : Math.min(posRef.current.x, window.innerWidth - PICKER_W - EDGE_PAD);
  const spaceAbove = posRef.current.y - PICKER_H - 12;
  const pickerTop  = spaceAbove > EDGE_PAD ? spaceAbove : posRef.current.y + BALL_SIZE + 8;

  return (
    <>
      {showPicker && (
        <div
          ref={pickerRef}
          style={{
            position: "fixed",
            top:  pickerTop,
            left: pickerLeft,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "11px 18px",
            borderRadius: 999,
            background: "rgba(18,18,20,0.82)",
            backdropFilter: "blur(28px) saturate(200%)",
            WebkitBackdropFilter: "blur(28px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.50), 0 4px 12px rgba(0,0,0,0.28), inset 0 0.5px 0 rgba(255,255,255,0.09)",
            animation: "floatPickerIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        >
          {COLORS.map((c) => (
            <button
              key={c.id}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onHighlight(c.id);
                setShowPicker(false);
              }}
              style={{
                width: 27,
                height: 27,
                borderRadius: "50%",
                background: c.bg,
                border: "2px solid rgba(255,255,255,0.40)",
                cursor: "pointer",
                flexShrink: 0,
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                transition: "transform 0.16s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.16s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform  = "scale(1.28)";
                (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 14px ${c.glow}`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform  = "scale(1)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            />
          ))}
        </div>
      )}

      <div
        ref={wrapRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
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
          cursor: pressed ? "grabbing" : "grab",
        }}
      >
        <div
          style={{
            width:  BALL_SIZE,
            height: BALL_SIZE,
            borderRadius: "50%",
            background: showPicker
              ? "rgba(91,91,214,0.88)"
              : "rgba(128,128,132,0.22)",
            backdropFilter: "blur(22px) saturate(180%)",
            WebkitBackdropFilter: "blur(22px) saturate(180%)",
            border: showPicker
              ? "1.5px solid rgba(255,255,255,0.36)"
              : "1.5px solid rgba(255,255,255,0.20)",
            boxShadow: pressed
              ? "0 2px 8px rgba(0,0,0,0.18)"
              : showPicker
                ? "0 8px 28px rgba(91,91,214,0.50), inset 0 1px 0 rgba(255,255,255,0.20)"
                : "0 6px 20px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.18)",
            transition: "background 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, transform 0.16s cubic-bezier(0.34,1.56,0.64,1)",
            transform: pressed ? "scale(0.90)" : showPicker ? "scale(1.07)" : "scale(1)",
          }}
        />
      </div>
    </>
  );
}
