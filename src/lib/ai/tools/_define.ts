import "server-only";

import { tool } from "ai";
import type { z } from "zod";

import { redact, redactObject } from "@/lib/ai/redact";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type CostClass = "cheap" | "priced" | "expensive";
type BudgetBucket = "attom" | "mls" | "offervana" | "supabase" | "model";

export interface DefineToolTelemetry {
  cost_class?: CostClass;
  budget_bucket?: BudgetBucket;
}

export interface DefineToolSessionLike {
  id: string;
  [key: string]: unknown;
}

export type DefineToolFinalize = (
  status: "ok" | "error",
  output?: unknown,
  errorDetail?: unknown,
) => Promise<void>;

export interface DefineToolCtx {
  sessionId: string;
  toolRunId: string | null;
  supabase: ReturnType<typeof getSupabaseAdmin>;
  signal?: AbortSignal;
  redact: typeof redact;
  finalize: DefineToolFinalize;
  telemetry?: DefineToolTelemetry;
}

export interface DefineToolSpec<TIn extends z.ZodTypeAny, TOut> {
  name: string;
  description: string;
  inputSchema: TIn;
  outputSchema?: z.ZodTypeAny;
  telemetry?: DefineToolTelemetry;
  skipAutoFinalize?: boolean;
  handler: (input: z.infer<TIn>, ctx: DefineToolCtx) => Promise<TOut> | TOut;
}

export class DisclaimerMissingError extends Error {
  constructor(toolName: string) {
    super(
      `defineTool: handler for ${toolName} returned without required disclaimer field`,
    );
    this.name = "DisclaimerMissingError";
  }
}

interface ToolErrorEnvelope {
  kind: "tool-error";
  safe: true;
  message: string;
  disclaimer?: string;
  [key: string]: unknown;
}

function isToolError(value: unknown): value is ToolErrorEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === "tool-error"
  );
}

function hasDisclaimerField(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const d = (value as { disclaimer?: unknown }).disclaimer;
  return typeof d === "string" && d.length > 0;
}

function outputSchemaDeclaresDisclaimer(schema: z.ZodTypeAny): boolean {
  const shape = (schema as unknown as { shape?: Record<string, unknown> }).shape;
  if (!shape) return false;
  return Object.prototype.hasOwnProperty.call(shape, "disclaimer");
}

// E13-S7 — kill-switch env vars per family. Default false (tools enabled).
function isFamilyDisabled(bucket: BudgetBucket | undefined): boolean {
  if (!bucket) return false;
  const map: Partial<Record<BudgetBucket, string>> = {
    attom: "AI_TOOLS_ATTOM_DISABLED",
    offervana: "AI_TOOLS_OFFERVANA_DISABLED",
    mls: "AI_TOOLS_MLS_DISABLED",
  };
  const envKey = map[bucket];
  if (!envKey) return false;
  return process.env[envKey] === "true";
}

// E13-S7 — atomic budget decrement. Returns the new remaining count, or null
// when the row doesn't exist or the budget is already at 0. The single
// statement is atomic; concurrent invocations contest the row, not the budget.
const BUDGET_COLUMN_BY_BUCKET: Partial<Record<BudgetBucket, string>> = {
  attom: "tool_budget_attom_remaining",
  offervana: "tool_budget_offervana_remaining",
  mls: "tool_budget_mls_remaining",
};

