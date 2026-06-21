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
      style={active ? { position: "fixed", inset: 0, zIndex: 40, background: "#F9F8F6", overflowY: "auto" } : undefined}
    >
      {active && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "rgba(249,248,246,0.92)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid #E8E6E1",
            padding: "10px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, color: "#A8A49C" }}>Focus mode</span>
          <button
            onClick={onToggle}
            style={{ fontSize: 12, color: "#6B6B6B", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
          >
            Exit
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
