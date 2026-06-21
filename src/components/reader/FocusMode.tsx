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
      className={active ? "fixed inset-0 z-40 bg-white overflow-auto" : ""}
    >
      {active && (
        <div className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-stone-100 px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-stone-400">Focus mode · You can always close the browser tab</span>
          <button onClick={onToggle} className="text-stone-500 hover:text-violet-600 transition-colors font-medium">
            Exit
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
