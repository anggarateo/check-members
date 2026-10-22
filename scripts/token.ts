/**
 * Manage access tokens.
 *
 *   npm run token -- create "WA Group Batch 2020" --days 30
 *   npm run token -- list
 *   npm run token -- revoke 3
 */
import { parseArgs } from "node:util";
import { createToken, hashToken } from "../src/lib/token";
import { createPool } from "./_env";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { days: { type: "string" } },
});
const [command, arg] = positionals;
const pool = createPool();

async function main() {
  switch (command) {
    case "create": {
      if (!arg) throw new Error('Give a label, e.g. npm run token -- create "Committee" --days 30');
      const days = values.days ? Number(values.days) : null;
      if (days !== null && !(days > 0)) throw new Error("--days must be a number > 0");

      const token = createToken();
      const { rows } = await pool.query(
        `INSERT INTO access_tokens (token_hash, label, expires_at)
         VALUES ($1, $2, CASE WHEN $3::int IS NULL THEN NULL ELSE now() + make_interval(days => $3::int) END)
         RETURNING id, expires_at`,
        [hashToken(token), arg, days],
      );
      const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
      console.log(`Token #${rows[0].id} "${arg}" created${rows[0].expires_at ? `, valid until ${rows[0].expires_at.toISOString()}` : ""}.`);
      console.log(`Link (shown only once, save it now):\n  ${base}/access/${token}`);
      break;
    }
    case "list": {
      const { rows } = await pool.query(
        `SELECT id, label, created_at, expires_at, revoked_at, last_used_at FROM access_tokens ORDER BY id`,
      );
      console.table(
        rows.map((r) => ({
          id: r.id,
          label: r.label,
          status: r.revoked_at ? "revoked" : r.expires_at && r.expires_at < new Date() ? "expired" : "active",
          valid_until: r.expires_at?.toISOString().slice(0, 10) ?? "-",
          last_used: r.last_used_at?.toISOString().slice(0, 16) ?? "-",
        })),
      );
      break;
    }
    case "revoke": {
      const id = Number(arg);
      if (!Number.isInteger(id)) throw new Error("Give a token id, e.g. npm run token -- revoke 3");
      const res = await pool.query("UPDATE access_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL", [id]);
      console.log(res.rowCount ? `Token #${id} revoked.` : `Token #${id} not found or already revoked.`);
      break;
    }
    default:
      console.log("Commands: create <label> [--days N] | list | revoke <id>");
  }
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
