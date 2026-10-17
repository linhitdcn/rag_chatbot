import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { parseHtml, type ExtractedPage } from "./extract";

const MAX_BYTES = 3_000_000;
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 4;

function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateIp(mapped[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

/** Rejects non-http(s) URLs and hosts that resolve to private/loopback/link-local addresses (SSRF guard). */
async function assertPublicUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http(s) URLs can be crawled");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
    throw new Error("That address isn't publicly reachable");
  }
  return url;
}

/** fetch() with the SSRF check re-applied on every redirect hop, a timeout and a body size cap. */
async function safeFetch(raw: string): Promise<{ url: string; type: string; body: string }> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url, {
      redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "KnowledgeDeskBot/1.0 (+https://knowledgedesk.app)", accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, url).toString();
      continue;
    }
    if (!res.ok) throw new Error(`Request failed with status ${res.status}${res.status === 403 ? ": the site blocked our crawler." : ""}`);
    const reader = res.body?.getReader();
    if (!reader) return { url: url.toString(), type: res.headers.get("content-type") ?? "", body: "" };
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) { await reader.cancel(); break; }
      chunks.push(value);
    }
    return { url: url.toString(), type: res.headers.get("content-type") ?? "", body: new TextDecoder().decode(Buffer.concat(chunks)) };
  }
  throw new Error("Too many redirects");
}

const normalize = (u: URL) => { u.hash = ""; return u.toString().replace(/\/$/, ""); };

/** Crawls a page, sitemap or site section (same host, breadth-first) and returns each page's text. */
export async function crawl(startUrl: string, maxPages: number): Promise<ExtractedPage[]> {
  const first = await safeFetch(startUrl);
  const pages: ExtractedPage[] = [];
  const seen = new Set<string>();
  const queue: string[] = [];

  if (/xml/.test(first.type) || /<urlset|<sitemapindex/i.test(first.body.slice(0, 2000))) {
    for (const m of first.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) queue.push(m[1]);
  } else {
    queue.push(first.url);
  }
  const origin = new URL(first.url).origin;

  while (queue.length && pages.length < maxPages) {
    const next = queue.shift()!;
    let key: string;
    try { key = normalize(new URL(next)); } catch { continue; }
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const res = key === normalize(new URL(first.url)) && first.body ? first : await safeFetch(key);
      if (!/html|text\/plain/.test(res.type) && res.type) continue;
      const { title, text, links } = parseHtml(res.body);
      if (text.length > 80) pages.push({ text: `${title ? `${title}\n\n` : ""}${text}` });
      // Only follow links when starting from a normal page (sitemaps already list the URLs).
      if (queue.length < maxPages * 3) {
        for (const href of links) {
          try {
            const link = new URL(href, res.url);
            if (link.origin === origin && !/\.(png|jpe?g|gif|svg|webp|pdf|zip|css|js)$/i.test(link.pathname)) queue.push(link.toString());
          } catch { /* ignore malformed href */ }
        }
      }
    } catch (e) {
      // A page failing is fine if we collected others; the first page failing is a real error.
      if (pages.length === 0 && seen.size === 1) throw e;
    }
  }
  if (pages.length === 0) throw new Error("No readable text found at that URL");
  return pages;
}
