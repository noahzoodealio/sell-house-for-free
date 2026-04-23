#!/usr/bin/env node
// One-shot smoke for the Vercel AI Gateway. Calls generateText once with
// the orchestrator profile and asserts the response contains "OK". Pulls
// env from .env.local. Operator-run post-install to prove the key works.
//
// Exit 0 on success, 1 with a readable error on failure.

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
    // .env.local may not exist in CI or ephemeral environments; fall through
    // to process.env.
  }
}

async function main() {
  loadDotenvLocal();

  if (!process.env.AI_GATEWAY_API_KEY) {
    console.error(
      "AI_GATEWAY_API_KEY is not set. Run " +
        "`vercel env pull .env.local --environment=development --yes` " +
        "or export the variable before running this script.",
    );
    process.exit(1);
  }

  const { createGateway } = await import("ai");
  const { generateText } = await import("ai");

  const gw = createGateway(
    process.env.AI_GATEWAY_BASE_URL
      ? {
          apiKey: process.env.AI_GATEWAY_API_KEY,
          baseURL: process.env.AI_GATEWAY_BASE_URL,
        }
      : { apiKey: process.env.AI_GATEWAY_API_KEY },
  );

  const started = Date.now();
  try {
    const { text } = await generateText({
      model: gw("anthropic/claude-sonnet-4-6"),
      prompt: "Reply with exactly OK.",
    });
    const elapsed = Date.now() - started;
    if (!text || !text.includes("OK")) {
      console.error(
        `gateway responded but "OK" missing after ${elapsed}ms: ${JSON.stringify(text)}`,
      );
      process.exit(1);
    }
    console.log(`gateway OK (${elapsed}ms): ${text.trim()}`);
    process.exit(0);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`gateway call failed: ${msg}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
