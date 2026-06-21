import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export interface ExtractedArticle {
  title: string;
  content: string;
  images: Array<{ originalUrl: string; cachedUrl: null }>;
}

export async function extractArticle(url: string): Promise<ExtractedArticle> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Marginal/1.0)" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  if (!article) throw new Error("Readability could not parse article");
  const content = article.content ?? "";
  const images = extractImages(content, url);
  return { title: article.title ?? "", content, images };
}

function extractImages(
  html: string,
  baseUrl: string
): Array<{ originalUrl: string; cachedUrl: null }> {
  const dom = new JSDOM(html, { url: baseUrl });
  return Array.from(dom.window.document.querySelectorAll("img"))
    .map((img) => img.src)
    .filter(Boolean)
    .map((src) => ({ originalUrl: src, cachedUrl: null }));
}
