import type { CapabilityTag, QualityTier } from "./schema";

interface ModelSeed {
  capabilities: CapabilityTag[];
  qualityTier: QualityTier;
}

/**
 * Allowlist of approved model IDs (exact, lowercase) → seed data.
 *
 * Only IDs present here are kept from the models.dev payload.
 * Any model whose ID is not in this map is silently dropped — preventing
 * garbage entries from slipping through via loose name matching.
 *
 * Prices are NOT stored here — only capabilities and quality tier.
 */
const SEED_MAP: Record<string, ModelSeed> = {
  // ── DeepSeek ────────────────────────────────────────────────────────────
  "deepseek-v3.2": {
    qualityTier: "balanced",
    capabilities: ["coding", "structured_json", "data_cleaning"],
  },
  "deepseek-v4": {
    qualityTier: "frontier",
    capabilities: ["coding", "structured_json", "reasoning"],
  },

  // ── OpenAI GPT ──────────────────────────────────────────────────────────
  "gpt-4.1-nano": {
    qualityTier: "budget",
    capabilities: ["casual_chat", "summarization"],
  },
  "gpt-5.4-nano": {
    qualityTier: "budget",
    capabilities: ["casual_chat", "summarization", "structured_json"],
  },
  "gpt-5.4-mini": {
    qualityTier: "balanced",
    capabilities: ["coding", "structured_json", "summarization"],
  },
  "gpt-5.4": {
    qualityTier: "frontier",
    capabilities: ["coding", "structured_json", "reasoning", "document_analysis"],
  },
  "gpt-5.5": {
    qualityTier: "frontier",
    capabilities: [
      "coding",
      "structured_json",
      "reasoning",
      "long_context",
      "document_analysis",
    ],
  },

  // ── Google Gemini ────────────────────────────────────────────────────────
  "gemini-2.5-flash-lite": {
    qualityTier: "budget",
    capabilities: ["casual_chat", "summarization", "structured_json"],
  },
  "gemini-2.5-flash": {
    qualityTier: "balanced",
    capabilities: ["coding", "structured_json", "summarization", "document_analysis"],
  },
  "gemini-3.1-pro": {
    qualityTier: "frontier",
    capabilities: ["coding", "reasoning", "long_context", "document_analysis"],
  },

  // ── Anthropic Claude ─────────────────────────────────────────────────────
  "claude-haiku-4-5": {
    qualityTier: "budget",
    capabilities: ["casual_chat", "summarization", "structured_json"],
  },
  "claude-haiku-4-5-20251001": {
    qualityTier: "budget",
    capabilities: ["casual_chat", "summarization", "structured_json"],
  },
  "claude-sonnet-4-6": {
    qualityTier: "balanced",
    capabilities: ["coding", "structured_json", "summarization", "document_analysis"],
  },
  "claude-opus-4-7": {
    qualityTier: "frontier",
    capabilities: [
      "coding",
      "reasoning",
      "structured_json",
      "long_context",
      "document_analysis",
    ],
  },
  "claude-opus-4-8": {
    qualityTier: "frontier",
    capabilities: [
      "coding",
      "reasoning",
      "structured_json",
      "long_context",
      "document_analysis",
    ],
  },
};

/** Returns the seed for an exact model ID match (case-insensitive), or null. */
export function lookupSeed(modelId: string): ModelSeed | null {
  return SEED_MAP[modelId.toLowerCase()] ?? null;
}
