import { describe, it, expect } from "vitest";
import { detectSignals } from "../signals";
import {
  recommendWithSignals,
  recommendFromPrompt,
  capabilityMatchScore,
  compositeScore,
} from "../index";
import type { ModelEntry } from "../../pricing/schema";

// ---------------------------------------------------------------------------
// Fixture model set
//
// Deliberately chosen so each capability tag is covered by specific models only,
// making it possible to assert that different task types produce different picks:
//
//   budget-chat       cheap, has casual_chat only
//   balanced-coding   mid-price, has coding + reasoning + summarization
//   frontier-json     expensive, has structured_json + coding + reasoning
//   frontier-all      most expensive, has every capability
// ---------------------------------------------------------------------------
const MODELS: ModelEntry[] = [
  {
    id: "budget-chat",
    displayName: "Budget Chat",
    provider: "test",
    inputPricePerM: 0.1,
    outputPricePerM: 0.2,
    contextWindow: 32_000,
    maxOutput: 4_000,
    capabilities: ["casual_chat"],
    qualityTier: "budget",
  },
  {
    id: "balanced-coding",
    displayName: "Balanced Coding",
    provider: "test",
    inputPricePerM: 0.5,
    outputPricePerM: 1.5,
    contextWindow: 128_000,
    maxOutput: 16_000,
    capabilities: ["coding", "reasoning", "summarization"],
    qualityTier: "balanced",
  },
  {
    id: "frontier-json",
    displayName: "Frontier JSON",
    provider: "test",
    inputPricePerM: 3,
    outputPricePerM: 9,
    contextWindow: 200_000,
    maxOutput: 32_000,
    capabilities: ["structured_json", "coding", "reasoning"],
    qualityTier: "frontier",
  },
  {
    id: "frontier-all",
    displayName: "Frontier All",
    provider: "test",
    inputPricePerM: 10,
    outputPricePerM: 30,
    contextWindow: 1_000_000,
    maxOutput: 128_000,
    capabilities: [
      "coding",
      "reasoning",
      "structured_json",
      "long_context",
      "summarization",
      "document_analysis",
      "data_cleaning",
      "casual_chat",
    ],
    qualityTier: "frontier",
  },
];

