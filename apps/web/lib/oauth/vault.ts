import { createServiceClient } from "@/lib/supabase/service";

/**
 * Store a secret in Supabase Vault (encrypted at rest).
 * Returns the UUID to use as a token ref in platform_connections.
 * Uses the service-role client — server-side only.
 */
export async function vaultStore(secret: string, name?: string): Promise<string> {
  const db = createServiceClient();
  const { data, error } = await db.rpc("vault_create_secret", {
    p_secret: secret,
    p_name: name,
  });
  if (error) throw new Error(`Vault store failed: ${error.message}`);
  return data as string;
}

/**
 * Read a decrypted secret from Supabase Vault by its UUID.
 */
export async function vaultRead(secretId: string): Promise<string> {
  const db = createServiceClient();
  const { data, error } = await db.rpc("vault_read_secret", {
    p_id: secretId,
  });
  if (error) throw new Error(`Vault read failed: ${error.message}`);
  return data as string;
}

/**
 * Replace the value of an existing Vault secret.
 */
export async function vaultUpdate(secretId: string, newSecret: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db.rpc("vault_update_secret", {
    p_id: secretId,
    p_secret: newSecret,
  });
  if (error) throw new Error(`Vault update failed: ${error.message}`);
}

/**
 * Permanently delete a secret from Supabase Vault.
 * Call this when a platform is disconnected.
 */
export async function vaultDelete(secretId: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db.rpc("vault_delete_secret", { p_id: secretId });
  if (error) throw new Error(`Vault delete failed: ${error.message}`);
}
