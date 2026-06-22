import { parseHTML } from "linkedom";

const BLOCK_SELECTOR = "p,li,h1,h2,h3,h4,h5,h6,blockquote,pre";

export function assignBlockIds(html: string): string {
  const { document } = parseHTML(html);
  let i = 0;
  document.querySelectorAll(BLOCK_SELECTOR).forEach((el: Element) => {
    el.setAttribute("data-block-id", `b${i++}`);
  });
  return (document as unknown as Document).body?.innerHTML ?? html;
}
