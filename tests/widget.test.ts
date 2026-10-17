import { describe, expect, it } from "vitest";
import { isHostAllowed, resolveWidget, widgetSchema } from "@/lib/validations/widget";

describe("isHostAllowed", () => {
  it("allows everything when there is no allow-list", () => {
    expect(isHostAllowed("anything.com", [])).toBe(true);
  });
  it("matches the domain and its subdomains, but not look-alikes", () => {
    const list = ["acme.com"];
    expect(isHostAllowed("acme.com", list)).toBe(true);
    expect(isHostAllowed("shop.acme.com", list)).toBe(true);
    expect(isHostAllowed("acme.com:8443", list)).toBe(true);
    expect(isHostAllowed("evilacme.com", list)).toBe(false);
    expect(isHostAllowed("acme.com.evil.io", list)).toBe(false);
  });
  it("supports wildcard entries", () => {
    expect(isHostAllowed("a.b.acme.com", ["*.acme.com"])).toBe(true);
  });
});

describe("widget settings", () => {
  const bot = { name: "Helper", welcomeMessage: "Hi!" };
  it("fills defaults from the bot", () => {
    const w = resolveWidget({}, bot);
    expect(w).toMatchObject({ title: "Helper", welcome: "Hi!", position: "right", poweredBy: true, domains: [] });
  });
  it("ignores invalid stored values instead of crashing", () => {
    expect(resolveWidget({ color: "red", domains: ["not a domain"] }, bot).color).toBe("#4f46e5");
    expect(resolveWidget("garbage", bot).title).toBe("Helper");
  });
  it("rejects bad input", () => {
    const base = resolveWidget({}, bot);
    expect(widgetSchema.safeParse({ ...base, color: "#12" }).success).toBe(false);
    expect(widgetSchema.safeParse({ ...base, domains: ["javascript:alert(1)"] }).success).toBe(false);
    expect(widgetSchema.safeParse({ ...base, domains: ["example.com", "localhost:3000"] }).success).toBe(true);
  });
});
