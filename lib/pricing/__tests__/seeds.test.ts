import { describe, it, expect } from "vitest";
import { lookupSeed } from "../seeds";

describe("lookupSeed", () => {
  it("matches claude-haiku-4-5 exactly", () => {
    const seed = lookupSeed("claude-haiku-4-5");
    expect(seed?.qualityTier).toBe("budget");
    expect(seed?.capabilities).toContain("casual_chat");
  });

  it("matches claude-haiku-4-5-20251001 exactly", () => {
    const seed = lookupSeed("claude-haiku-4-5-20251001");
    expect(seed?.qualityTier).toBe("budget");
    expect(seed?.capabilities).toContain("casual_chat");
  });

  it("matches claude-sonnet-4-6 exactly", () => {
    const seed = lookupSeed("claude-sonnet-4-6");
    expect(seed?.qualityTier).toBe("balanced");
    expect(seed?.capabilities).toContain("coding");
  });

  it("matches claude-opus-4-7 exactly", () => {
    const seed = lookupSeed("claude-opus-4-7");
    expect(seed?.qualityTier).toBe("frontier");
    expect(seed?.capabilities).toContain("reasoning");
  });

  it("matches claude-opus-4-8 exactly", () => {
    const seed = lookupSeed("claude-opus-4-8");
    expect(seed?.qualityTier).toBe("frontier");
    expect(seed?.capabilities).toContain("reasoning");
  });

  it("matches gpt-5.4-nano exactly (distinct from gpt-5.4)", () => {
    const nano = lookupSeed("gpt-5.4-nano");
    expect(nano?.qualityTier).toBe("budget");
  });

  it("matches gpt-5.4 exactly", () => {
    const seed = lookupSeed("gpt-5.4");
    expect(seed?.qualityTier).toBe("frontier");
  });

  it("matches gpt-5.4-mini exactly", () => {
    const seed = lookupSeed("gpt-5.4-mini");
    expect(seed?.qualityTier).toBe("balanced");
  });

  it("matches gpt-5.5 exactly", () => {
    const seed = lookupSeed("gpt-5.5");
    expect(seed?.capabilities).toContain("long_context");
  });

  it("matches gemini-2.5-flash-lite and gemini-2.5-flash as distinct entries", () => {
    const lite = lookupSeed("gemini-2.5-flash-lite");
    const flash = lookupSeed("gemini-2.5-flash");
    expect(lite?.qualityTier).toBe("budget");
    expect(flash?.qualityTier).toBe("balanced");
  });

  it("matches gemini-3.1-pro exactly", () => {
    const seed = lookupSeed("gemini-3.1-pro");
    expect(seed?.qualityTier).toBe("frontier");
  });

  it("matches deepseek-v3.2 and deepseek-v4", () => {
    expect(lookupSeed("deepseek-v3.2")?.qualityTier).toBe("balanced");
    expect(lookupSeed("deepseek-v4")?.qualityTier).toBe("frontier");
  });

  it("returns null for unknown models", () => {
    expect(lookupSeed("gpt-3.5-turbo")).toBeNull();
    expect(lookupSeed("llama-3-8b")).toBeNull();
    expect(lookupSeed("nano-banana")).toBeNull();
  });

  it("does NOT match partial/superstring IDs", () => {
    // Fragment matching would accept these; exact matching must not
    expect(lookupSeed("gpt-5.4-nano-banana")).toBeNull();
    expect(lookupSeed("evil-claude-sonnet-4-6")).toBeNull();
    expect(lookupSeed("claude-haiku-4-5-extra-garbage")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(lookupSeed("Claude-Haiku-4-5")).not.toBeNull();
    expect(lookupSeed("GPT-5.4")).not.toBeNull();
  });
});
