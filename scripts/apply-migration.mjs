#!/usr/bin/env node
// One-off migration runner. Reads POSTGRES_URL_NON_POOLING from .env.local,
// connects direct (non-pooled — required for DDL), executes the SQL file
// passed as argv[2]. Exits 0 on success, non-zero on any error.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

function loadDotenvLocal() {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (process.env[key] !== undefined) continue;
    let val = raw;
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[key] = val;
  }
}

async function main() {
  loadDotenvLocal();
  const sqlPath = process.argv[2];
  if (!sqlPath) {
    console.error("usage: node scripts/apply-migration.mjs <sql-file>");
    process.exit(2);
  }
  const sql = readFileSync(resolve(process.cwd(), sqlPath), "utf8");
  const connString = process.env.POSTGRES_URL_NON_POOLING;
  if (!connString) {
    console.error("POSTGRES_URL_NON_POOLING not set");
    process.exit(2);
  }
  const sanitized = connString.replace(/[?&]sslmode=[^&]*/g, "");
  const client = new pg.Client({
    connectionString: sanitized,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`applied: ${sqlPath}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
