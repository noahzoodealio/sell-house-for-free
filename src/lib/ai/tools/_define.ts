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

        let toolRunId: string | null = null;
        try {
          const { data } = await supabase
            .from("ai_tool_runs")
            .insert({
              session_id: session.id,
              tool_name: spec.name,
              status: "running",
              input_json: safeInput,
            })
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
            return result;
          }

          if (
            spec.outputSchema &&
            outputSchemaDeclaresDisclaimer(spec.outputSchema) &&
            !hasDisclaimerField(result)
          ) {
            throw new DisclaimerMissingError(spec.name);
          }

          if (!spec.skipAutoFinalize) {
            await finalize("ok", redactObject(result));
          }
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
