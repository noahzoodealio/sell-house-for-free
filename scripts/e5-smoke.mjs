#!/usr/bin/env node
// E5-S8 UAT smoke + chaos runner.
//
// Hits the live https://sellfreeai.zoodealio.net CreateHostAdminCustomer
// endpoint and reports each scenario's outcome. Requires ZOODEALIO_API_KEY
// in .env.local (or env). Pass a scenario name or `all`.
//
// Scenarios:
//   happy              — real submit with a unique email, expects item1/2/3
//   email-conflict     — submit with a fixed email twice; second should 500
//                        with "already registered" or similar
//   timeout            — calls the client with a 1ms per-attempt timeout
//                        to force a transient-exhausted outcome
//   malformed-response — POSTs to a valid endpoint that returns the wrong
//                        shape (skipped — no such endpoint on UAT; left as
//                        a placeholder for E8 chaos infra)
//
// Usage: node scripts/e5-smoke.mjs happy
//        node scripts/e5-smoke.mjs all

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
    // .env.local missing — rely on real env only
  }
}

const BASE_URL = "https://sellfreeai.zoodealio.net";
const PATH = "/api/services/app/CustomerAppServiceV2/CreateHostAdminCustomer";

function buildDto({ email, firstName = "Smoke", lastName = "Test" }) {
  return {
    propData: {
      address1: "123 Smoke St",
      address2: null,
      city: "Phoenix",
      country: "US",
      stateCd: "AZ",
      zipCode: "85001",
      gpsCoordinates: null,
      customerId: 0,
      propertyType: "single-family",
    },
    signUpData: {
      firstName,
      lastName,
      email,
      phone: "+16025551234",
    },
    surveyData: JSON.stringify({
      submissionId: crypto.randomUUID(),
      source: "e5-smoke",
      bedrooms: 3,
      bathrooms: 2,
      squareFootage: 1800,
      yearBuilt: 1995,
      condition: { currentCondition: "move-in", timeline: "0-3mo" },
      pillarHint: "cash-offers",
    }),
    sendPrelims: true,
    customerLeadSource: 13,
    submitterRole: 0,
    isSellerSource: true,
    entryPage: "/get-started",
    entryTimestamp: Date.now(),
  };
}

async function callOffervana(dto, { timeoutMs = 12000 } = {}) {
  const apiKey = process.env.ZOODEALIO_API_KEY;
  if (!apiKey) throw new Error("ZOODEALIO_API_KEY not set");
  const response = await fetch(`${BASE_URL}${PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(dto),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

async function scenarioHappy() {
  const email = `smoke+${Date.now()}@sellfreeai-smoke.invalid`;
  const dto = buildDto({ email });
  const result = await callOffervana(dto, { timeoutMs: 30000 });
  const envelope = result.body;
  const resultObj =
    envelope && typeof envelope === "object" && envelope.result
      ? envelope.result
      : envelope;
  const ok =
    result.status === 200 &&
    envelope?.success === true &&
    typeof resultObj === "object" &&
    resultObj !== null &&
    "item1" in resultObj &&
    "item2" in resultObj &&
    "item3" in resultObj;
  return { name: "happy", pass: ok, email, result };
}

async function scenarioEmailConflict() {
  const email = "smoke-conflict@sellfreeai-smoke.invalid";
  const first = await callOffervana(buildDto({ email }));
  const second = await callOffervana(buildDto({ email }));
  const conflictDetected =
    second.status >= 400 &&
    JSON.stringify(second.body).toLowerCase().includes("email");
  return {
    name: "email-conflict",
    pass: conflictDetected,
    email,
    first,
    second,
  };
}

async function scenarioTimeout() {
  try {
    await callOffervana(
      buildDto({ email: `smoke-timeout+${Date.now()}@sellfreeai-smoke.invalid` }),
      { timeoutMs: 1 },
    );
    return { name: "timeout", pass: false, reason: "no abort thrown" };
  } catch (err) {
    const name = err instanceof Error ? err.name : String(err);
    return { name: "timeout", pass: /Abort|TimeoutError/i.test(name), err: name };
  }
}

const SCENARIOS = {
  happy: scenarioHappy,
  "email-conflict": scenarioEmailConflict,
  timeout: scenarioTimeout,
};

async function main() {
  loadDotenvLocal();
  const which = process.argv[2] ?? "happy";
  const plan = which === "all" ? Object.keys(SCENARIOS) : [which];
  const results = [];
  for (const name of plan) {
    const fn = SCENARIOS[name];
    if (!fn) {
      console.error(`unknown scenario: ${name}`);
      process.exit(2);
    }
    process.stdout.write(`[e5-smoke] ${name}... `);
    try {
      const result = await fn();
      results.push(result);
      console.log(result.pass ? "PASS" : "FAIL");
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.log("ERROR");
      console.error(err);
      results.push({ name, pass: false, error: err?.message ?? String(err) });
    }
  }
  const failed = results.filter((r) => !r.pass);
  process.exit(failed.length === 0 ? 0 : 1);
}

main();