// ---------------------------------------------------------------------------
// detectSignals
// ---------------------------------------------------------------------------
describe("detectSignals", () => {
  it("detects coding signal", () => {
    expect(detectSignals("Write a function to sort an array")).toMatchObject({ coding: true });
  });

  it("suppresses coding signal with negation", () => {
    const s = detectSignals("Explain sorting algorithms, no code please");
    expect(s.coding).toBeUndefined();
  });

  it("detects reasoning signal", () => {
    expect(detectSignals("Analyse the pros and cons of remote work")).toMatchObject({
      reasoning: true,
    });
  });

  it("detects summarization signal", () => {
    expect(detectSignals("Summarize this document for me")).toMatchObject({ summarization: true });
  });

  it("detects structured_json signal", () => {
    expect(detectSignals("Output the result as JSON")).toMatchObject({ structured_json: true });
  });

  it("detects long_context signal", () => {
    expect(detectSignals("Summarize this entire document")).toMatchObject({ long_context: true });
  });

  it("produces no false positives on a neutral prompt", () => {
    const s = detectSignals("What is 2 + 2?");
    expect(s.coding).toBeUndefined();
    expect(s.reasoning).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// capabilityMatchScore
// ---------------------------------------------------------------------------
describe("capabilityMatchScore", () => {
  it("returns 0 when no signals", () => {
    expect(capabilityMatchScore(MODELS[0], {})).toBe(0);
  });

  it("counts matched capability tags correctly", () => {
    expect(capabilityMatchScore(MODELS[3], { coding: true, reasoning: true })).toBe(2);
  });

  it("only counts tags the model actually has", () => {
    expect(capabilityMatchScore(MODELS[0], { coding: true })).toBe(0);
    expect(capabilityMatchScore(MODELS[0], { casual_chat: true })).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// compositeScore
// ---------------------------------------------------------------------------
describe("compositeScore", () => {
  it("capability match dominates cost in the score", () => {
    // frontier-all matches coding; budget-chat does not — frontier scores higher despite higher cost
    const frontierScore = compositeScore(MODELS[3], { coding: true }, 100, 100);
    const budgetScore = compositeScore(MODELS[0], { coding: true }, 100, 100);
    expect(frontierScore).toBeGreaterThan(budgetScore);
  });

  it("among equal match scores, cheaper model scores higher", () => {
    // balanced-coding and frontier-json both match coding+reasoning (score 2)
    // balanced-coding is cheaper → higher composite
    const balancedScore = compositeScore(MODELS[1], { coding: true, reasoning: true }, 100, 100);
    const frontierScore = compositeScore(MODELS[2], { coding: true, reasoning: true }, 100, 100);
    expect(balancedScore).toBeGreaterThan(frontierScore);
  });
});

// ---------------------------------------------------------------------------
// Context-window filter
// ---------------------------------------------------------------------------
describe("context window filter", () => {
  it("filters models whose window is smaller than required context", () => {
    // 50k input + 5k output → required ≈ 63.25k → budget-chat (32k) filtered
    const result = recommendWithSignals(MODELS, 50_000, 5_000, {});
    const ids = result.recommendations.map((r) => r.model.id);
    expect(ids).not.toContain("budget-chat");
    expect(result.filtered.some((f) => f.model.id === "budget-chat")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tier filter
// ---------------------------------------------------------------------------
describe("tier filter", () => {
  it("excludes budget tier when coding signal present", () => {
    const result = recommendWithSignals(MODELS, 100, 100, { coding: true });
    const ids = result.recommendations.map((r) => r.model.id);
    expect(ids).not.toContain("budget-chat");
    expect(result.filtered.some((f) => f.model.id === "budget-chat")).toBe(true);
  });

  it("excludes budget tier when reasoning signal present", () => {
    const result = recommendWithSignals(MODELS, 100, 100, { reasoning: true });
    expect(result.recommendations.map((r) => r.model.id)).not.toContain("budget-chat");
  });

  it("allows budget tier when no strong signals present", () => {
    const result = recommendWithSignals(MODELS, 100, 100, {});
    expect(result.recommendations.map((r) => r.model.id)).toContain("budget-chat");
  });
});

// ---------------------------------------------------------------------------
// Capability-driven ranking — the core behaviour
// ---------------------------------------------------------------------------
describe("capability-driven ranking", () => {
  it("casual_chat task: budget-chat is cheapest-capable slot (only casual_chat match)", () => {
    const result = recommendWithSignals(MODELS, 100, 100, { casual_chat: true });
    const cheapest = result.recommendations.find((r) => r.slot === "cheapest");
    expect(cheapest?.model.id).toBe("budget-chat");
  });

  it("structured_json task: cheapest-capable slot has structured_json capability", () => {
    // frontier-json is the cheapest model with structured_json; budget-chat does NOT qualify
    const result = recommendWithSignals(MODELS, 100, 100, { structured_json: true });
    const cheapest = result.recommendations.find((r) => r.slot === "cheapest");
    expect((cheapest?.model.capabilities as string[]).includes("structured_json")).toBe(true);
    expect(cheapest?.model.id).toBe("frontier-json");
  });

  it("structured_json task: does NOT put a non-structured_json model in cheapest slot", () => {
    const result = recommendWithSignals(MODELS, 100, 100, { structured_json: true });
    const cheapest = result.recommendations.find((r) => r.slot === "cheapest");
    // budget-chat (no structured_json) must not be cheapest even though it costs less
    expect(cheapest?.model.id).not.toBe("budget-chat");
    expect(cheapest?.model.id).not.toBe("balanced-coding");
  });

  it("coding task: all returned models have coding capability (budget filtered by tier)", () => {
    const result = recommendWithSignals(MODELS, 100, 100, { coding: true });
    for (const rec of result.recommendations) {
      expect((rec.model.capabilities as string[]).includes("coding")).toBe(true);
    }
  });

  it("reasoning task: cheapest-capable model has reasoning capability", () => {
    const result = recommendWithSignals(MODELS, 100, 100, { reasoning: true });
    const cheapest = result.recommendations.find((r) => r.slot === "cheapest");
    expect((cheapest?.model.capabilities as string[]).includes("reasoning")).toBe(true);
  });

  it("different task types produce different cheapest-capable picks", () => {
    const chatResult = recommendWithSignals(MODELS, 100, 100, { casual_chat: true });
    const codingResult = recommendWithSignals(MODELS, 100, 100, { coding: true });
    const jsonResult = recommendWithSignals(MODELS, 100, 100, { structured_json: true });

    const chatTop = chatResult.recommendations.find((r) => r.slot === "cheapest")?.model.id;
    const codingTop = codingResult.recommendations.find((r) => r.slot === "cheapest")?.model.id;
    const jsonTop = jsonResult.recommendations.find((r) => r.slot === "cheapest")?.model.id;

    // casual_chat → budget-chat; coding → balanced-coding; structured_json → frontier-json
    expect(chatTop).toBe("budget-chat");
    expect(codingTop).toBe("balanced-coding");
    expect(jsonTop).toBe("frontier-json");

    // All three are distinct
    expect(new Set([chatTop, codingTop, jsonTop]).size).toBe(3);
  });

  it("no-signal task: cheapest model (budget-chat) gets cheapest slot", () => {
    const result = recommendWithSignals(MODELS, 100, 100, {});
    const cheapest = result.recommendations.find((r) => r.slot === "cheapest");
    expect(cheapest?.model.id).toBe("budget-chat");
  });
});

// ---------------------------------------------------------------------------
// Slot structure and cost guarantees
// ---------------------------------------------------------------------------
describe("slot structure", () => {
  it("returns up to 3 recommendations", () => {
    const result = recommendWithSignals(MODELS, 100, 100, {});
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeLessThanOrEqual(3);
  });

  it("all returned model ids are distinct", () => {
    const result = recommendWithSignals(MODELS, 100, 100, {});
    const ids = result.recommendations.map((r) => r.model.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cheapest slot has lowest cost among all 3 returned (no-signal case)", () => {
    // With no signals maxMatchScore = 0, all models go into fullMatch sorted by cost.
    // cheapest = budget-chat (lowest cost), which also ends up cheapest among the 3 returned.
    const result = recommendWithSignals(MODELS, 100, 100, {});
    const cheapest = result.recommendations.find((r) => r.slot === "cheapest");
    if (cheapest) {
      for (const rec of result.recommendations) {
        expect(cheapest.costRange.mid).toBeLessThanOrEqual(rec.costRange.mid + 1e-9);
      }
    }
  });

  it("cheapest slot has lowest cost within the capability-matched set for coding", () => {
    // All 3 surviving models (budget filtered) match coding.
    // cheapest-capable = balanced-coding (cheapest among them).
    const result = recommendWithSignals(MODELS, 100, 100, { coding: true });
    const cheapest = result.recommendations.find((r) => r.slot === "cheapest");
    const premium = result.recommendations.find((r) => r.slot === "premium");
    expect(cheapest?.costRange.mid).toBeLessThan(premium?.costRange.mid ?? Infinity);
  });

  it("cost range is ±15% around mid", () => {
    const result = recommendWithSignals(MODELS, 100, 100, {});
    for (const rec of result.recommendations) {
      expect(rec.costRange.low).toBeCloseTo(rec.costRange.mid * 0.85, 10);
      expect(rec.costRange.high).toBeCloseTo(rec.costRange.mid * 1.15, 10);
    }
  });
});

// ---------------------------------------------------------------------------
// Reasons
// ---------------------------------------------------------------------------
describe("reasons", () => {
  it("every recommendation includes at least one reason", () => {
    const result = recommendWithSignals(MODELS, 100, 100, { coding: true });
    for (const rec of result.recommendations) {
      expect(rec.reasons.length).toBeGreaterThan(0);
    }
  });

  it("reasons mention the matched capability when model fully covers signals", () => {
    const result = recommendWithSignals(MODELS, 100, 100, { casual_chat: true });
    const cheapest = result.recommendations.find((r) => r.slot === "cheapest")!;
    // budget-chat has casual_chat → reason should say "Preferred: matches all detected task signals"
    const mentionsPreferred = cheapest.reasons.some((r) =>
      r.toLowerCase().includes("preferred")
    );
    expect(mentionsPreferred).toBe(true);
  });

  it("reasons flag 'no direct capability match' for unmatched models in the result", () => {
    const result = recommendWithSignals(MODELS, 100, 100, { structured_json: true });
    // balanced-coding has no structured_json → if it appears, it should note the lack of match
    const balancedRec = result.recommendations.find((r) => r.model.id === "balanced-coding");
    if (balancedRec) {
      const hasNote = balancedRec.reasons.some(
        (r) =>
          r.toLowerCase().includes("no direct capability match") ||
          r.toLowerCase().includes("coverage")
      );
      expect(hasNote).toBe(true);
    }
  });

  it("reasons mention slot role (cost-efficient / trade-off / headroom)", () => {
    const result = recommendWithSignals(MODELS, 100, 100, { coding: true });
    const cheapest = result.recommendations.find((r) => r.slot === "cheapest")!;
    const premium = result.recommendations.find((r) => r.slot === "premium")!;
    expect(cheapest.reasons.some((r) => r.toLowerCase().includes("cost-efficient"))).toBe(true);
    expect(premium.reasons.some((r) => r.toLowerCase().includes("headroom"))).toBe(true);
  });

  it("every recommendation has a costRange with low/mid/high", () => {
    const result = recommendWithSignals(MODELS, 1_000, 500, {});
    for (const rec of result.recommendations) {
      expect(rec.costRange.low).toBeLessThan(rec.costRange.mid);
      expect(rec.costRange.high).toBeGreaterThan(rec.costRange.mid);
    }
  });
});

// ---------------------------------------------------------------------------
// Filtered model subsets (model selector scenarios)
// ---------------------------------------------------------------------------
describe("filtered model subsets", () => {
  it("subset of 3 models returns at most 3 recommendations", () => {
    const subset = MODELS.slice(1, 4); // balanced-coding, frontier-json, frontier-all
    const result = recommendWithSignals(subset, 100, 100, {});
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeLessThanOrEqual(3);
  });

  it("single model that passes filters returns exactly 1 recommendation", () => {
    const result = recommendWithSignals([MODELS[1]], 100, 100, { coding: true });
    expect(result.recommendations.length).toBe(1);
  });

  it("single model recommendation has slot 'cheapest'", () => {
    const result = recommendWithSignals([MODELS[1]], 100, 100, {});
    expect(result.recommendations[0].slot).toBe("cheapest");
  });

  it("empty model list returns no recommendations", () => {
    const result = recommendWithSignals([], 100, 100, {});
    expect(result.recommendations.length).toBe(0);
  });

  it("all models filtered by context returns no recommendations", () => {
    // Passing only budget-chat (32k window) with a huge context requirement
    const result = recommendWithSignals([MODELS[0]], 50_000, 5_000, {});
    expect(result.recommendations.length).toBe(0);
    expect(result.filtered.some((f) => f.model.id === "budget-chat")).toBe(true);
  });

  it("2-model subset returns at most 2 recommendations", () => {
    const result = recommendWithSignals([MODELS[1], MODELS[2]], 100, 100, {});
    expect(result.recommendations.length).toBeLessThanOrEqual(2);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// recommendFromPrompt integration
// ---------------------------------------------------------------------------
describe("recommendFromPrompt integration", () => {
  it("coding prompt excludes budget models and cheapest has coding capability", () => {
    const result = recommendFromPrompt(
      MODELS,
      "Write a Python script to parse and validate JSON",
      200,
      400
    );
    const ids = result.recommendations.map((r) => r.model.id);
    expect(ids).not.toContain("budget-chat");
    const cheapest = result.recommendations.find((r) => r.slot === "cheapest")!;
    expect((cheapest.model.capabilities as string[]).includes("coding")).toBe(true);
  });

  it("casual chat prompt puts budget-chat as cheapest", () => {
    const result = recommendFromPrompt(MODELS, "What's the capital of France?", 20, 50);
    const cheapest = result.recommendations.find((r) => r.slot === "cheapest");
    expect(cheapest?.model.id).toBe("budget-chat");
  });

  it("long context prompt filters models with insufficient window", () => {
    // 50k input → requiredContext ≈ 63.25k → budget-chat (32k) filtered
    const result = recommendFromPrompt(
      MODELS,
      "Summarize this entire document",
      50_000,
      2_000
    );
    expect(result.filtered.some((f) => f.model.id === "budget-chat")).toBe(true);
  });

  it("reasoning prompt sets cheapest-capable to a reasoning-capable model", () => {
    const result = recommendFromPrompt(
      MODELS,
      "Analyse the pros and cons of microservices vs monoliths",
      300,
      600
    );
    const cheapest = result.recommendations.find((r) => r.slot === "cheapest")!;
    expect((cheapest.model.capabilities as string[]).includes("reasoning")).toBe(true);
  });
});
