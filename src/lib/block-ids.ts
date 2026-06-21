import { JSDOM } from "jsdom";

const BLOCK_SELECTOR = "p,li,h1,h2,h3,h4,h5,h6,blockquote,pre";

export function assignBlockIds(html: string): string {
  const dom = new JSDOM(html);
  let i = 0;
  dom.window.document.querySelectorAll(BLOCK_SELECTOR).forEach((el) => {
    el.setAttribute("data-block-id", `b${i++}`);
  });
  return dom.window.document.body.innerHTML;
}
