import { encode } from "gpt-tokenizer";

export type TokenEstimate = {
  inputTokens: number;
  estimatedOutput: number;
  outputIsApproximate: boolean;
  /** true when tokenizer is exact (OpenAI-family); false = char-ratio approximation */
  inputIsExact: boolean;
  detectedTaskType: "generation" | "coding" | "default";
};

const CHARS_PER_TOKEN = 4;

const CODING_SIGNALS = /\b(code|function|implement|class|script|program|debug|refactor|write a|build a|create a)\b/i;
const GENERATION_SIGNALS = /\b(write|draft|generate|compose|create|essay|story|article|blog|report|document)\b/i;

/** Models whose tokenizer is compatible with gpt-tokenizer (tiktoken cl100k / o200k). */
const OPENAI_FAMILY_PREFIXES = ["gpt-", "o1", "o3", "o4", "text-embedding"];

export function isOpenAIFamily(modelId: string): boolean {
  return OPENAI_FAMILY_PREFIXES.some((p) => modelId.startsWith(p));
}

function detectTaskType(prompt: string): "generation" | "coding" | "default" {
  if (CODING_SIGNALS.test(prompt)) return "coding";
  if (GENERATION_SIGNALS.test(prompt)) return "generation";
  return "default";
}

/**
 * Count input tokens for a given prompt.
 * For OpenAI-family models uses gpt-tokenizer (exact).
 * For all others approximates with char/token ratio and flags as approximate.
 */
export function countInputTokens(
  prompt: string,
  modelId: string
): { count: number; isExact: boolean } {
  if (isOpenAIFamily(modelId)) {
    return { count: encode(prompt).length, isExact: true };
  }
  return { count: Math.ceil(prompt.length / CHARS_PER_TOKEN), isExact: false };
}

/**
 * Estimate output token count from input tokens and task type.
 * Heuristic: 1× input capped at 1000 for default; coding/generation tasks get up to 2000.
 */
export function estimateOutputTokens(
  inputTokens: number,
  taskType: "generation" | "coding" | "default"
): number {
  if (taskType === "coding" || taskType === "generation") {
    return Math.min(inputTokens * 1.5, 2000);
  }
  return Math.min(inputTokens, 1000);
}

/**
 * Full estimate for a prompt + model combo.
 * Pass `outputOverride` (user-supplied) to skip the heuristic output estimate.
 */
export function estimateTokens(
  prompt: string,
  modelId: string,
  outputOverride?: number
): TokenEstimate {
  const { count: inputTokens, isExact } = countInputTokens(prompt, modelId);
  const taskType = detectTaskType(prompt);
  const estimatedOutput = outputOverride ?? estimateOutputTokens(inputTokens, taskType);

  return {
    inputTokens,
    estimatedOutput: Math.round(estimatedOutput),
    outputIsApproximate: outputOverride === undefined,
    inputIsExact: isExact,
    detectedTaskType: taskType,
  };
}
