import { createHash, randomBytes } from "node:crypto";

export const ACCESS_COOKIE = "access";

export function createToken(): string {
  // 32 random bytes = 256 bits, strong enough that a plain SHA-256 hash is safe.
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Token format: 43 base64url characters. Reject early, before touching the DB. */
export function isValidTokenFormat(token: string | undefined): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}
