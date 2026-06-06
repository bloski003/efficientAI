import { describe, it, expect } from "vitest";
import { lookupSeed } from "../seeds";

describe("lookupSeed", () => {
  it("matches claude-haiku by fragment", () => {
    const seed = lookupSeed("claude-haiku-4-5");
    expect(seed?.qualityTier).toBe("budget");
    expect(seed?.capabilities).toContain("casual_chat");
  });

  it("matches claude-sonnet by fragment", () => {
    const seed = lookupSeed("claude-sonnet-4-6");
    expect(seed?.qualityTier).toBe("balanced");
    expect(seed?.capabilities).toContain("coding");
  });

  it("matches claude-opus by fragment", () => {
    const seed = lookupSeed("claude-opus-4-7");
    expect(seed?.qualityTier).toBe("frontier");
    expect(seed?.capabilities).toContain("reasoning");
  });

  it("matches gpt-5.4-nano before gpt-5.4 (specificity order)", () => {
    const seed = lookupSeed("gpt-5.4-nano");
    expect(seed?.qualityTier).toBe("budget");
  });

  it("matches gpt-5.4 for exact id", () => {
    const seed = lookupSeed("gpt-5.4");
    expect(seed?.qualityTier).toBe("frontier");
  });

  it("matches gpt-5.5", () => {
    const seed = lookupSeed("gpt-5.5");
    expect(seed?.capabilities).toContain("long_context");
  });

  it("matches gemini-2.5-flash-lite before gemini-2.5-flash", () => {
    const lite = lookupSeed("gemini-2.5-flash-lite");
    const flash = lookupSeed("gemini-2.5-flash");
    expect(lite?.qualityTier).toBe("budget");
    expect(flash?.qualityTier).toBe("balanced");
  });

  it("returns null for unknown models", () => {
    expect(lookupSeed("gpt-3.5-turbo")).toBeNull();
    expect(lookupSeed("llama-3-8b")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(lookupSeed("Claude-Haiku-4-5")).not.toBeNull();
    expect(lookupSeed("GPT-5.4")).not.toBeNull();
  });
});
