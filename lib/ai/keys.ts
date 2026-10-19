import { decrypt } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

import { PROVIDERS, type Provider } from "./providers";

export type { Provider };

/** AAD that ties a ciphertext to its (workspace, provider) row, so it can't be moved to another row. */
export const keyContext = (workspaceId: string, provider: Provider) => `${workspaceId}:${provider}`;

/**
 * Resolves the API key for a provider: the workspace's own (decrypted) key first, then the server's
 * environment key as a platform default. Returns null when neither exists.
 */
export async function getProviderKey(workspaceId: string, provider: Provider): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("provider_keys").select("ciphertext").eq("workspace_id", workspaceId).eq("provider", provider).maybeSingle<{ ciphertext: string }>();
  if (data) {
    try {
      return decrypt(data.ciphertext, keyContext(workspaceId, provider));
    } catch {
      throw new Error(`The saved ${provider} key can't be decrypted. Re-enter it in Settings → API Keys.`);
    }
  }
  return process.env[PROVIDERS[provider].envKey]?.trim() || null;
}
