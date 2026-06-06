import type { CapabilityTag, QualityTier } from "./schema";

interface ModelSeed {
  capabilities: CapabilityTag[];
  qualityTier: QualityTier;
}

/**
 * Name-fragment matchers (lowercase) → seed data.
 * Order matters: more specific fragments first.
 * Prices are NOT stored here — only tags and tiers.
 */
const SEED_RULES: Array<{ fragment: string; seed: ModelSeed }> = [
  // DeepSeek
  {
    fragment: "deepseek-v3.2",
    seed: {
      qualityTier: "balanced",
      capabilities: ["coding", "structured_json", "data_cleaning"],
    },
  },
  {
    fragment: "deepseek-v4",
    seed: {
      qualityTier: "frontier",
      capabilities: ["coding", "structured_json", "reasoning"],
    },
  },
  // OpenAI GPT — most specific first
  {
    fragment: "gpt-5.5",
    seed: {
      qualityTier: "frontier",
      capabilities: [
        "coding",
        "structured_json",
        "reasoning",
        "long_context",
        "document_analysis",
      ],
    },
  },
  {
    fragment: "gpt-5.4-nano",
    seed: {
      qualityTier: "budget",
      capabilities: ["casual_chat", "summarization", "structured_json"],
    },
  },
  {
    fragment: "gpt-5.4-mini",
    seed: {
      qualityTier: "balanced",
      capabilities: ["coding", "structured_json", "summarization"],
    },
  },
  {
    fragment: "gpt-5.4",
    seed: {
      qualityTier: "frontier",
      capabilities: [
        "coding",
        "structured_json",
        "reasoning",
        "document_analysis",
      ],
    },
  },
  {
    fragment: "gpt-4.1-nano",
    seed: {
      qualityTier: "budget",
      capabilities: ["casual_chat", "summarization"],
    },
  },
  // Gemini
  {
    fragment: "gemini-2.5-flash-lite",
    seed: {
      qualityTier: "budget",
      capabilities: ["casual_chat", "summarization", "structured_json"],
    },
  },
  {
    fragment: "gemini-2.5-flash",
    seed: {
      qualityTier: "balanced",
      capabilities: [
        "coding",
        "structured_json",
        "summarization",
        "document_analysis",
      ],
    },
  },
  {
    fragment: "gemini-3-pro",
    seed: {
      qualityTier: "frontier",
      capabilities: [
        "coding",
        "reasoning",
        "long_context",
        "document_analysis",
      ],
    },
  },
  // Anthropic Claude — match on family name, most specific first
  {
    fragment: "claude-haiku",
    seed: {
      qualityTier: "budget",
      capabilities: ["casual_chat", "summarization", "structured_json"],
    },
  },
  {
    fragment: "claude-sonnet",
    seed: {
      qualityTier: "balanced",
      capabilities: [
        "coding",
        "structured_json",
        "summarization",
        "document_analysis",
      ],
    },
  },
  {
    fragment: "claude-opus",
    seed: {
      qualityTier: "frontier",
      capabilities: [
        "coding",
        "reasoning",
        "structured_json",
        "long_context",
        "document_analysis",
      ],
    },
  },
];

/** Returns the seed for the first fragment that matches the model id/name, or null. */
export function lookupSeed(modelId: string): ModelSeed | null {
  const lower = modelId.toLowerCase();
  for (const rule of SEED_RULES) {
    if (lower.includes(rule.fragment)) {
      return rule.seed;
    }
  }
  return null;
}
