import "server-only";
import { pool } from "./db";
import { escapeLike, normalizeName } from "./normalize";

export type CheckResult =
  | { status: "registered"; name: string }
  | { status: "too_many" }
  | { status: "not_found" };

/**
 * Search a member by name.
 * - If exactly one name matches exactly, use it
 *   (so "Budi" can still be found even when "Budi Santoso" exists).
 * - Otherwise, look for names that contain the input. Take at most 2 rows:
 *   we only need to know "one" or "more than one", and we never send a list.
 */
export async function searchMember(input: string): Promise<CheckResult> {
  const q = normalizeName(input);

  const exact = await pool.query<{ name: string }>(
    "SELECT name FROM members WHERE search_name = $1 LIMIT 2",
    [q],
  );
  if (exact.rows.length === 1) return { status: "registered", name: exact.rows[0].name };

  const similar = await pool.query<{ name: string }>(
    "SELECT name FROM members WHERE search_name LIKE $1 ESCAPE '\\' LIMIT 2",
    [`%${escapeLike(q)}%`],
  );

  if (similar.rows.length === 0) return { status: "not_found" };
  if (similar.rows.length === 1) return { status: "registered", name: similar.rows[0].name };
  return { status: "too_many" };
}