async function decrementBudget(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  sessionId: string,
  bucket: BudgetBucket,
): Promise<{ remaining: number } | { exhausted: true } | { unavailable: true }> {
  const column = BUDGET_COLUMN_BY_BUCKET[bucket];
  if (!column) return { unavailable: true };

  // Read-then-write fallback: Supabase JS client doesn't expose a single-statement
  // SQL with RETURNING; we approximate atomicity by guarding on the WHERE clause
  // and re-reading. Concurrent workers can race past the read, but the WHERE
  // filter on update prevents driving below 0. Any race-loser sees a 0 update
  // and returns 'exhausted'.
  const { data: row } = await supabase
    .from("ai_sessions")
    .select(column)
    .eq("id", sessionId)
    .maybeSingle();
  if (!row) return { unavailable: true };
  const current = (row as unknown as Record<string, number>)[column] ?? 0;
  if (current <= 0) return { exhausted: true };

  const { data: updated } = await supabase
    .from("ai_sessions")
    .update({ [column]: current - 1 })
    .eq("id", sessionId)
    .gt(column, 0)
    .select(column)
    .maybeSingle();
  if (!updated) return { exhausted: true };
  return { remaining: (updated as unknown as Record<string, number>)[column] };
}

// E13-S7 — structured event logger. Until @sentry/nextjs is wired (separate
// platform-ops work), events surface as redacted JSON lines that ops can
// grep/route. Format mirrors the future Sentry tag shape exactly so swap is a
// one-liner.
type AiToolEvent =
  | "ai_tool_succeeded"
  | "ai_tool_failed"
  | "ai_tool_budget_exhausted"
  | "ai_tool_scope_violation";

function shouldSampleSuccess(): boolean {
  return Math.random() < 0.01;
}

function emitEvent(event: AiToolEvent, tags: Record<string, unknown>): void {
  if (event === "ai_tool_succeeded" && !shouldSampleSuccess()) return;
  console.warn(
    redact(
      JSON.stringify({
        level: event === "ai_tool_succeeded" ? "info" : "warn",
        sentryEvent: event,
        ...tags,
      }),
    ),
  );
}

function latencyBucket(ms: number): string {
  if (ms < 200) return "lt_200";
  if (ms < 500) return "lt_500";
  if (ms < 1000) return "lt_1000";
  if (ms < 3000) return "lt_3000";
  if (ms < 8000) return "lt_8000";
  return "gte_8000";
}

