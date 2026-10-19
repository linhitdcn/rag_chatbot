import { APICallError, RetryError } from "ai";
import { describe, expect, it } from "vitest";
import { adminMessage, classifyError, VISITOR_ERROR } from "@/lib/chat/errors";

const apiError = (statusCode: number, message: string) =>
  new APICallError({ message, url: "https://x", requestBodyValues: {}, statusCode });

describe("classifyError", () => {
  it("recognises rate limits by status or message", () => {
    expect(classifyError(apiError(429, "Too Many Requests")).kind).toBe("rate_limit");
    expect(classifyError(new Error("You exceeded your current quota")).kind).toBe("rate_limit");
    expect(classifyError(new Error("RESOURCE_EXHAUSTED")).kind).toBe("rate_limit");
  });
  it("unwraps the SDK's retry wrapper", () => {
    const wrapped = new RetryError({ message: "Failed after 3 attempts", reason: "maxRetriesExceeded", errors: [apiError(429, "rate limit")] });
    expect(classifyError(wrapped).kind).toBe("rate_limit");
  });
  it("separates auth, provider and other failures", () => {
    expect(classifyError(apiError(401, "Incorrect API key")).kind).toBe("auth");
    expect(classifyError(new Error("No Google Gemini API key is configured")).kind).toBe("auth");
    expect(classifyError(apiError(503, "overloaded")).kind).toBe("provider");
    expect(classifyError(new Error("boom")).kind).toBe("error");
  });
});

describe("messages", () => {
  it("tells admins which model to switch away from, and tells visitors nothing internal", () => {
    const msg = adminMessage(classifyError(apiError(429, "x")), "google", "gemini-2.5-flash");
    expect(msg).toContain("Google Gemini");
    expect(msg).toContain("gemini-2.5-flash");
    expect(msg).toMatch(/switch/i);
    expect(VISITOR_ERROR).not.toMatch(/google|gemini|rate|quota/i);
  });
});
