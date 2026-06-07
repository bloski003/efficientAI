import type { ModelEntry } from "../pricing/schema";
import { detectSignals, type DetectedSignals } from "./signals";

export type { DetectedSignals } from "./signals";
export { detectSignals } from "./signals";

const CONTEXT_MARGIN = 0.15;

const TIER_RANK: Record<string, number> = { frontier: 2, balanced: 1, budget: 0 };

export type CostRange = {
  low: number;
  mid: number;
  high: number;
};

export type Recommendation = {
  slot: "cheapest" | "balanced" | "premium";
  model: ModelEntry;
  costRange: CostRange;
  reasons: string[];
};

export type RecommendResult = {
  recommendations: Recommendation[];
  signals: DetectedSignals;
  requiredContext: number;
  /** Models filtered out and why */
  filtered: { model: ModelEntry; reason: string }[];
};

// ---------------------------------------------------------------------------
// Cost helpers
// ---------------------------------------------------------------------------

function midCost(model: ModelEntry, inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1e6) * model.inputPricePerM +
    (outputTokens / 1e6) * model.outputPricePerM
  );
}

function costRange(mid: number): CostRange {
  return { low: mid * 0.85, mid, high: mid * 1.15 };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Count how many of the detected signal tags this model's capabilities cover.
 */
export function capabilityMatchScore(model: ModelEntry, signals: DetectedSignals): number {
  const caps = model.capabilities as string[];
  return Object.keys(signals).filter((tag) => caps.includes(tag)).length;
}

/**
 * compositeScore = capabilityMatchScore − (estimatedCost / 10_000)
 *
 * Integer capability counts dominate; the cost term is a sub-cent tiebreaker
 * that puts cheaper equally-matched models above costlier ones.
 */
export function compositeScore(
  model: ModelEntry,
  signals: DetectedSignals,
  inputTokens: number,
  outputTokens: number
): number {
  const matchScore = capabilityMatchScore(model, signals);
  const cost = midCost(model, inputTokens, outputTokens);
  return matchScore - cost / 10_000;
}

// ---------------------------------------------------------------------------
// Tier + context filters
// ---------------------------------------------------------------------------

/** Reasoning or coding signals require at least balanced quality. */
function requiresNonBudget(signals: DetectedSignals): boolean {
  return !!(signals.reasoning || signals.coding);
}

// ---------------------------------------------------------------------------
// Slot selection
//
// Strategy:
//   1. Score every surviving model.
//   2. Split into fullMatch (matchScore == maxMatchScore) and rest.
//   3. "cheapest-capable"  = cheapest by cost within fullMatch.
//   4. "premium-capable"   = most expensive by cost within fullMatch
//                            (falls back to highest-tier from rest when fullMatch has only 1 model).
//   5. "balanced-capable"  = best remaining, sorted by (tier DESC, composite DESC).
//
// This guarantees the cheapest slot always has the best capability match —
// a structured-JSON task won't present an unrelated budget model as "cheapest".
// ---------------------------------------------------------------------------

type ScoredModel = {
  model: ModelEntry;
  matchScore: number;
  cost: number;
  composite: number;
};

function pickSlots(
  scored: ScoredModel[],
  maxMatchScore: number
): Array<{ entry: ScoredModel; slot: "cheapest" | "balanced" | "premium" }> {
  // Full-match pool (best capability coverage), cheapest first.
  const fullMatch = scored
    .filter((s) => s.matchScore === maxMatchScore)
    .sort((a, b) => a.cost - b.cost);

  // Remaining models sorted by (tier DESC, composite DESC) — used to fill gaps.
  const rest = scored
    .filter((s) => s.matchScore < maxMatchScore)
    .sort((a, b) => {
      const td = TIER_RANK[b.model.qualityTier] - TIER_RANK[a.model.qualityTier];
      return td !== 0 ? td : b.composite - a.composite;
    });

  const pickedIds = new Set<string>();

  // cheapest: cheapest fully-matched model
  const cheapestEntry = fullMatch[0];
  pickedIds.add(cheapestEntry.model.id);

  // premium: most expensive fully-matched model; fall back to top of rest
  const premiumCandidates = [
    ...fullMatch.filter((s) => !pickedIds.has(s.model.id)).reverse(),
    ...rest.filter((s) => !pickedIds.has(s.model.id)),
  ];
  const premiumEntry = premiumCandidates[0] ?? null;
  if (premiumEntry) pickedIds.add(premiumEntry.model.id);

  // balanced: best remaining by (tier DESC, composite DESC)
  const balancedCandidates = [
    ...fullMatch.filter((s) => !pickedIds.has(s.model.id)),
    ...rest.filter((s) => !pickedIds.has(s.model.id)),
  ].sort((a, b) => {
    const td = TIER_RANK[b.model.qualityTier] - TIER_RANK[a.model.qualityTier];
    return td !== 0 ? td : b.composite - a.composite;
  });
  const balancedEntry = balancedCandidates[0] ?? null;

  // Assemble results (cheapest always first, balanced second, premium last).
  const results: Array<{ entry: ScoredModel; slot: "cheapest" | "balanced" | "premium" }> = [
    { entry: cheapestEntry, slot: "cheapest" },
  ];
  if (balancedEntry) results.push({ entry: balancedEntry, slot: "balanced" });
  if (premiumEntry && premiumEntry.model.id !== cheapestEntry.model.id) {
    results.push({ entry: premiumEntry, slot: "premium" });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Reasons builder
// ---------------------------------------------------------------------------

const SIGNAL_LABELS: Record<string, string> = {
  coding: "coding",
  reasoning: "reasoning/analysis",
  structured_json: "structured output",
  long_context: "long-context",
  summarization: "summarization",
  document_analysis: "document analysis",
  data_cleaning: "data cleaning",
  casual_chat: "casual chat",
};

function buildReasons(
  model: ModelEntry,
  signals: DetectedSignals,
  slot: "cheapest" | "balanced" | "premium",
  inputTokens: number,
  estimatedOutput: number,
  requiredContext: number,
  matchScore: number,
  maxMatchScore: number
): string[] {
  const reasons: string[] = [];
  const caps = model.capabilities as string[];

  // Which signals this model covers and which it misses
  const matchedTags = Object.keys(signals).filter((tag) => caps.includes(tag));
  const missedTags = Object.keys(signals).filter((tag) => !caps.includes(tag));
  const totalSignals = matchedTags.length + missedTags.length;

  // Capability match summary — the primary driver of the pick
  if (matchScore > 0 && matchScore === maxMatchScore) {
    const labels = matchedTags.map((t) => SIGNAL_LABELS[t] ?? t).join(", ");
    reasons.push(`Preferred: matches all detected task signals (${labels}).`);
  } else if (matchScore > 0) {
    const labels = matchedTags.map((t) => SIGNAL_LABELS[t] ?? t).join(", ");
    reasons.push(
      `Partial match: covers ${matchScore} of ${totalSignals} task signals (${labels}).`
    );
  } else if (totalSignals > 0) {
    reasons.push("No direct capability match for detected signals; included for coverage.");
  }

  // Missed capabilities (only when model has some matches, so user sees what's traded away)
  if (missedTags.length > 0 && matchScore > 0) {
    const labels = missedTags.map((t) => SIGNAL_LABELS[t] ?? t).join(", ");
    reasons.push(`Does not explicitly list: ${labels}.`);
  }

  // Slot narrative
  if (slot === "cheapest") {
    reasons.push("Most cost-efficient option among capability-matched models.");
  } else if (slot === "balanced") {
    reasons.push("Mid-range cost/capability trade-off.");
  } else {
    reasons.push("Highest cost tier; maximum capability headroom.");
  }

  // Long-context note
  if (requiredContext > 100_000) {
    reasons.push(
      `Handles required context (~${(requiredContext / 1000).toFixed(0)}k tokens); ` +
        `context window: ${(model.contextWindow / 1000).toFixed(0)}k.`
    );
  }

  // Tier + provider
  reasons.push(`Quality tier: ${model.qualityTier} · provider: ${model.provider}.`);

  return reasons;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function recommendFromPrompt(
  models: ModelEntry[],
  prompt: string,
  inputTokens: number,
  estimatedOutput: number,
): RecommendResult {
  const signals = detectSignals(prompt);
  return recommendWithSignals(models, inputTokens, estimatedOutput, signals);
}

export function recommendWithSignals(
  models: ModelEntry[],
  inputTokens: number,
  estimatedOutput: number,
  signals: DetectedSignals,
): RecommendResult {
  const requiredContext = Math.ceil((inputTokens + estimatedOutput) * (1 + CONTEXT_MARGIN));
  const needsNonBudget = requiresNonBudget(signals);

  // ---- Step 1: filter -------------------------------------------------------
  const filtered: { model: ModelEntry; reason: string }[] = [];
  const surviving: ModelEntry[] = [];

  for (const m of models) {
    if (m.contextWindow < requiredContext) {
      filtered.push({
        model: m,
        reason: `Context window (${(m.contextWindow / 1000).toFixed(0)}k) < required (${(requiredContext / 1000).toFixed(0)}k).`,
      });
      continue;
    }
    if (needsNonBudget && m.qualityTier === "budget") {
      filtered.push({
        model: m,
        reason: "Budget tier excluded: reasoning/coding signals require balanced+ quality.",
      });
      continue;
    }
    surviving.push(m);
  }

  if (surviving.length === 0) {
    return { recommendations: [], signals, requiredContext, filtered };
  }

  // ---- Step 2: score --------------------------------------------------------
  const scored: ScoredModel[] = surviving.map((m) => ({
    model: m,
    matchScore: capabilityMatchScore(m, signals),
    cost: midCost(m, inputTokens, estimatedOutput),
    composite: compositeScore(m, signals, inputTokens, estimatedOutput),
  }));

  const maxMatchScore = Math.max(...scored.map((s) => s.matchScore));

  // ---- Step 3: pick slots ---------------------------------------------------
  const slots = pickSlots(scored, maxMatchScore);

  // ---- Step 4: build Recommendation objects --------------------------------
  const recommendations: Recommendation[] = slots.map(({ entry, slot }) => {
    const { model, matchScore, cost } = entry;
    const range = costRange(cost);
    const reasons = buildReasons(
      model,
      signals,
      slot,
      inputTokens,
      estimatedOutput,
      requiredContext,
      matchScore,
      maxMatchScore
    );
    return { slot, model, costRange: range, reasons };
  });

  return { recommendations, signals, requiredContext, filtered };
}
