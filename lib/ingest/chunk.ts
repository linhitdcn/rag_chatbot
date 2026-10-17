export interface TextChunk {
  content: string;
  page?: number;
  tokenCount: number;
}

const TARGET = 900; // characters (~225 tokens)
const OVERLAP = 120;
const SEPARATORS = ["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " "];

export const approxTokens = (text: string) => Math.ceil(text.length / 4);

/** Splits on the coarsest separator that keeps pieces under the target size. */
function split(text: string, level = 0): string[] {
  if (text.length <= TARGET) return [text];
  const sep = SEPARATORS[level];
  if (sep === undefined) {
    const out: string[] = [];
    for (let i = 0; i < text.length; i += TARGET) out.push(text.slice(i, i + TARGET));
    return out;
  }
  const parts = text.split(sep);
  if (parts.length === 1) return split(text, level + 1);
  return parts.flatMap((p, i) => split(i < parts.length - 1 ? p + sep : p, level + 1));
}

/** Greedily packs small pieces into ~TARGET sized chunks, carrying a short overlap between them. */
export function chunkText(text: string, page?: number): TextChunk[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  const chunks: TextChunk[] = [];
  let current = "";
  const flush = () => {
    const content = current.trim();
    if (content) chunks.push({ content, page, tokenCount: approxTokens(content) });
  };
  for (const piece of split(clean)) {
    if (current && current.length + piece.length > TARGET) {
      flush();
      current = current.slice(-OVERLAP).replace(/^\S*\s/, "") + piece;
    } else {
      current += piece;
    }
  }
  flush();
  return chunks;
}
