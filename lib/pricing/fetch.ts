import { ModelEntrySchema, type ModelEntry } from "./schema";
import { lookupSeed } from "./seeds";

const MODELS_DEV_URL = "https://models.dev/api.json";

/** Canonical providers in priority order. First match wins for deduplication. */
const CANONICAL_PROVIDERS = ["openai", "anthropic", "google", "deepseek"] as const;

interface RawModel {
  id?: string;
  name?: string;
  cost?: {
    input?: number;
    output?: number;
  };
  limit?: {
    context?: number;
    output?: number;
  };
  [key: string]: unknown;
}

interface RawProvider {
  id?: string;
  name?: string;
  models?: Record<string, RawModel>;
  [key: string]: unknown;
}

type ModelsDevPayload = Record<string, RawProvider>;

function mapRawModel(
  modelId: string,
  raw: RawModel,
  providerId: string
): ModelEntry | null {
  const seed = lookupSeed(modelId) ?? lookupSeed(raw.name ?? "");
  if (!seed) return null;

  const result = ModelEntrySchema.safeParse({
    id: modelId,
    displayName: raw.name ?? modelId,
    provider: providerId,
    inputPricePerM: raw.cost?.input ?? 0,
    outputPricePerM: raw.cost?.output ?? 0,
    contextWindow: raw.limit?.context ?? 0,
    maxOutput: raw.limit?.output ?? 0,
    capabilities: seed.capabilities,
    qualityTier: seed.qualityTier,
  });

  if (!result.success) {
    console.warn(
      `[pricing] Dropping model "${modelId}" from provider "${providerId}": ${result.error.message}`
    );
    return null;
  }

  return result.data;
}

export interface FetchResult {
  models: ModelEntry[];
  lastSynced: string;
}

export async function fetchModels(): Promise<FetchResult> {
  const response = await fetch(MODELS_DEV_URL, {
    next: { revalidate: 3600 },
  } as RequestInit);

  if (!response.ok) {
    throw new Error(
      `models.dev fetch failed: ${response.status} ${response.statusText}`
    );
  }

  const payload: ModelsDevPayload = await response.json();

  const seen = new Set<string>();
  const models: ModelEntry[] = [];

  for (const providerId of CANONICAL_PROVIDERS) {
    const provider = payload[providerId];
    if (!provider?.models) continue;

    for (const [modelId, rawModel] of Object.entries(provider.models)) {
      if (seen.has(modelId)) continue;
      seen.add(modelId);

      const entry = mapRawModel(modelId, rawModel, providerId);
      if (entry) {
        models.push(entry);
      }
    }
  }

  return {
    models,
    lastSynced: new Date().toISOString(),
  };
}
