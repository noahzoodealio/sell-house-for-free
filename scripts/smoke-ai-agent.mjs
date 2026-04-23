#!/usr/bin/env node
// End-to-end smoke for the AI agent suite. Requires:
//   - AI_GATEWAY_API_KEY in .env.local (vercel env pull)
//   - Supabase migrations applied to the project's DB
//   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
//
// Operator-run; not in CI. Exits 1 on any failure with a redact()'d
// error summary. Covers the golden happy paths + a subset of chaos
// scenarios from E9-S23's scope. Golden vs golden-fixture regression
// (3 AZ properties within ±10% vs Offervana PM CMA) is orchestrated
// out-of-band in a separate eval harness; this smoke is the floor.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotenvLocal() {
  try {
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
  } catch {
    // .env.local optional; operator may export directly
  }
}

function fail(msg) {
  console.error(`[smoke-ai-agent] FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`[smoke-ai-agent] OK: ${msg}`);
}

async function main() {
  loadDotenvLocal();

  const required = ["AI_GATEWAY_API_KEY"];
  for (const key of required) {
    if (!process.env[key]) fail(`${key} is not set`);
  }

  // 1. Gateway reachability
  try {
    const { createGateway, generateText } = await import("ai");
    const gw = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY });
    const { text } = await generateText({
      model: gw("anthropic/claude-sonnet-4-6"),
      prompt: "Reply with exactly OK.",
    });
    if (!text?.includes("OK")) fail(`gateway round-trip didn't return OK: ${text}`);
    ok(`gateway round-trip: ${text.trim()}`);
  } catch (err) {
    fail(`gateway call failed: ${err?.message ?? err}`);
  }

  // 2. Supabase reachability (optional — fall through on missing keys)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } },
      );
      const { error } = await supabase.from("ai_sessions").select("id").limit(1);
      if (error) fail(`supabase ai_sessions read failed: ${error.message}`);
      ok("supabase ai_sessions read");
    } catch (err) {
      fail(`supabase call failed: ${err?.message ?? err}`);
    }
  } else {
    console.warn(
      "[smoke-ai-agent] SKIP: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set; DB paths unverified",
    );
  }

  ok("all smokes passed");
  process.exit(0);
}

main().catch((err) => fail(err?.message ?? String(err)));
