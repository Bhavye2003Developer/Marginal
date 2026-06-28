import { Readability } from "@mozilla/readability";
import { Window as HappyWindow } from "happy-dom";

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

  const win = new HappyWindow({
    url: effectiveUrl,
    settings: { disableJavaScriptEvaluation: true, disableCSSFileLoading: true },
  });
  let article: ReturnType<Readability["parse"]>;
  try {
    // Server-side only: JS evaluation disabled, DOM never rendered to browser.
    // Readability strips scripts/styles from extracted content.
    const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
    const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
    win.document.head.innerHTML = head;
    win.document.body.innerHTML = body;
    article = new Readability(win.document as unknown as Document).parse();
  } finally {
    win.close();
  }

  if (!article) throw new Error("Could not extract article content from this page");

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
    // If HTTPS fails due to SSL cert mismatch (e.g. GitHub Pages custom domains),
    // retry over plain HTTP — no cert to verify, no MITM risk added.
    if (isSslError(err) && url.startsWith("https://")) {
      const httpUrl = url.replace(/^https:\/\//, "http://");
      try {
        return { ...(await doFetch(httpUrl)), effectiveUrl: httpUrl };
      } catch {
        // fall through to original error
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

// Regex-based: rewrites relative img src to absolute, promotes data-src → src for lazy-loaded images.
function resolveImageUrls(html: string, baseUrl: string): string {
  // Step 1: resolve relative src to absolute
  let out = html.replace(
    /(<img[^>]*?\s)(src)(\s*=\s*)(["'])([^"']*)\4/gi,
    (m, pre, attr, eq, q, src) => {
      try { return `${pre}${attr}${eq}${q}${new URL(src, baseUrl).href}${q}`; }
      catch { return m; }
    }
  );
  // Step 2: for img elements without src, promote data-src → src so lazy images display
  out = out.replace(/<img([^>]*)>/gi, (m, attrs) => {
    if (/\bsrc\s*=/.test(attrs)) return m; // already has src, skip
    const dsMatch = attrs.match(/\bdata-src\s*=\s*(["'])([^"']*)\1/i);
    if (!dsMatch) return m;
    try {
      const abs = new URL(dsMatch[2], baseUrl).href;
      return `<img${attrs} src="${abs}">`;
    } catch { return m; }
  });
  return out;
}

function extractImages(
  html: string,
  baseUrl: string
): Array<{ originalUrl: string; cachedUrl: null }> {
  const images: Array<{ originalUrl: string; cachedUrl: null }> = [];
  const regex = /<img[^>]+src=(["'])([^"']+)\1[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    try { images.push({ originalUrl: new URL(m[2], baseUrl).href, cachedUrl: null }); }
    catch {}
  }
  return images;
}
