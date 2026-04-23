import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("src/lib/ai/gateway", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("exposes exactly three model profiles with the expected strings", async () => {
    process.env.AI_GATEWAY_API_KEY = "test-key";
    const { models } = await import("../gateway");

    expect(Object.keys(models).sort()).toEqual(["judge", "orchestrator", "vision"]);
    expect(models.orchestrator).toBe("anthropic/claude-sonnet-4-6");
    expect(models.judge).toBe("anthropic/claude-opus-4-7");
    expect(models.vision).toBe("anthropic/claude-sonnet-4-6");
  });

  it("freezes the models record to prevent runtime mutation", async () => {
    process.env.AI_GATEWAY_API_KEY = "test-key";
    const { models } = await import("../gateway");

    expect(Object.isFrozen(models)).toBe(true);
  });

  it("throws a clear error when AI_GATEWAY_API_KEY is missing at first use", async () => {
    delete process.env.AI_GATEWAY_API_KEY;
    const { gateway, models } = await import("../gateway");

    expect(() => gateway(models.orchestrator)).toThrowError(
      /AI_GATEWAY_API_KEY is required/,
    );
  });

  it("returns a language model object when the key is present", async () => {
    process.env.AI_GATEWAY_API_KEY = "test-key";
    const { gateway, models } = await import("../gateway");

    const model = gateway(models.orchestrator);
    expect(model).toBeDefined();
    expect(model.modelId).toBe(models.orchestrator);
  });
});
