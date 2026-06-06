import { describe, it, expect } from "vitest";
import { ModelEntrySchema } from "../schema";

const validEntry = {
  id: "gpt-5.4",
  displayName: "GPT-5.4",
  provider: "openai",
  inputPricePerM: 2.5,
  outputPricePerM: 15,
  contextWindow: 1050000,
  maxOutput: 128000,
  capabilities: ["coding", "reasoning"] as const,
  qualityTier: "frontier" as const,
};

describe("ModelEntrySchema", () => {
  it("parses a valid entry", () => {
    const result = ModelEntrySchema.safeParse(validEntry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("gpt-5.4");
      expect(result.data.qualityTier).toBe("frontier");
    }
  });

  it("rejects negative inputPricePerM", () => {
    const result = ModelEntrySchema.safeParse({
      ...validEntry,
      inputPricePerM: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative outputPricePerM", () => {
    const result = ModelEntrySchema.safeParse({
      ...validEntry,
      outputPricePerM: -0.01,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown capability tag", () => {
    const result = ModelEntrySchema.safeParse({
      ...validEntry,
      capabilities: ["coding", "super_intelligence"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown quality tier", () => {
    const result = ModelEntrySchema.safeParse({
      ...validEntry,
      qualityTier: "premium",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...withoutId } = validEntry;
    expect(ModelEntrySchema.safeParse(withoutId).success).toBe(false);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { provider: _p, ...withoutProvider } = validEntry;
    expect(ModelEntrySchema.safeParse(withoutProvider).success).toBe(false);
  });

  it("rejects zero contextWindow", () => {
    const result = ModelEntrySchema.safeParse({
      ...validEntry,
      contextWindow: 0,
    });
    expect(result.success).toBe(false);
  });

  it("accepts zero prices (free tier model)", () => {
    const result = ModelEntrySchema.safeParse({
      ...validEntry,
      inputPricePerM: 0,
      outputPricePerM: 0,
    });
    expect(result.success).toBe(true);
  });
});
