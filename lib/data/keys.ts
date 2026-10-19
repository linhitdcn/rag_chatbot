import { db, fail, getContext } from "./context";
import { PROVIDER_IDS, type Provider } from "@/lib/ai/providers";

export type KeyStatus = Record<Provider, { last4: string; updatedAt: string } | null>;

/** Which providers have a workspace key. Reads only the browser-safe columns (never the ciphertext). */
export async function getKeyStatus(): Promise<KeyStatus> {
  const status = Object.fromEntries(PROVIDER_IDS.map((p) => [p, null])) as KeyStatus;
  const ctx = await getContext();
  if (ctx.demo) return { ...status, google: { last4: "9f2c", updatedAt: "2026-10-10T00:00:00Z" } };
  const { data, error } = await db(ctx).from("provider_keys").select("provider, last4, updated_at")
    .returns<{ provider: Provider; last4: string; updated_at: string }[]>();
  fail(error, "Loading API keys");
  for (const r of data ?? []) status[r.provider] = { last4: r.last4, updatedAt: r.updated_at };
  return status;
}
