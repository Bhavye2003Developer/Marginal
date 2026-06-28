"use client";
import { useRef, useState, useEffect, memo } from "react";

const COLORS = [
  { id: "yellow" as const, bg: "#FFD60A" },
  { id: "green"  as const, bg: "#34C759" },
  { id: "blue"   as const, bg: "#007AFF" },
  { id: "pink"   as const, bg: "#FF2D55" },
];

const BALL   = 32;  // ball diameter
const SWATCH = 26;  // colour-swatch diameter
const ARC_R  = 64;  // ball-centre → swatch-centre distance
const PAD    = 14;  // screen-edge padding when snapped
const DEAD   = 10;  // px dead-zone before drag is registered
const TAP_MS = 500;

// Swatch [tx, ty] offsets from ball-centre (screen coords: +x right, +y down).
// Evenly spaced at 30° intervals in a 90° quadrant arc.
//   Angles (math convention): 135°, 165°, 195°, 225°
//   tx = ARC_R * cos(θ),  ty = –ARC_R * sin(θ)   (screen y is inverted)
//
//   135°: (−45, −45)   165°: (−62, −17)   195°: (−62, +17)   225°: (−45, +45)
const ARC_RIGHT: [number, number][] = [[-45, -45], [-62, -17], [-62, 17], [-45, 45]];
const ARC_LEFT:  [number, number][] = [[ 45, -45], [ 62, -17], [ 62, 17], [ 45, 45]];

interface Props {
  onHighlight: (color: "yellow" | "green" | "blue" | "pink") => void;
  onPress?: () => void;
}

function FloatingHighlighter({ onHighlight, onPress }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const posRef  = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{
    startX: number; startY: number;
    startPX: number; startPY: number;
    startTime: number; moved: boolean;
    pointerId: number;
  } | null>(null);

  // Ball div is always in the DOM so wrapRef is set before the init useEffect.
  // `mounted` gates only visibility (opacity 0→1) and the colour swatches.
  const [mounted,    setMounted]    = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pressed,    setPressed]    = useState(false);

  useEffect(() => {
    posRef.current = { x: window.innerWidth - BALL - PAD, y: 110 };
    commit(false);
    setMounted(true);
  }, []);

  function commit(animate: boolean) {
    const el = wrapRef.current;
    if (!el) return;
    if (!animate) {
      el.style.transition = "none";
    } else {
      el.style.transition = "transform 0.44s cubic-bezier(0.34,1.56,0.64,1)";
      setTimeout(() => { if (wrapRef.current) wrapRef.current.style.transition = "none"; }, 470);
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

    // Read actual visual transform — posRef may already hold the snap-target
    // while the spring animation is still running. Without this, startPX is
    // the destination (not where the ball IS), causing it to teleport.
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
  const arcs  = isOnRight ? ARC_RIGHT : ARC_LEFT;
  const ballCX = posRef.current.x + BALL / 2;
  const ballCY = posRef.current.y + BALL / 2;

  return (
    <>
      {/* Transparent overlay — closes picker when user taps outside the ball/swatches.
          z-index 9998 sits below ball (9999) and swatches (10001) so those elements
          still receive pointer events first; only "empty" taps reach the overlay. */}
      {showPicker && mounted && (
        <div
          onPointerDown={(e) => { e.stopPropagation(); setShowPicker(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 9998, background: "transparent" }}
        />
      )}

      {/* Colour swatches — arc animation via CSS custom props + @keyframes colorShoot */}
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
              left: ballCX - SWATCH / 2,
              top:  ballCY - SWATCH / 2,
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
              padding: 0,
              ["--cx" as string]: `${tx}px`,
              ["--cy" as string]: `${ty}px`,
              animation: `colorShoot 0.34s cubic-bezier(0.34,1.56,0.64,1) ${i * 48}ms both`,
            }}
          />
        );
      })}

      {/* Ball — always rendered (never null) so wrapRef is available in init useEffect */}
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
            ? "rgba(82,82,210,0.92)"
            : "rgba(120,120,128,0.28)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: showPicker
            ? "1.5px solid rgba(255,255,255,0.40)"
            : "1.5px solid rgba(255,255,255,0.22)",
          boxShadow: pressed
            ? "0 1px 6px rgba(0,0,0,0.16)"
            : showPicker
              ? "0 6px 22px rgba(82,82,210,0.50), inset 0 1px 0 rgba(255,255,255,0.22)"
              : "0 4px 16px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.20)",
          transform: pressed ? "scale(0.86)" : showPicker ? "scale(1.10)" : "scale(1)",
          transition: "background 0.20s ease, box-shadow 0.20s ease, border-color 0.20s ease, transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
        }} />
      </div>
    </>
  );
}

export default memo(FloatingHighlighter);
