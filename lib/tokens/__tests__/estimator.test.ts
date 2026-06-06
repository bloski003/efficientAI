import { describe, it, expect } from "vitest";
import {
  estimateTokens,
  countInputTokens,
  estimateOutputTokens,
  isOpenAIFamily,
} from "../index";

describe("isOpenAIFamily", () => {
  it("recognises gpt- prefix", () => expect(isOpenAIFamily("gpt-5.5")).toBe(true));
  it("recognises o1/o3/o4 prefix", () => {
    expect(isOpenAIFamily("o1-mini")).toBe(true);
    expect(isOpenAIFamily("o3")).toBe(true);
  });
  it("returns false for claude", () => expect(isOpenAIFamily("claude-sonnet-4-6")).toBe(false));
  it("returns false for gemini", () => expect(isOpenAIFamily("gemini-2.5-flash")).toBe(false));
});

describe("countInputTokens", () => {
  it("returns exact flag for OpenAI family", () => {
    const { isExact } = countInputTokens("hello world", "gpt-5.5");
    expect(isExact).toBe(true);
  });

  it("returns approximate flag for non-OpenAI", () => {
    const { isExact } = countInputTokens("hello world", "claude-sonnet-4-6");
    expect(isExact).toBe(false);
  });

  it("approximation is chars/4 rounded up", () => {
    const prompt = "a".repeat(100);
    const { count } = countInputTokens(prompt, "gemini-2.5-flash");
    expect(count).toBe(25);
  });

  it("OpenAI exact count is non-zero for non-empty prompt", () => {
    const { count } = countInputTokens("Tell me about Paris.", "gpt-5.4");
    expect(count).toBeGreaterThan(0);
  });
});

describe("estimateOutputTokens", () => {
  it("caps default tasks at 1000", () => {
    expect(estimateOutputTokens(5000, "default")).toBe(1000);
  });

  it("1x input for default below cap", () => {
    expect(estimateOutputTokens(500, "default")).toBe(500);
  });

  it("coding tasks use 1.5x input up to 2000", () => {
    expect(estimateOutputTokens(400, "coding")).toBe(600);
    expect(estimateOutputTokens(2000, "coding")).toBe(2000);
  });

  it("generation tasks use 1.5x input up to 2000", () => {
    expect(estimateOutputTokens(600, "generation")).toBe(900);
  });
});

describe("estimateTokens", () => {
  it("detects coding task from keyword", () => {
    const result = estimateTokens("Write a function to reverse a string", "gpt-5.5");
    expect(result.detectedTaskType).toBe("coding");
  });

  it("detects generation task from keyword", () => {
    const result = estimateTokens("Draft an essay about the Roman Empire", "gpt-5.5");
    expect(result.detectedTaskType).toBe("generation");
  });

  it("defaults task type for neutral prompt", () => {
    const result = estimateTokens("What is the capital of France?", "gpt-5.5");
    expect(result.detectedTaskType).toBe("default");
  });

  it("respects output override", () => {
    const result = estimateTokens("hello", "gpt-5.5", 999);
    expect(result.estimatedOutput).toBe(999);
    expect(result.outputIsApproximate).toBe(false);
  });

  it("marks output as approximate when no override", () => {
    const result = estimateTokens("hello", "gpt-5.5");
    expect(result.outputIsApproximate).toBe(true);
  });

  it("non-OpenAI model marks input as approximate", () => {
    const result = estimateTokens("hello world", "claude-sonnet-4-6");
    expect(result.inputIsExact).toBe(false);
  });
});
