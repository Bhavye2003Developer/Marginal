import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export interface ExtractedArticle {
  title: string;
  content: string;
  images: Array<{ originalUrl: string; cachedUrl: null }>;
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

export async function extractArticle(url: string): Promise<ExtractedArticle> {
  const { status, contentType, html, effectiveUrl } = await fetchPage(url);

  if (status < 200 || status >= 300) {
    throw new Error(`Site returned ${status}`);
  }

  if (!contentType.includes("html")) {
    throw new Error(
      `URL does not point to an HTML page (content-type: ${contentType.split(";")[0].trim() || "unknown"})`
    );
  }

  // Parse with the effective URL as base so JSDOM resolves relative paths correctly.
  const dom = new JSDOM(html, { url: effectiveUrl });
  const article = new Readability(dom.window.document).parse();
  if (!article) throw new Error("Could not extract article content from this page");
  // Resolve img src to absolute using effectiveUrl (may be http:// if we fell back).
  const content = resolveImageUrls(article.content ?? "", effectiveUrl);
  const images = extractImages(content, effectiveUrl);
  return { title: article.title ?? "", content, images };
}

interface PageResult {
  status: number;
  contentType: string;
  html: string;
  effectiveUrl: string;
}

async function fetchPage(url: string): Promise<PageResult> {
  try {
    return { ...(await doFetch(url)), effectiveUrl: url };
  } catch (err: unknown) {
    // If HTTPS fails due to SSL cert mismatch (common with GitHub Pages custom
    // domains), retry over plain HTTP — no cert to verify, no MITM risk added.
    // Using the HTTP effectiveUrl also makes image src attributes use http://,
    // so the browser can load them without hitting the same SSL error.
    if (isSslError(err) && url.startsWith("https://")) {
      const httpUrl = url.replace(/^https:\/\//, "http://");
      try {
        return { ...(await doFetch(httpUrl)), effectiveUrl: httpUrl };
      } catch {
        // fall through to the original error message
      }
    }
    const msg = err instanceof Error ? err.message : "network error";
    throw new Error(`Could not reach URL: ${msg}`);
  }
}

async function doFetch(url: string): Promise<PageResult> {
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const contentType = res.headers.get("content-type") ?? "";
  const html = await res.text();
  return { status: res.status, contentType, html };
}

function isSslError(err: unknown): boolean {
  const e = err as { message?: string; cause?: { message?: string; code?: string } };
  const text =
    `${e.message ?? ""} ${e.cause?.message ?? ""} ${e.cause?.code ?? ""}`.toLowerCase();
  return /cert|ssl|tls|altname|principal|verify|handshake|pkix|x509/.test(text);
}

// Rewrites relative img src/srcset attributes to absolute URLs so images
// load correctly when content is rendered outside the original site's origin.
function resolveImageUrls(html: string, baseUrl: string): string {
  const dom = new JSDOM(html, { url: baseUrl });
  dom.window.document.querySelectorAll("img").forEach((img) => {
    if (img.src) img.setAttribute("src", img.src); // img.src is already resolved by JSDOM
    if (img.dataset.src) img.setAttribute("data-src", new URL(img.dataset.src, baseUrl).href);
  });
  return dom.window.document.body.innerHTML;
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
