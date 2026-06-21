"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface Props {
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export default function FocusMode({ active, onToggle, children }: Props) {
  const [locked, setLocked] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const enterFullscreen = useCallback(() => {
    containerRef.current?.requestFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    if (active) {
      setLocked(true);
      enterFullscreen();
    } else {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
  }, [active, enterFullscreen]);

  useEffect(() => {
    function handleChange() {
      if (active && locked && !document.fullscreenElement) {
        enterFullscreen();
      }
    }
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, [active, locked, enterFullscreen]);

  if (!active) {
    return (
      <>
        <button
          onClick={onToggle}
          className="fixed bottom-4 right-4 z-40 bg-white border border-gray-300 rounded-full px-3 py-1.5 text-xs shadow hover:shadow-md"
          title="Enter focus mode"
        >
          Focus
        </button>
        {children}
      </>
    );
  }

  return (
    <div ref={containerRef} className="bg-gray-50 min-h-screen overflow-y-auto">
      <div className="fixed top-3 right-3 z-50 flex gap-2">
        <button
          onClick={() => setLocked((l) => !l)}
          className="bg-white border border-gray-300 rounded-full px-3 py-1.5 text-xs shadow"
          title={locked ? "Focus lock is ON — click to unlock" : "Click to lock focus"}
        >
          {locked ? "🔒 Locked" : "🔓 Unlocked"}
        </button>
        {!locked && (
          <button
            onClick={onToggle}
            className="bg-white border border-gray-300 rounded-full px-3 py-1.5 text-xs shadow"
          >
            Exit
          </button>
        )}
      </div>
      <p className="text-center text-xs text-gray-400 pt-2">
        Focus locked — click 🔒 to unlock. You can always close the browser tab.
      </p>
      {children}
    </div>
  );
}