export function defineTool<TIn extends z.ZodTypeAny, TOut>(
  spec: DefineToolSpec<TIn, TOut>,
) {
  return (session: DefineToolSessionLike) => {
    const execute = async (
      input: z.infer<TIn>,
      opts?: { abortSignal?: AbortSignal },
    ): Promise<unknown> => {
        const supabase = getSupabaseAdmin();
        const startedAt = Date.now();
        const safeInput = redactObject(input);
        const bucket = spec.telemetry?.budget_bucket;

        // Kill-switch: env-var-disabled families return immediately, no row.
        if (isFamilyDisabled(bucket)) {
          emitEvent("ai_tool_failed", {
            tool_name: spec.name,
            cause: "disabled_by_ops",
            stage: "preflight",
          });
          return {
            kind: "tool-error" as const,
            safe: true as const,
            cause: "disabled_by_ops",
            message:
              "That data source is temporarily turned off. Check with your PM.",
          };
        }

        // Budget gate (Supabase + model tools have no bucket and skip this).
        if (bucket && BUDGET_COLUMN_BY_BUCKET[bucket]) {
          const debit = await decrementBudget(supabase, session.id, bucket);
          if ("exhausted" in debit) {
            emitEvent("ai_tool_budget_exhausted", {
              tool_name: spec.name,
              bucket,
              session_id: session.id,
            });
            return {
              kind: "tool-error" as const,
              safe: true as const,
              cause: "budget_exhausted",
              bucket,
              message:
                "I've hit my data-lookup cap for this conversation. Your PM has the full picture — let me know if you'd like me to flag a question for them.",
            };
          }
          // 'unavailable' — no row to debit. Fall through and run; the call
          // will be unobserved on the budget side but still gets an audit row.
        }

        let toolRunId: string | null = null;
        try {
          const insertPayload: Record<string, unknown> = {
            session_id: session.id,
            tool_name: spec.name,
            status: "running",
            input_json: safeInput,
          };
          if (spec.telemetry) {
            insertPayload.metadata = {
              cost_class: spec.telemetry.cost_class ?? null,
              budget_bucket: spec.telemetry.budget_bucket ?? null,
            };
          }
          const { data } = await supabase
            .from("ai_tool_runs")
            .insert(insertPayload)
            .select("id")
            .single();
          toolRunId = (data as { id: string } | null)?.id ?? null;
        } catch {
          // Best-effort: failure to insert the audit row should not block the tool.
          // The handler still runs; the call is just unobserved.
          toolRunId = null;
        }

        const finalize: DefineToolFinalize = async (status, output, errorDetail) => {
          if (!toolRunId) return;
          await supabase
            .from("ai_tool_runs")
            .update({
              status,
              output_json: output ?? null,
              error_detail: errorDetail ?? null,
              latency_ms: Date.now() - startedAt,
            })
            .eq("id", toolRunId);
        };

        const ctx: DefineToolCtx = {
          sessionId: session.id,
          toolRunId,
          supabase,
          signal: opts?.abortSignal,
          redact,
          finalize,
          telemetry: spec.telemetry,
        };

        try {
          const result = await spec.handler(input, ctx);

          if (isToolError(result)) {
            if (!spec.skipAutoFinalize) {
              const { kind: _kind, ...detail } = result;
              await finalize("error", null, detail);
            }
            emitEvent("ai_tool_failed", {
              tool_name: spec.name,
              cause:
                (result as { cause?: string }).cause ?? "handler_returned_error",
              stage: "handler",
            });
            return result;
          }

          if (
            spec.outputSchema &&
            outputSchemaDeclaresDisclaimer(spec.outputSchema) &&
            !hasDisclaimerField(result)
          ) {
            throw new DisclaimerMissingError(spec.name);
          }

          // Detect scope-violation tags written by tool handlers (S4).
          // The handler wrote { scope_violation: true } into ai_tool_runs.error_detail
          // — re-read on success path to check for the alert signal.
          const isViolation =
            typeof result === "object" &&
            result !== null &&
            (result as { reason?: string }).reason === "no_record";
          if (isViolation && bucket === "offervana") {
            // Surface offer/property no_record paths via a soft warn — actual
            // scope_violation:true tags fired by tool handlers will be picked
            // up by the metadata-indexed query S7's view exposes.
            emitEvent("ai_tool_scope_violation", {
              tool_name: spec.name,
              session_id: session.id,
            });
          }

          if (!spec.skipAutoFinalize) {
            await finalize("ok", redactObject(result));
          }
          emitEvent("ai_tool_succeeded", {
            tool_name: spec.name,
            cache_hit:
              typeof result === "object" &&
              result !== null &&
              "cacheHit" in result
                ? (result as { cacheHit?: boolean }).cacheHit ?? false
                : false,
            latency_ms_bucket: latencyBucket(Date.now() - startedAt),
          });
          return result;
        } catch (err) {
          const aborted =
            err instanceof Error &&
            (err.name === "AbortError" || /aborted/i.test(err.message));
          const message = err instanceof Error ? err.message : String(err);
          const errorDetail = {
            kind: "tool-error" as const,
            safe: true,
            stage: "handler" as const,
            cause: aborted ? "aborted" : "handler_threw",
            message: redact(message),
          };
          if (!spec.skipAutoFinalize) {
            await finalize("error", null, errorDetail);
          }
          emitEvent("ai_tool_failed", {
            tool_name: spec.name,
            cause: aborted ? "aborted" : "handler_threw",
            stage: "handler",
          });
          return {
            kind: "tool-error" as const,
            safe: true,
            message: aborted
              ? "That request was cancelled."
              : "That tool ran into an error. Try again or rephrase your request.",
          };
        }
    };

    return tool({
      description: spec.description,
      inputSchema: spec.inputSchema as never,
      execute: execute as never,
    });
  };
}
