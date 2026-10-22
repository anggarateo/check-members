import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

export function createPool() {
  // Scripts run migrations and transactions, so prefer the direct (unpooled) connection.
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env.local first.");
    process.exit(1);
  }
  return new Pool({ connectionString: url, connectionTimeoutMillis: 15_000 });
}
