import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchModels } from "../fetch";

const mockPayload = {
  openai: {
    id: "openai",
    models: {
      "gpt-5.4": {
        id: "gpt-5.4",
        name: "GPT-5.4",
        cost: { input: 2.5, output: 15 },
        limit: { context: 1050000, output: 128000 },
      },
      "gpt-5.5": {
        id: "gpt-5.5",
        name: "GPT-5.5",
        cost: { input: 5, output: 25 },
        limit: { context: 2000000, output: 128000 },
      },
      // Not in seeds — should be dropped
      "gpt-unknown-model": {
        id: "gpt-unknown-model",
        name: "GPT Unknown",
        cost: { input: 1, output: 5 },
        limit: { context: 128000, output: 16000 },
      },
    },
  },
  anthropic: {
    id: "anthropic",
    models: {
      "claude-haiku-4-5": {
        id: "claude-haiku-4-5",
        name: "Claude Haiku 4.5",
        cost: { input: 0.8, output: 4 },
        limit: { context: 200000, output: 8192 },
      },
    },
  },
};

describe("fetchModels", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockPayload,
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps seeded models to ModelEntry objects", async () => {
    const { models } = await fetchModels();
    const ids = models.map((m) => m.id);
    expect(ids).toContain("gpt-5.4");
    expect(ids).toContain("gpt-5.5");
    expect(ids).toContain("claude-haiku-4-5");
  });

  it("drops models not in seeds", async () => {
    const { models } = await fetchModels();
    expect(models.find((m) => m.id === "gpt-unknown-model")).toBeUndefined();
  });

  it("maps prices from the raw payload", async () => {
    const { models } = await fetchModels();
    const gpt54 = models.find((m) => m.id === "gpt-5.4");
    expect(gpt54?.inputPricePerM).toBe(2.5);
    expect(gpt54?.outputPricePerM).toBe(15);
  });

  it("assigns correct seeds to models", async () => {
    const { models } = await fetchModels();
    const haiku = models.find((m) => m.id === "claude-haiku-4-5");
    expect(haiku?.qualityTier).toBe("budget");
    expect(haiku?.capabilities).toContain("casual_chat");
  });

  it("returns a lastSynced ISO timestamp", async () => {
    const { lastSynced } = await fetchModels();
    expect(() => new Date(lastSynced).toISOString()).not.toThrow();
  });

  it("throws when fetch response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable" })
    );
    await expect(fetchModels()).rejects.toThrow("503");
  });

  it("deduplicates models across providers (first canonical provider wins)", async () => {
    const payloadWithDupe = {
      ...mockPayload,
      anthropic: {
        id: "anthropic",
        models: {
          "gpt-5.4": {
            id: "gpt-5.4",
            name: "GPT-5.4 via Anthropic (duplicate)",
            cost: { input: 99, output: 99 },
            limit: { context: 1, output: 1 },
          },
          "claude-haiku-4-5": mockPayload.anthropic.models["claude-haiku-4-5"],
        },
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => payloadWithDupe })
    );
    const { models } = await fetchModels();
    const gpt54Entries = models.filter((m) => m.id === "gpt-5.4");
    expect(gpt54Entries).toHaveLength(1);
    expect(gpt54Entries[0].inputPricePerM).toBe(2.5); // openai wins, not the dupe
  });
});
