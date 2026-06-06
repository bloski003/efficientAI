import type { ModelEntry } from "./schema";
import { fetchModels } from "./fetch";
import snapshot from "./snapshot.json";

export type { ModelEntry } from "./schema";

export interface GetModelsResult {
  models: ModelEntry[];
  lastSynced: string;
  source: "live" | "fallback";
}

let cache: GetModelsResult | null = null;

export async function getModels(): Promise<GetModelsResult> {
  if (cache) return cache;

  try {
    const result = await fetchModels();
    cache = { ...result, source: "live" };
    return cache;
  } catch (err) {
    console.warn("[pricing] Live fetch failed, using fallback snapshot:", err);
    return {
      models: snapshot.models as ModelEntry[],
      lastSynced: snapshot.lastSynced,
      source: "fallback",
    };
  }
}

/** Call this to invalidate the in-memory cache (e.g. from the revalidation route). */
export function invalidatePricingCache(): void {
  cache = null;
}
