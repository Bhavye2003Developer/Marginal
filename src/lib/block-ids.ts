import { Window as HappyWindow } from "happy-dom";

const BLOCK_SELECTOR = "p,li,h1,h2,h3,h4,h5,h6,blockquote,pre";

export function assignBlockIds(html: string): string {
  const win = new HappyWindow({ settings: { disableJavaScriptEvaluation: true } });
  try {
    win.document.body.innerHTML = html;
    let i = 0;
    win.document.querySelectorAll(BLOCK_SELECTOR).forEach((el) => {
      el.setAttribute("data-block-id", `b${i++}`);
    });
    return win.document.body?.innerHTML ?? html;
  } finally {
    win.close();
  }
}
