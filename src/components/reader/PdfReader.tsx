"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import type { Article } from "@/lib/types";

interface Props {
  article: Article;
}

interface PageState {
  rendered: boolean;
  rendering: boolean;
}

export default function PdfReader({ article }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const pageStatesRef = useRef<Map<number, PageState>>(new Map());
  const pageElemsRef = useRef<Map<number, HTMLDivElement>>(new Map());

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.4);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Render one page into its container div
  const renderPage = useCallback(async (pageNum: number, sc: number) => {
    const pdf = pdfDocRef.current;
    if (!pdf) return;
    const state = pageStatesRef.current.get(pageNum);
    if (state?.rendering) return;

    pageStatesRef.current.set(pageNum, { rendered: false, rendering: true });
    const container = pageElemsRef.current.get(pageNum);
    if (!container) { pageStatesRef.current.set(pageNum, { rendered: false, rendering: false }); return; }

    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: sc });

      // Canvas
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.cssText = "display:block;width:100%;height:auto;";

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Text layer for copy/search
      let textLayerDiv: HTMLDivElement | null = null;
      try {
        const textContent = await page.getTextContent();
        textLayerDiv = document.createElement("div");
        textLayerDiv.className = "pdf-text-layer";
        textLayerDiv.style.cssText = `position:absolute;top:0;left:0;width:${canvas.width}px;height:${canvas.height}px;transform-origin:0 0;overflow:hidden;pointer-events:auto;`;

        const scaleX = container.clientWidth / canvas.width || 1;
        textLayerDiv.style.transform = `scaleX(${scaleX}) scaleY(${scaleX})`;

        for (const item of (textContent.items as any[])) {
          if (!item.str) continue;
          const tx = item.transform;
          const span = document.createElement("span");
          span.textContent = item.str + (item.hasEOL ? "\n" : " ");
          const [a, b, c, d, e, f] = tx;
          const fontSize = Math.sqrt(a * a + b * b);
          span.style.cssText = `
            position:absolute;
            left:${e}px;
            top:${viewport.height - f - fontSize}px;
            font-size:${fontSize}px;
            line-height:1;
            white-space:pre;
            color:transparent;
            transform-origin:0 100%;
            ${a !== fontSize || b !== 0 ? `transform:matrix(${a/fontSize},${-b/fontSize},${c/fontSize},${-d/fontSize},0,0)` : ""}
          `;
          textLayerDiv.appendChild(span);
        }
      } catch {
        textLayerDiv = null;
      }

      // Clear container and insert canvas + text layer
      container.innerHTML = "";
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "position:relative;overflow:hidden;";
      wrapper.appendChild(canvas);
      if (textLayerDiv) wrapper.appendChild(textLayerDiv);
      container.appendChild(wrapper);

      pageStatesRef.current.set(pageNum, { rendered: true, rendering: false });
    } catch {
      pageStatesRef.current.set(pageNum, { rendered: false, rendering: false });
    }
  }, []);

  // Load PDF
  useEffect(() => {
    if (!article.fileUrl) { setError("No PDF file URL"); setLoading(false); return; }
    let cancelled = false;

    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const pdf = await pdfjsLib.getDocument({ url: article.fileUrl! }).promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load PDF");
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [article.fileUrl]);

  // IntersectionObserver: render pages as they come into view
  useEffect(() => {
    if (!numPages || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const num = parseInt((entry.target as HTMLElement).dataset.page ?? "0");
            if (num > 0) renderPage(num, scale);
          }
        }
      },
      { rootMargin: "300px" }
    );

    const snapshot = new Map(pageElemsRef.current);
    snapshot.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [numPages, loading, scale, renderPage]);

  // Re-render all visible pages when scale changes
  useEffect(() => {
    if (!numPages || !pdfDocRef.current) return;
    pageStatesRef.current.clear();
    pageElemsRef.current.forEach((_, num) => {
      const el = pageElemsRef.current.get(num);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 400 && rect.bottom > -400) {
        renderPage(num, scale);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  // Scroll tracking for current page indicator
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const mid = containerRect.top + containerRect.height / 2;
      let closest = 1;
      let minDist = Infinity;
      pageElemsRef.current.forEach((el, num) => {
        const r = el.getBoundingClientRect();
        const dist = Math.abs((r.top + r.bottom) / 2 - mid);
        if (dist < minDist) { minDist = dist; closest = num; }
      });
      setCurrentPage(closest);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [numPages]);

  const scrollToPage = (num: number) => {
    const el = pageElemsRef.current.get(num);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clampedScale = Math.max(0.5, Math.min(4, scale));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 16px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-card)",
        flexShrink: 0,
        flexWrap: "wrap",
        minHeight: 48,
      }}>
        <Link
          href="/library"
          style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", flexShrink: 0 }}
        >
          ← Library
        </Link>

        <p style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, margin: 0 }}>
          {article.title}
        </p>

        {numPages > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="btn-ghost"
              style={{ padding: "4px 10px", lineHeight: 1 }}
            >‹</button>
            <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 70, textAlign: "center" }}>
              {currentPage} / {numPages}
            </span>
            <button
              onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
              className="btn-ghost"
              style={{ padding: "4px 10px", lineHeight: 1 }}
            >›</button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => setScale((s) => Math.max(0.5, parseFloat((s - 0.2).toFixed(1))))}
            className="btn-ghost"
            style={{ padding: "4px 10px", lineHeight: 1 }}
            title="Zoom out"
          >−</button>
          <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 46, textAlign: "center" }}>
            {Math.round(clampedScale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(4, parseFloat((s + 0.2).toFixed(1))))}
            className="btn-ghost"
            style={{ padding: "4px 10px", lineHeight: 1 }}
            title="Zoom in"
          >+</button>
        </div>
      </div>

      {/* PDF scroll area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: "auto",
          background: "#525659",
          padding: "20px 0",
          scrollBehavior: "smooth",
        }}
      >
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 120, gap: 16 }}>
            <div className="spinner" style={{ width: 32, height: 32, borderColor: "rgba(255,255,255,0.2)", borderTopColor: "#fff" }} />
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Loading PDF…</p>
          </div>
        ) : error ? (
          <div style={{ color: "#fff", textAlign: "center", paddingTop: 120, padding: "120px 24px 24px" }}>
            <p style={{ fontSize: 32, marginBottom: 16 }}>📄</p>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Failed to load PDF</p>
            <p style={{ fontSize: 13, opacity: 0.65 }}>{error}</p>
            {article.fileUrl && (
              <a
                href={article.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-block", marginTop: 20, color: "#90CAF9", fontSize: 13 }}
              >
                Open file directly ↗
              </a>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingBottom: 40 }}>
            {Array.from({ length: numPages }, (_, i) => i + 1).map((num) => (
              <div
                key={num}
                data-page={num}
                ref={(el) => {
                  if (el) pageElemsRef.current.set(num, el);
                  else pageElemsRef.current.delete(num);
                }}
                style={{
                  background: "#fff",
                  boxShadow: "0 2px 16px rgba(0,0,0,0.5)",
                  borderRadius: 2,
                  width: "min(92vw, 840px)",
                  minHeight: 400,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Placeholder while loading */}
                <div style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(0,0,0,0.25)",
                  fontSize: 13,
                  pointerEvents: "none",
                }}>
                  Page {num}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
