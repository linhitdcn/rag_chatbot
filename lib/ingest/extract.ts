import * as cheerio from "cheerio";

export interface ExtractedPage {
  text: string;
  page?: number;
}

export const MAX_CHARS = 2_000_000;

export function extensionOf(name: string) {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i).toLowerCase();
}

/** Visible text of an HTML document plus its same-page links. */
export function parseHtml(html: string) {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, footer, header, form, svg, iframe").remove();
  const title = $("title").first().text().trim();
  const root = $("main").length ? $("main") : $("body");
  const text = root.text().replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
  const links = $("a[href]").map((_, a) => $(a).attr("href") ?? "").get();
  return { title, text, links };
}

function csvToText(raw: string) {
  const [header, ...rows] = raw.split(/\r?\n/).filter((l) => l.trim());
  if (!header) return "";
  const cols = header.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  return rows
    .map((row) => {
      const cells = row.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      return cols.map((c, i) => `${c}: ${cells[i] ?? ""}`).join("; ");
    })
    .join("\n");
}

/** Extracts plain text (page-aware for PDFs) from an uploaded document. */
export async function extractFile(name: string, data: Uint8Array): Promise<ExtractedPage[]> {
  const ext = extensionOf(name);
  switch (ext) {
    case ".pdf": {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(data);
      const { text } = await extractText(pdf, { mergePages: false });
      return text.map((t, i) => ({ text: t, page: i + 1 }));
    }
    case ".docx": {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(data) });
      return [{ text: value }];
    }
    case ".txt":
    case ".md":
      return [{ text: new TextDecoder().decode(data) }];
    case ".csv":
      return [{ text: csvToText(new TextDecoder().decode(data)) }];
    default:
      throw new Error(`Unsupported file type "${ext || name}"`);
  }
}
