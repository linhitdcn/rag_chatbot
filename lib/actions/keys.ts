"use server";

import { revalidatePath } from "next/cache";
import { keyContext, type Provider } from "@/lib/ai/keys";
import { encrypt } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiKeySchema } from "@/lib/validations/settings";
import { authorize, err, ok, type ActionResult } from "./shared";

const PROVIDERS = ["openai", "anthropic"] as const;

/** Cheapest authenticated call per provider: list models. Resolves to an error message, or null when the key works. */
async function verifyKey(provider: Provider, key: string): Promise<string | null> {
  const req = provider === "openai"
    ? fetch("https://api.openai.com/v1/models?limit=1", { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) })
    : fetch("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": key, "anthropic-version": "2023-06-01" }, signal: AbortSignal.timeout(10_000) });
  try {
    const res = await req;
    if (res.ok) return null;
    if (res.status === 401 || res.status === 403) return "The provider rejected this key. Check that it's correct and active.";
    return `The provider returned an error (${res.status}). Try again in a moment.`;
  } catch {
    return "Couldn't reach the provider to verify the key. Try again in a moment.";
  }
}

export async function saveProviderKey(provider: Provider, key: string): Promise<ActionResult<{ last4: string }>> {
  if (!PROVIDERS.includes(provider)) return err("Unknown provider");
  const trimmed = key.trim();
  const parsed = apiKeySchema.safeParse({ key: trimmed });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid key");
  if (/\s/.test(trimmed)) return err("A key can't contain spaces");

  const auth = await authorize("owner");
  if ("error" in auth) return err(auth.error);
  const { ctx } = auth;
  const last4 = trimmed.slice(-4);
  if (ctx.demo) return ok({ last4 });

  const problem = await verifyKey(provider, trimmed);
  if (problem) return err(problem);

  let ciphertext: string;
  try {
    ciphertext = encrypt(trimmed, keyContext(ctx.workspace.id, provider));
  } catch (e) {
    return err(e instanceof Error ? e.message : "Couldn't encrypt the key");
  }
  const { error } = await createAdminClient().from("provider_keys")
    .upsert({ workspace_id: ctx.workspace.id, provider, ciphertext, last4, updated_at: new Date().toISOString() });
  if (error) return err(error.message);
  revalidatePath("/settings/api-keys");
  return ok({ last4 });
}

export async function removeProviderKey(provider: Provider): Promise<ActionResult> {
  if (!PROVIDERS.includes(provider)) return err("Unknown provider");
  const auth = await authorize("owner");
  if ("error" in auth) return err(auth.error);
  if (auth.ctx.demo) return ok();
  const { error } = await createAdminClient().from("provider_keys").delete().eq("workspace_id", auth.ctx.workspace.id).eq("provider", provider);
  if (error) return err(error.message);
  revalidatePath("/settings/api-keys");
  return ok();
}

/** Re-verifies the stored key against the provider (without ever sending it to the browser). */
export async function testProviderKey(provider: Provider): Promise<ActionResult> {
  if (!PROVIDERS.includes(provider)) return err("Unknown provider");
  const auth = await authorize("editor");
  if ("error" in auth) return err(auth.error);
  if (auth.ctx.demo) return ok();
  const { getProviderKey } = await import("@/lib/ai/keys");
  try {
    const key = await getProviderKey(auth.ctx.workspace.id, provider);
    if (!key) return err("No key is configured for this provider.");
    const problem = await verifyKey(provider, key);
    return problem ? err(problem) : ok();
  } catch (e) {
    return err(e instanceof Error ? e.message : "Couldn't test the key");
  }
}
