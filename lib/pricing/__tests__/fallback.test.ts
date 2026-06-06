import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const SNAPSHOT_TIMESTAMP = "2026-06-06T00:00:00.000Z";
const SNAPSHOT_MODELS = [
  {
    id: "claude-sonnet-4-6",
    displayName: "Claude Sonnet 4.6",
    provider: "anthropic",
    inputPricePerM: 3,
    outputPricePerM: 15,
    contextWindow: 200000,
    maxOutput: 64000,
    capabilities: ["coding", "structured_json", "summarization", "document_analysis"],
    qualityTier: "balanced",
  },
];

vi.mock("../snapshot.json", () => ({
  default: {
    lastSynced: SNAPSHOT_TIMESTAMP,
    models: SNAPSHOT_MODELS,
  },
}));

describe("getModels fallback", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns fallback data when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const { getModels, invalidatePricingCache } = await import("../index");
    invalidatePricingCache();

    const result = await getModels();
    expect(result.source).toBe("fallback");
    expect(result.models).toEqual(SNAPSHOT_MODELS);
  });

  it("lastSynced from fallback matches snapshot timestamp", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { getModels, invalidatePricingCache } = await import("../index");
    invalidatePricingCache();

    const result = await getModels();
    expect(result.lastSynced).toBe(SNAPSHOT_TIMESTAMP);
  });

  it("returns live data and source=live when fetch succeeds", async () => {
    const livePayload = {
      openai: {
        id: "openai",
        models: {
          "gpt-5.4": {
            id: "gpt-5.4",
            name: "GPT-5.4",
            cost: { input: 2.5, output: 15 },
            limit: { context: 1050000, output: 128000 },
          },
        },
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => livePayload })
    );
    const { getModels, invalidatePricingCache } = await import("../index");
    invalidatePricingCache();

    const result = await getModels();
    expect(result.source).toBe("live");
  });
});
