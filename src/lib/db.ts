import "server-only";
import { Pool } from "pg";

// Keep the pool on globalThis so hot reload in dev does not open more and more connections.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

// Use the pooled Neon URL here (host contains "-pooler"). The pooler (pgbouncer)
// does not accept custom startup parameters, so the timeout is set on the client side.
export const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000, // close idle connections quickly; Neon may sleep when idle
    connectionTimeoutMillis: 10_000, // allow time for Neon to wake up from a cold start
    query_timeout: 5_000,
  });

// An idle connection can be closed by Neon. Log it instead of crashing the process.
pool.on("error", (err) => console.error("Unexpected database pool error", err.message));

if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;
