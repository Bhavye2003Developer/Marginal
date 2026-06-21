"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { Article, Highlight } from "@/lib/types";
import PdfHighlightOverlay from "./PdfHighlightOverlay";
import ColorPicker from "./ColorPicker";
import NotePopover from "./NotePopover";
import FocusMode from "./FocusMode";
import TagInput from "@/components/ui/TagInput";

interface SelectionState {
  page: number;
  text: string;
  rects: Array<{ x: number; y: number; width: number; height: number }>;
  screenRect: DOMRect;
}

interface Props {
  article: Article;
  highlights: Highlight[];
}

export default function PdfReader({ article, highlights: initial }: Props) {
  const [highlights, setHighlights] = useState<Highlight[]>(initial);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [tags, setTags] = useState<string[]>(article.tags);
  const [focusMode, setFocusMode] = useState(false);
  const [numPages, setNumPages] = useState(article.pageCount ?? 0);
  const [pageDims, setPageDims] = useState<Map<number, { width: number; height: number }>>(new Map());

  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pageWrapperRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!article.fileUrl) return;
    let cancelled = false;

    (async () => {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const pdf = await pdfjsLib.getDocument(article.fileUrl!).promise;
      if (cancelled) return;
      setNumPages(pdf.numPages);

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        if (cancelled) break;
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = canvasRefs.current.get(pageNum);
        if (!canvas) continue;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setPageDims((prev) => new Map(prev).set(pageNum, { width: viewport.width, height: viewport.height }));

        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Text layer — pdfjs-dist 3.11 uses textContentSource (not textContent)
        const textContent = await page.getTextContent();
        const wrapper = pageWrapperRefs.current.get(pageNum);
        if (!wrapper) continue;
        const existing = wrapper.querySelector(".pdf-text-layer") as HTMLDivElement | null;
        if (!existing) continue;
        existing.style.width = `${viewport.width}px`;
        existing.style.height = `${viewport.height}px`;
        existing.innerHTML = "";

        const { renderTextLayer } = pdfjsLib;
        if (renderTextLayer) {
          await renderTextLayer({
            textContentSource: textContent,
            container: existing,
            viewport,
            textDivs: [],
          }).promise;
        }
      }
    })();

    return () => { cancelled = true; };
  }, [article.fileUrl]);

  const handlePageMouseUp = useCallback((pageNum: number) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const wrapper = pageWrapperRefs.current.get(pageNum);
    const dims = pageDims.get(pageNum);
    if (!wrapper || !dims) return;

    const containerRect = wrapper.getBoundingClientRect();
    const clientRects = Array.from(range.getClientRects()).map((r) => ({
      x: (r.left - containerRect.left) / dims.width,
      y: (r.top - containerRect.top) / dims.height,
      width: r.width / dims.width,
      height: r.height / dims.height,
    }));

    if (clientRects.length === 0) return;
    setSelection({
      page: pageNum,
      text: sel.toString(),
      rects: clientRects,
      screenRect: range.getBoundingClientRect(),
    });
  }, [pageDims]);

  async function saveHighlight(color: "yellow" | "green" | "blue" | "pink") {
    if (!selection) return;
    const res = await fetch("/api/highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        articleId: article._id.toString(),
        color,
        text: selection.text,
        anchor: { blockId: null, startOffset: null, endOffset: null, page: selection.page, rects: selection.rects },
      }),
    });
    if (!res.ok) { console.error("Failed to save highlight", res.status); return; }
    const h = await res.json();
    setHighlights((prev) => [...prev, h]);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  async function saveNote(id: string, note: string | null) {
    const res = await fetch(`/api/highlights/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) { console.error("Failed to save note", res.status); setActiveHighlight(null); return; }
    const updated = await res.json();
    setHighlights((prev) => prev.map((h) => (h._id.toString() === id ? updated : h)));
    setActiveHighlight(null);
  }

  async function deleteHighlight(id: string) {
    const res = await fetch(`/api/highlights/${id}`, { method: "DELETE" });
    if (!res.ok) { console.error("Failed to delete highlight", res.status); return; }
    setHighlights((prev) => prev.filter((h) => h._id.toString() !== id));
    setActiveHighlight(null);
  }

  async function saveTags(newTags: string[]) {
    const prev = tags;
    setTags(newTags);
    const res = await fetch(`/api/articles/${article._id.toString()}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
    if (!res.ok) { console.error("Failed to save tags", res.status); setTags(prev); }
  }

  return (
    <FocusMode active={focusMode} onToggle={() => setFocusMode((v) => !v)}>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{article.title}</h1>
          <p className="text-sm text-gray-500">{article.sourceUrl} · {numPages} pages</p>
          <div className="mt-2">
            <TagInput tags={tags} onChange={saveTags} />
          </div>
        </div>

        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
          const dims = pageDims.get(pageNum);
          return (
            <div
              key={pageNum}
              ref={(el) => { if (el) pageWrapperRefs.current.set(pageNum, el); }}
              className="relative mb-6 shadow-md inline-block"
              style={{ width: dims?.width ?? "auto" }}
              onMouseUp={() => handlePageMouseUp(pageNum)}
            >
              <canvas
                ref={(el) => { if (el) canvasRefs.current.set(pageNum, el); }}
              />
              <div
                className="pdf-text-layer"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  userSelect: "text",
                  pointerEvents: "all",
                  overflow: "hidden",
                }}
              />
              {dims && (
                <PdfHighlightOverlay
                  highlights={highlights}
                  page={pageNum}
                  pageWidth={dims.width}
                  pageHeight={dims.height}
                  onHighlightClick={setActiveHighlight}
                />
              )}
            </div>
          );
        })}

        {selection && (
          <ColorPicker rect={selection.screenRect} onSelect={saveHighlight} onDismiss={() => setSelection(null)} />
        )}
        {activeHighlight && (
          <NotePopover
            highlight={activeHighlight}
            onSave={(note) => saveNote(activeHighlight._id.toString(), note)}
            onDelete={() => deleteHighlight(activeHighlight._id.toString())}
            onClose={() => setActiveHighlight(null)}
          />
        )}
      </main>
    </FocusMode>
  );
}
