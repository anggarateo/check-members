import "server-only";
import { pool } from "./db";
import { hashToken, isValidTokenFormat } from "./token";

export type ActiveToken = { id: number; label: string; expiresAt: Date | null };

/** Return the token if it is still active (not revoked and not expired). */
export async function checkToken(token: string | undefined): Promise<ActiveToken | null> {
  if (!isValidTokenFormat(token)) return null;

  const { rows } = await pool.query<{ id: string; label: string; expires_at: Date | null }>(
    `UPDATE access_tokens
        SET last_used_at = now()
      WHERE token_hash = $1
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
      RETURNING id, label, expires_at`,
    [hashToken(token)],
  );

  const row = rows[0];
  return row ? { id: Number(row.id), label: row.label, expiresAt: row.expires_at } : null;
}
