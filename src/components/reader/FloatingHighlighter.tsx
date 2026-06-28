"use client";
import { useRef, useState, useEffect } from "react";

const COLORS = [
  { id: "yellow" as const, bg: "#FFD60A" },
  { id: "green"  as const, bg: "#34C759" },
  { id: "blue"   as const, bg: "#007AFF" },
  { id: "pink"   as const, bg: "#FF2D55" },
];

const BALL    = 32;   // ball diameter (px)
const SWATCH  = 26;   // color-swatch diameter
const ARC_R   = 62;   // ball-center → swatch-center distance
const PAD     = 14;   // edge padding when snapped
const DEAD    = 10;   // px dead-zone before drag is registered
const TAP_MS  = 500;

// Swatch [tx, ty] offsets from ball-center in SCREEN coords (+x right, +y down).
// Right-side ball: colours fan to the LEFT  (angles 135°,157.5°,202.5°,225° math)
// Left-side  ball: colours fan to the RIGHT (mirror of above)
const ARC_RIGHT: [number, number][] = [[-44,-44], [-57,-24], [-57,24], [-44,44]];
const ARC_LEFT:  [number, number][] = [[ 44,-44], [ 57,-24], [ 57,24], [ 44,44]];

interface Props {
  onHighlight: (color: "yellow" | "green" | "blue" | "pink") => void;
  onPress?: () => void;
}

export default function FloatingHighlighter({ onHighlight, onPress }: Props) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const posRef   = useRef({ x: 0, y: 0 });
  const dragRef  = useRef<{
    startX: number; startY: number;
    startPX: number; startPY: number;
    startTime: number; moved: boolean;
    pointerId: number;
  } | null>(null);

  // mounted gates visibility (not existence) — the ball div is always in the DOM
  // so wrapRef.current is set before the first useEffect runs.
  const [mounted,    setMounted]    = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pressed,    setPressed]    = useState(false);

  useEffect(() => {
    // wrapRef.current IS set here because we always render the ball div
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

    // Key fix: read the CURRENT visual transform rather than posRef.current, which
    // already holds the snap-target when the user grabs mid-animation. Without this,
    // startPX is wrong and the ball teleports on the first movement.
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
  const arcs = isOnRight ? ARC_RIGHT : ARC_LEFT;
  const ballCX = posRef.current.x + BALL / 2;
  const ballCY = posRef.current.y + BALL / 2;

  return (
    <>
      {/* Colour swatches — shoot out in a semicircle from the ball centre */}
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
              // position at ball centre; CSS translate moves to arc position
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
              // CSS custom props consumed by @keyframes colorShoot in globals.css
              ["--cx" as string]: `${tx}px`,
              ["--cy" as string]: `${ty}px`,
              animation: `colorShoot 0.34s cubic-bezier(0.34,1.56,0.64,1) ${i * 48}ms both`,
            }}
          />
        );
      })}

      {/* Ball — always in DOM so wrapRef is set before the init useEffect */}
      <div
        ref={wrapRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 9999,
          willChange: "transform",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTapHighlightColor: "transparent",
          cursor: pressed ? "grabbing" : "grab",
          // hidden until positioned by the init useEffect
          opacity: mounted ? 1 : 0,
          transition: mounted ? undefined : "none",
        }}
      >
        <div
          style={{
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
          }}
        />
      </div>
    </>
  );
}
