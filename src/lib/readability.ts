import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

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

  // Inject <base> so linkedom resolves relative links correctly.
  const { document } = parseHTML(injectBase(html, effectiveUrl));
  const article = new Readability(document as unknown as Document).parse();
  if (!article) throw new Error("Could not extract article content from this page");

  const content = resolveImageUrls(article.content ?? "", effectiveUrl);
  const images = extractImages(content, effectiveUrl);
  return { title: article.title ?? "", content, images };
}

function injectBase(html: string, baseUrl: string): string {
  // Prepend <base> inside <head> so relative URLs resolve against effectiveUrl.
  const tag = `<base href="${baseUrl}">`;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + tag);
  return tag + html;
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
  return { status: res.status, contentType, html, effectiveUrl: url };
}

function isSslError(err: unknown): boolean {
  const e = err as { message?: string; cause?: { message?: string; code?: string } };
  const text =
    `${e.message ?? ""} ${e.cause?.message ?? ""} ${e.cause?.code ?? ""}`.toLowerCase();
  return /cert|ssl|tls|altname|principal|verify|handshake|pkix|x509/.test(text);
}

// Rewrites relative img src/data-src to absolute using the effective fetch URL.
function resolveImageUrls(html: string, baseUrl: string): string {
  const { document } = parseHTML(html);
  document.querySelectorAll("img").forEach((img: Element) => {
    const src = img.getAttribute("src");
    if (src) {
      try { img.setAttribute("src", new URL(src, baseUrl).href); } catch {}
    }
    const dataSrc = img.getAttribute("data-src");
    if (dataSrc) {
      try { img.setAttribute("data-src", new URL(dataSrc, baseUrl).href); } catch {}
    }
  });
  return (document as unknown as Document).body?.innerHTML ?? html;
}

function extractImages(
  html: string,
  baseUrl: string
): Array<{ originalUrl: string; cachedUrl: null }> {
  const { document } = parseHTML(html);
  return Array.from(document.querySelectorAll("img"))
    .map((img: Element) => {
      const src = img.getAttribute("src");
      if (!src) return null;
      try { return new URL(src, baseUrl).href; } catch { return null; }
    })
    .filter((src): src is string => Boolean(src))
    .map((src) => ({ originalUrl: src, cachedUrl: null }));
}
