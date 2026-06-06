import { z } from "zod";

export const CapabilityTag = z.enum([
  "coding",
  "structured_json",
  "reasoning",
  "long_context",
  "data_cleaning",
  "casual_chat",
  "summarization",
  "document_analysis",
]);

export const QualityTier = z.enum(["budget", "balanced", "frontier"]);

export const ModelEntrySchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  provider: z.string().min(1),
  inputPricePerM: z.number().nonnegative(),
  outputPricePerM: z.number().nonnegative(),
  contextWindow: z.number().int().positive(),
  maxOutput: z.number().int().positive(),
  capabilities: z.array(CapabilityTag),
  qualityTier: QualityTier,
});

export type CapabilityTag = z.infer<typeof CapabilityTag>;
export type QualityTier = z.infer<typeof QualityTier>;
export type ModelEntry = z.infer<typeof ModelEntrySchema>;
