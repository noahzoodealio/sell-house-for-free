import "server-only";

import { createHash } from "node:crypto";

import { getSupabaseAdmin } from "@/lib/supabase/server";

import { redact } from "./redact";

const DEFAULT_WINDOW_SECONDS = 60;
const DEFAULT_REQUESTS_PER_WINDOW = 30;

const BUDGET_EXHAUST_REASON =
  "This conversation has reached its budget. Your PM can help you further.";
const RATE_LIMIT_REASON =
  "Too many requests from this network. Please retry shortly.";

export interface BudgetSession {
  tokens_used_in: number;
  tokens_used_out: number;
  token_budget_in: number;
  token_budget_out: number;
}

export type BudgetVerdict =
  | { ok: true }
  | { ok: false; reason: string; status: 429 };

let saltWarningLogged = false;

function windowSeconds(): number {
  const env = process.env.AI_IP_WINDOW_SECONDS;
  if (!env) return DEFAULT_WINDOW_SECONDS;
  const n = Number.parseInt(env, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WINDOW_SECONDS;
}

function requestsPerWindow(): number {
  const env = process.env.AI_IP_REQUESTS_PER_WINDOW;
  if (!env) return DEFAULT_REQUESTS_PER_WINDOW;
  const n = Number.parseInt(env, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_REQUESTS_PER_WINDOW;
}

function firstIp(request: Request | null | undefined): string | null {
  if (!request) return null;
  const header = request.headers.get("x-forwarded-for");
  if (!header) return null;
  const first = header.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
}

function hashIp(ip: string): string | null {
  const salt = process.env.AI_IP_HASH_SALT;
  if (!salt) {
    if (!saltWarningLogged) {
      console.warn(
        redact(
          '{"level":"warn","kind":"budget.ip_hash.no_salt","message":"AI_IP_HASH_SALT unset; skipping rate-limit"}',
        ),
      );
      saltWarningLogged = true;
    }
    return null;
  }
  return createHash("sha256").update(`${ip}${salt}`).digest("hex");
}

export function checkTokenCeilings(session: BudgetSession): BudgetVerdict {
  if (session.tokens_used_in >= session.token_budget_in) {
    return { ok: false, reason: BUDGET_EXHAUST_REASON, status: 429 };
  }
  if (session.tokens_used_out >= session.token_budget_out) {
    return { ok: false, reason: BUDGET_EXHAUST_REASON, status: 429 };
  }
  return { ok: true };
}

async function incrementIpBudget(
  ipHash: string,
): Promise<BudgetVerdict> {
  const supabase = getSupabaseAdmin();
  const ceiling = requestsPerWindow();

  const { data, error } = await supabase.rpc("ai_increment_ip_budget", {
    p_ip_hash: ipHash,
    p_window_seconds: windowSeconds(),
  });

  if (error) {
    console.warn(
      redact(
        JSON.stringify({
          level: "warn",
          kind: "budget.rpc.error",
          message: error.message,
        }),
      ),
    );
    // Fail-open on infra error: better to overshoot than lock legitimate users
    // out because of a transient DB issue. Budget token ceilings still enforce.
    return { ok: true };
  }

  const newCount = typeof data === "number" ? data : Number(data);
  if (Number.isFinite(newCount) && newCount > ceiling) {
    return { ok: false, reason: RATE_LIMIT_REASON, status: 429 };
  }
  return { ok: true };
}

export async function enforceBudget(
  session: BudgetSession,
  request: Request | null,
): Promise<BudgetVerdict> {
  const tokenVerdict = checkTokenCeilings(session);
  if (!tokenVerdict.ok) return tokenVerdict;

  const ip = firstIp(request);
  if (!ip) return { ok: true };

  const ipHash = hashIp(ip);
  if (!ipHash) return { ok: true };

  return incrementIpBudget(ipHash);
}

export const BUDGET_REASONS = Object.freeze({
  EXHAUSTED: BUDGET_EXHAUST_REASON,
  RATE_LIMITED: RATE_LIMIT_REASON,
} as const);
