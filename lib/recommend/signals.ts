import type { CapabilityTag } from "../pricing/schema";

type SignalRule = {
  tag: CapabilityTag;
  /** Patterns that activate the signal */
  positive: RegExp[];
  /** If any negation matches, the signal is suppressed */
  negations: RegExp[];
};

export const SIGNAL_RULES: SignalRule[] = [
  {
    tag: "coding",
    positive: [
      /\b(code|function|implement|class|script|program|debug|refactor|unit test|algorithm|api|sql|query|bash|shell|typescript|javascript|python|rust|go|java)\b/i,
    ],
    negations: [/\bno (code|programming|coding)\b/i, /\bnon-?code\b/i],
  },
  {
    tag: "reasoning",
    positive: [
      /\b(reason|analyse|analyze|evaluate|compare|pros and cons|trade-?offs?|explain why|logic|infer|deduce|hypothesis|critical|judgment)\b/i,
    ],
    negations: [/\bno (analysis|reasoning)\b/i],
  },
  {
    tag: "structured_json",
    positive: [
      /\b(json|yaml|xml|csv|structured|schema|parse|extract data|output format|format as)\b/i,
    ],
    negations: [],
  },
  {
    tag: "long_context",
    positive: [
      /\b(long document|entire (file|codebase|repo|document)|full text|summarize (this|the) (book|paper|report|document)|translate (this|the) (book|document))\b/i,
    ],
    negations: [],
  },
  {
    tag: "summarization",
    positive: [
      /\b(summar(ize|ise|y|ization)|tldr|tl;dr|condense|overview|brief|key points|highlights)\b/i,
    ],
    negations: [],
  },
  {
    tag: "document_analysis",
    positive: [
      /\b(document|report|paper|contract|pdf|article|research|literature|review|read (this|the))\b/i,
    ],
    negations: [],
  },
  {
    tag: "data_cleaning",
    positive: [
      /\b(clean(ing)?|deduplicate|normalize|transform|wrangle|ETL|data pipeline|spreadsheet|csv|missing values)\b/i,
    ],
    negations: [],
  },
  {
    tag: "casual_chat",
    positive: [
      /\b(chat|talk|tell me|explain|what (is|are|was)|who (is|are|was)|how (does|do|did)|fun fact|trivia|recommend)\b/i,
    ],
    negations: [],
  },
];

export type DetectedSignals = Partial<Record<CapabilityTag, boolean>>;

export function detectSignals(prompt: string): DetectedSignals {
  const result: DetectedSignals = {};
  for (const rule of SIGNAL_RULES) {
    const negated = rule.negations.some((r) => r.test(prompt));
    if (negated) continue;
    const matched = rule.positive.some((r) => r.test(prompt));
    if (matched) result[rule.tag] = true;
  }
  return result;
}
