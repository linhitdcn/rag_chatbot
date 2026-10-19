import { describe, expect, it } from "vitest";
import { normalizeQuestion, sanitizeHistory } from "@/lib/chat/engine";
import { rateLimit } from "@/lib/chat/rate-limit";
import { MAX_HISTORY, MAX_MESSAGE_CHARS } from "@/lib/chat/types";

describe("sanitizeHistory", () => {
  it("rejects empty, malformed or assistant-last conversations", () => {
    expect(sanitizeHistory([])).toBeNull();
    expect(sanitizeHistory("hi")).toBeNull();
    expect(sanitizeHistory([{ role: "system", content: "x" }])).toBeNull();
    expect(sanitizeHistory([{ role: "user", content: 5 }])).toBeNull();
    expect(sanitizeHistory([{ role: "user", content: "a" }, { role: "assistant", content: "b" }])).toBeNull();
  });
  it("accepts a normal exchange", () => {
    expect(sanitizeHistory([{ role: "user", content: "a" }, { role: "assistant", content: "b" }, { role: "user", content: "c" }])).toHaveLength(3);
  });
  it("truncates long messages and caps history, always starting with a user turn", () => {
    const turns = Array.from({ length: 50 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "x".repeat(MAX_MESSAGE_CHARS + 50) }));
    turns.push({ role: "user", content: "last" });
    const out = sanitizeHistory(turns)!;
    expect(out.length).toBeLessThanOrEqual(MAX_HISTORY);
    expect(out[0].role).toBe("user");
    expect(out.every((t) => t.content.length <= MAX_MESSAGE_CHARS)).toBe(true);
  });
});

describe("rateLimit", () => {
  it("allows up to the limit within the window, then blocks", () => {
    const key = `t-${Math.random()}`;
    expect([1, 2, 3].map(() => rateLimit(key, 3, 60_000))).toEqual([true, true, true]);
    expect(rateLimit(key, 3, 60_000)).toBe(false);
    expect(rateLimit(`${key}-other`, 3, 60_000)).toBe(true);
  });
});

describe("normalizeQuestion", () => {
  it("ignores case, accents, punctuation and extra spaces", () => {
    expect(normalizeQuestion("  Hello!! ")).toBe("hello");
    expect(normalizeQuestion("Xin  chào, bạn?")).toBe("xin chao ban");
    expect(normalizeQuestion("Đây là gì")).toBe("day la gi");
  });
  it("returns an empty string for punctuation-only input", () => {
    expect(normalizeQuestion("?!")).toBe("");
  });
});
