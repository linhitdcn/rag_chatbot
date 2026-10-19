import { APICallError, RetryError } from "ai";
import { PROVIDERS, type Provider } from "@/lib/ai/providers";
import type { BotError } from "@/lib/types";

export type ChatErrorKind = BotError["kind"];

export interface ClassifiedError {
  kind: ChatErrorKind;
  status?: number;
  detail: string;
}

/** Sorts provider failures into the buckets an admin can act on. Unwraps the SDK's retry wrapper first. */
export function classifyError(error: unknown): ClassifiedError {
  const e = RetryError.isInstance(error) ? (error.lastError ?? error) : error;
  const detail = e instanceof Error ? e.message : "Something went wrong";
  const status = APICallError.isInstance(e) ? e.statusCode : undefined;

  if (status === 429 || /rate.?limit|quota|resource.?exhausted|too many requests/i.test(detail)) return { kind: "rate_limit", status, detail };
  if (status === 401 || status === 403 || /api key|unauthorized|permission denied|invalid.*key/i.test(detail) || /No .* API key is configured/.test(detail)) {
    return { kind: "auth", status, detail };
  }
  if (status !== undefined && status >= 500) return { kind: "provider", status, detail };
  return { kind: "error", status, detail };
}

/** Message for the dashboard (admins): names the provider/model and says what to do. */
export function adminMessage(c: ClassifiedError, provider: Provider, model: string) {
  const name = PROVIDERS[provider].name;
  switch (c.kind) {
    case "rate_limit": return `${name} rate limit reached for ${model}. Wait a moment, or switch this bot to another model or provider in its Model settings.`;
    case "auth": return c.detail.startsWith("No ") ? c.detail : `${name} rejected the API key. Check Settings → API Keys.`;
    case "provider": return `${name} is having problems (HTTP ${c.status}). Try again shortly or switch to another provider.`;
    default: return c.detail;
  }
}

/** Message for anonymous visitors: no internals, just an honest "try again". */
export const VISITOR_ERROR = "Sorry, I'm temporarily unavailable. Please try again in a moment.";
