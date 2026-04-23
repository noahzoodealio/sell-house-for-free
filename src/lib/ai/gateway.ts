import "server-only";

import { createGateway } from "ai";

type GatewayProvider = ReturnType<typeof createGateway>;

export const models = Object.freeze({
  orchestrator: "anthropic/claude-sonnet-4-6",
  judge: "anthropic/claude-opus-4-7",
  vision: "anthropic/claude-sonnet-4-6",
} as const);

export type ModelProfile = keyof typeof models;
export type ModelId = (typeof models)[ModelProfile];

let cached: GatewayProvider | null = null;

function resolveGateway(): GatewayProvider {
  if (cached) return cached;

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AI_GATEWAY_API_KEY is required. Source it from .env.local " +
        "(vercel env pull) before importing src/lib/ai/gateway.ts.",
    );
  }

  const baseURL = process.env.AI_GATEWAY_BASE_URL;

  cached = createGateway(baseURL ? { apiKey, baseURL } : { apiKey });
  return cached;
}

export function gateway(model: ModelId) {
  return resolveGateway()(model);
}
