import { beforeAll, describe, expect, it } from "vitest";
import { decrypt, encrypt } from "@/lib/crypto";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "a-sufficiently-long-test-secret-value";
});

describe("crypto", () => {
  it("round-trips and never stores the plaintext", () => {
    const ct = encrypt("sk-secret-1234", "ws:openai");
    expect(ct).not.toContain("sk-secret");
    expect(decrypt(ct, "ws:openai")).toBe("sk-secret-1234");
  });

  it("uses a fresh IV each time", () => {
    expect(encrypt("same", "ctx")).not.toBe(encrypt("same", "ctx"));
  });

  it("rejects a ciphertext moved to another row (wrong context)", () => {
    expect(() => decrypt(encrypt("k", "ws1:openai"), "ws2:openai")).toThrow();
  });

  it("rejects tampered ciphertext", () => {
    const [v, iv, tag] = encrypt("k", "ctx").split(".");
    expect(() => decrypt([v, iv, tag, Buffer.from("tampered").toString("base64url")].join("."), "ctx")).toThrow();
  });

  it("fails clearly without a usable key", () => {
    const saved = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = "short";
    expect(() => encrypt("k", "ctx")).toThrow(/too short/);
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("k", "ctx")).toThrow(/not set/);
    process.env.ENCRYPTION_KEY = saved;
  });
});
