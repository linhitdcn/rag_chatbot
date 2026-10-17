import { describe, expect, it } from "vitest";
import { chunkText } from "@/lib/ingest/chunk";

describe("chunkText", () => {
  it("returns nothing for blank input", () => {
    expect(chunkText("  \n\n ")).toEqual([]);
  });

  it("keeps short text as a single chunk and records the page", () => {
    expect(chunkText("short text", 3)).toEqual([{ content: "short text", page: 3, tokenCount: 3 }]);
  });

  it("splits long text into bounded chunks without losing content", () => {
    const sentence = "Shipping takes three to five business days within the country.";
    const text = Array.from({ length: 80 }, (_, i) => `${sentence} #${i}`).join(" ");
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) expect(c.content.length).toBeLessThanOrEqual(1100);
    const joined = chunks.map((c) => c.content).join(" ");
    for (const i of [0, 40, 79]) expect(joined).toContain(`#${i}`);
  });

  it("hard-splits text that has no separators at all", () => {
    const chunks = chunkText("x".repeat(5000));
    expect(chunks.length).toBeGreaterThan(4);
    expect(chunks.every((c) => c.content.length <= 1100)).toBe(true);
  });
});
