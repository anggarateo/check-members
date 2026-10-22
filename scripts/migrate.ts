import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createPool } from "./_env";

const pool = createPool();
const sql = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");

pool
  .query(sql)
  .then(() => console.log("Migration finished."))
  .catch((err) => {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
