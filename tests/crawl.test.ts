import { describe, expect, it } from "vitest";
import { crawl } from "@/lib/ingest/crawl";

describe("crawl SSRF guard", () => {
  it.each([
    "http://127.0.0.1:3000",
    "http://localhost",
    "http://169.254.169.254/latest/meta-data",
    "http://10.0.0.5/",
    "http://192.168.1.1/",
    "http://[::1]/",
  ])("blocks %s", async (url) => {
    await expect(crawl(url, 1)).rejects.toThrow(/publicly reachable/);
  });

  it("rejects non-http schemes", async () => {
    await expect(crawl("file:///etc/passwd", 1)).rejects.toThrow(/http/);
  });
});
