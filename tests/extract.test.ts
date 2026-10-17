import { describe, expect, it } from "vitest";
import { extensionOf, extractFile, parseHtml } from "@/lib/ingest/extract";

describe("extract", () => {
  it("reads the extension case-insensitively", () => {
    expect(extensionOf("Report.PDF")).toBe(".pdf");
    expect(extensionOf("noext")).toBe("");
  });
  it("turns CSV rows into labelled lines", async () => {
    const out = await extractFile("a.csv", new TextEncoder().encode("name,age\nBob,3\nAnn,4"));
    expect(out[0].text).toBe("name: Bob; age: 3\nname: Ann; age: 4");
  });
  it("rejects unsupported types", async () => {
    await expect(extractFile("a.exe", new Uint8Array())).rejects.toThrow(/Unsupported/);
  });
  it("strips navigation and scripts from HTML", () => {
    const { title, text, links } = parseHtml("<html><head><title>T</title></head><body><nav>menu</nav><script>evil()</script><main><p>Hello</p><a href='/x'>l</a></main></body></html>");
    expect(title).toBe("T");
    expect(text).toContain("Hello");
    expect(text).not.toContain("menu");
    expect(text).not.toContain("evil");
    expect(links).toEqual(["/x"]);
  });
});
