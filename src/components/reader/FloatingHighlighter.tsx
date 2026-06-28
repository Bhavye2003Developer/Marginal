"use client";
import { useRef, useState, useEffect, memo } from "react";

const COLORS = [
  { id: "yellow" as const, bg: "#FFD60A" },
  { id: "green"  as const, bg: "#34C759" },
  { id: "blue"   as const, bg: "#007AFF" },
  { id: "pink"   as const, bg: "#FF2D55" },
];

const BALL   = 32;   // ball diameter
const SWATCH = 26;   // colour-swatch diameter
const ARC_R  = 64;   // ball-centre → swatch-centre distance
const PAD    = 14;   // screen-edge padding when snapped
const DEAD   = 10;   // px dead-zone before drag is registered
const TAP_MS = 500;

// Swatch [tx, ty] offsets from ball-centre (screen: +x right, +y down).
// Evenly spaced at 30° in a 90° quadrant arc.
//   tx = ARC_R·cos(θ),  ty = −ARC_R·sin(θ)
//   Angles: 135°, 165°, 195°, 225°
const ARC_RIGHT: [number, number][] = [[-45, -45], [-62, -17], [-62, 17], [-45, 45]];
const ARC_LEFT:  [number, number][] = [[ 45, -45], [ 62, -17], [ 62, 17], [ 45, 45]];

interface Props {
  onHighlight: (color: "yellow" | "green" | "blue" | "pink") => void;
  onPress?: () => void;
}

function FloatingHighlighter({ onHighlight, onPress }: Props) {
  const wrapRef      = useRef<HTMLDivElement>(null);
  const posRef       = useRef({ x: 0, y: 0 });
  // Tracks whether a snap animation is currently running — lets us skip the
  // expensive getComputedStyle call when the ball is already at rest.
  const animatingRef = useRef(false);
  const dragRef      = useRef<{
    startX: number; startY: number;
    startPX: number; startPY: number;
    startTime: number; moved: boolean;
    pointerId: number;
  } | null>(null);

  const [mounted,    setMounted]    = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pressed,    setPressed]    = useState(false);

  // Ball div is always in the DOM so wrapRef is set before the init useEffect.
  useEffect(() => {
    posRef.current = { x: window.innerWidth - BALL - PAD, y: 110 };
    commit(false);
    setMounted(true);
  }, []);

  function commit(animate: boolean) {
    const el = wrapRef.current;
    if (!el) return;
    if (!animate) {
      animatingRef.current = false;
      el.style.transition = "none";
    } else {
      animatingRef.current = true;
      el.style.transition = "transform 0.44s cubic-bezier(0.34,1.56,0.64,1)";
      setTimeout(() => {
        animatingRef.current = false;
        if (wrapRef.current) wrapRef.current.style.transition = "none";
      }, 470);
    }
    el.style.transform = `translate(${posRef.current.x}px,${posRef.current.y}px)`;
  }

  function snapToEdge() {
    const mid     = window.innerWidth / 2;
    const onRight = posRef.current.x + BALL / 2 >= mid;
    posRef.current = {
      x: onRight ? window.innerWidth - BALL - PAD : PAD,
      y: Math.max(PAD, Math.min(window.innerHeight - BALL - PAD, posRef.current.y)),
    };
    commit(true);
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onPress?.();
    setPressed(true);

    const el = wrapRef.current;
    if (el) {
      if (animatingRef.current) {
        // Ball is mid-snap — read actual visual position so drag starts from
        // where the ball LOOKS, not where it's heading. getComputedStyle forces
        // a style flush, so we only call it when animation is confirmed running.
        el.style.transition = "none";
        const xform = getComputedStyle(el).transform;
        if (xform && xform !== "none") {
          const m = new DOMMatrix(xform);
          posRef.current = { x: m.m41, y: m.m42 };
          el.style.transform = `translate(${m.m41}px,${m.m42}px)`;
        }
        animatingRef.current = false;
      } else {
        el.style.transition = "none";
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
    if (!drag.moved && Math.abs(dx) < DEAD && Math.abs(dy) < DEAD) return;
    drag.moved = true;
    if (showPicker) setShowPicker(false);
    posRef.current = {
      x: Math.max(PAD, Math.min(window.innerWidth  - BALL - PAD, drag.startPX + dx)),
      y: Math.max(PAD, Math.min(window.innerHeight - BALL - PAD, drag.startPY + dy)),
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

  const isOnRight = mounted
    ? posRef.current.x + BALL / 2 >= window.innerWidth / 2
    : true;
  const arcs   = isOnRight ? ARC_RIGHT : ARC_LEFT;
  const ballCX = posRef.current.x + BALL / 2;
  const ballCY = posRef.current.y + BALL / 2;

  return (
    <>
      {/* Full-screen transparent overlay — closes picker when user taps outside.
          z-index 9998 is below ball (9999) and swatches (10001), so those elements
          still receive their pointer events first. */}
      {showPicker && mounted && (
        <div
          onPointerDown={(e) => { e.stopPropagation(); setShowPicker(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 9998, background: "transparent" }}
        />
      )}

      {/* Colour swatches — placed at their final arc positions via left/top so the
          hit-testable area is always correct. Scale-only @keyframes colorPop animates
          the visual "shoot out" effect without any translate, avoiding the mobile bug
          where fill-mode:both + CSS custom property translate mismatch hit regions. */}
      {showPicker && mounted && COLORS.map((c, i) => {
        const [tx, ty] = arcs[i];
        return (
          <button
            key={c.id}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onHighlight(c.id);
              setShowPicker(false);
            }}
            style={{
              position: "fixed",
              left:   ballCX - SWATCH / 2 + tx,
              top:    ballCY - SWATCH / 2 + ty,
              width:  SWATCH,
              height: SWATCH,
              borderRadius: "50%",
              background: c.bg,
              border: "2.5px solid rgba(255,255,255,0.55)",
              boxShadow: "0 3px 10px rgba(0,0,0,0.28)",
              cursor: "pointer",
              zIndex: 10001,
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              pointerEvents: "auto",
              padding: 0,
              animation: `colorPop 0.28s cubic-bezier(0.34,1.56,0.64,1) ${i * 45}ms both`,
            }}
          />
        );
      })}

      {/* Ball — always rendered so wrapRef is set before the init useEffect.
          No backdrop-filter: blurring a moving element forces per-frame GPU
          recomposition on mobile, causing drag jank. Solid semi-opaque instead. */}
      <div
        ref={wrapRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: "fixed",
          left: 0, top: 0,
          zIndex: 9999,
          willChange: "transform",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTapHighlightColor: "transparent",
          cursor: pressed ? "grabbing" : "grab",
          opacity: mounted ? 1 : 0,
        }}
      >
        <div style={{
          width:  BALL,
          height: BALL,
          borderRadius: "50%",
          background: showPicker
            ? "rgba(82,82,210,0.90)"
            : "rgba(110,110,120,0.70)",
          border: showPicker
            ? "1.5px solid rgba(255,255,255,0.42)"
            : "1.5px solid rgba(255,255,255,0.26)",
          boxShadow: pressed
            ? "0 1px 4px rgba(0,0,0,0.22)"
            : showPicker
              ? "0 4px 18px rgba(82,82,210,0.52)"
              : "0 3px 12px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.20)",
          transform: pressed ? "scale(0.86)" : showPicker ? "scale(1.10)" : "scale(1)",
          transition: "background 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, transform 0.16s cubic-bezier(0.34,1.56,0.64,1)",
        }} />
      </div>
    </>
  );
}

export default memo(FloatingHighlighter);
