import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

/** 32-byte key from ENCRYPTION_KEY: accepts 64 hex chars or base64 of 32 bytes; anything else is hashed. */
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("ENCRYPTION_KEY is not set, so API keys can't be stored securely.");
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  const b64 = Buffer.from(raw, "base64");
  if (b64.length === 32) return b64;
  if (raw.length < 16) throw new Error("ENCRYPTION_KEY is too short (use at least 32 random characters).");
  return createHash("sha256").update(raw).digest();
}

/** AES-256-GCM. Output: `v1.<iv>.<tag>.<ciphertext>` (base64url). `context` binds the ciphertext to its row. */
export function encrypt(plaintext: string, context: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  cipher.setAAD(Buffer.from(context));
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function decrypt(payload: string, context: string): string {
  const [version, iv, tag, ct] = payload.split(".");
  if (version !== VERSION || !iv || !tag || !ct) throw new Error("Unrecognized ciphertext format");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}
