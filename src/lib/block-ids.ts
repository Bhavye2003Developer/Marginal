import { Window as HappyWindow } from "happy-dom";

// Block-level elements that Readability or the source page may use
const BLOCK_SELECTOR = "p,li,h1,h2,h3,h4,h5,h6,blockquote,pre,td,th,dt,dd,figcaption";

export function assignBlockIds(html: string): string {
  const win = new HappyWindow({ settings: { disableJavaScriptEvaluation: true } });
  try {
    win.document.body.innerHTML = html;
    let i = 0;

    // Assign IDs to standard block elements
    win.document.querySelectorAll(BLOCK_SELECTOR).forEach((el) => {
      el.setAttribute("data-block-id", `b${i++}`);
    });

    // Also assign to <div> or <section> nodes that contain text directly
    // but have no block-element children (leaf text containers Readability sometimes emits)
    win.document.querySelectorAll("div,section").forEach((el) => {
      if (el.getAttribute("data-block-id")) return; // already assigned
      const hasBlockChild = el.querySelector(BLOCK_SELECTOR + ",div,section");
      const hasText = (el.textContent ?? "").trim().length > 0;
      if (!hasBlockChild && hasText) {
        el.setAttribute("data-block-id", `b${i++}`);
      }
    });

    return win.document.body?.innerHTML ?? html;
  } finally {
    win.close();
  }
}
