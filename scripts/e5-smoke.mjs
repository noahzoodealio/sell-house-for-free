#!/usr/bin/env node
// E5-S8 UAT smoke + chaos runner against the Offervana OuterAPI.
//
// Hits POST https://sellfreeai.zoodealio.net/openapi/Customers (enterprise
// integration endpoint) with an `ApiKey` header and reports each scenario's
// outcome. Requires ZOODEALIO_API_KEY in .env.local (or env).
//
// Scenarios:
//   happy              — real submit with a unique email; expects 200 with
//                        ABP envelope + GetCustomersDto `{id, referalCode}`
//   email-conflict     — submit twice with the same email; second should
//                        land on "already registered" ABP error
//   timeout            — force AbortSignal.timeout; expects TimeoutError
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
const PATH = "/openapi/Customers";

function buildDto({ email, name = "Smoke", surname = "Test" }) {
  return {
    name,
    surname,
    emailAddress: email,
    phoneNumber: "+16025551234",
    isEmailNotificationsEnabled: true,
    isSmsNotificationsEnabled: true,
    address1: "123 Smoke St",
    city: "Phoenix",
    stateCd: "AZ",
    zipCode: "85001",
    country: "US",
    floors: 1,
    bedroomsCount: 3,
    bathroomsCount: 2,
    squareFootage: 1800,
    yearBuilt: 1995,
    additionalInfo: JSON.stringify({
      source: "e5-smoke",
      pillarHint: "cash-offers",
      sellYourHouseFreePath: "cash",
    }),
  };
}

async function callOffervana(dto, { timeoutMs = 13000 } = {}) {
  const apiKey = process.env.ZOODEALIO_API_KEY;
  if (!apiKey) throw new Error("ZOODEALIO_API_KEY not set");
  const response = await fetch(`${BASE_URL}${PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ApiKey: apiKey,
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
      : null;
  const ok =
    result.status === 200 &&
    envelope?.success === true &&
    resultObj !== null &&
    typeof resultObj.id === "number" &&
    (typeof resultObj.referalCode === "string" ||
      typeof resultObj.referralCode === "string");
  return { name: "happy", pass: ok, email, result };
}

async function scenarioEmailConflict() {
  const email = "smoke-conflict@sellfreeai-smoke.invalid";
  const first = await callOffervana(buildDto({ email }), { timeoutMs: 30000 });
  const second = await callOffervana(buildDto({ email }), { timeoutMs: 30000 });
  const body = second.body && typeof second.body === "object" ? second.body : {};
  const msg = body?.error?.message ?? "";
  const conflictDetected =
    (second.status >= 400 && /email/i.test(JSON.stringify(body))) ||
    (second.status === 200 && body?.success === false && /email/i.test(msg));
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
