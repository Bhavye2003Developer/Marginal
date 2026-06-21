"use client";
import { useEffect, useRef } from "react";

interface Props {
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export default function FocusMode({ active, onToggle, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      return;
    }
    function requestFs() {
      ref.current?.requestFullscreen().catch(() => {});
    }
    requestFs();
    document.addEventListener("fullscreenchange", requestFs);
    return () => document.removeEventListener("fullscreenchange", requestFs);
  }, [active]);

  return (
    <div
      ref={ref}
      style={active ? { position: "fixed", inset: 0, zIndex: 40, background: "var(--bg)", overflowY: "auto" } : undefined}
    >
      {active && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "color-mix(in srgb, var(--bg) 90%, transparent)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid var(--border)",
            padding: "10px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>Focus mode</span>
          <button
            onClick={onToggle}
            style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontWeight: 500, fontFamily: "inherit" }}
          >
            Exit
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
