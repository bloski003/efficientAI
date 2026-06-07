"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModelEntry } from "@/lib/pricing/schema";
import { estimateTokens } from "@/lib/tokens";
import { recommendFromPrompt, type Recommendation } from "@/lib/recommend";
import { ModelSelector } from "@/components/ModelSelector";
import { ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  models: ModelEntry[];
  lastSynced: string;
  source: "live" | "fallback";
};

// Brand-consistent tier badge styles — bg + text, no Tailwind colour classes
const TIER_STYLE: Record<string, React.CSSProperties> = {
  budget:   { backgroundColor: "#E1F5EE", color: "#0F6E56" },
  balanced: { backgroundColor: "#EFF6FF", color: "#1E4DA3" },
  frontier: { backgroundColor: "#F3F0FF", color: "#5B21B6" },
};

// Human-readable provider labels
const PROVIDER_LABEL: Record<string, string> = {
  openai:    "OpenAI",
  anthropic: "Anthropic",
  google:    "Google",
  deepseek:  "DeepSeek",
};

const LS_KEY = "morepertoken:selected-models";

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

function formatCost(n: number): string {
  if (n < 0.0001) return "<$0.0001";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(3)}`;
}

function formatSynced(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function RecommendationCard({
  rec,
  rank,
  totalTokens,
}: {
  rec: Recommendation;
  rank: number;
  totalTokens: number;
}) {
  const [open, setOpen] = useState(false);

  const rankLabel =
    rank === 0 ? "Best match" : rec.slot === "premium" ? "Premium" : "Alternative";
  const isBest = rank === 0;
  const costPer1k =
    totalTokens > 0 ? (rec.costRange.mid / totalTokens) * 1000 : 0;

  const providerLabel =
    PROVIDER_LABEL[rec.model.provider] ?? rec.model.provider;

  return (
    <Card
      className="border-2 transition-colors duration-150"
      style={{
        borderColor: isBest ? "#1D9E75" : undefined,
      }}
      // Hover handled via Tailwind group / CSS — use onMouseEnter/Leave trick
      onMouseEnter={(e) => {
        if (!isBest)
          (e.currentTarget as HTMLDivElement).style.borderColor = "#1D9E75";
      }}
      onMouseLeave={(e) => {
        if (!isBest)
          (e.currentTarget as HTMLDivElement).style.borderColor = "";
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              className="text-[10px] font-semibold uppercase mb-1"
              style={{
                ...MONO,
                letterSpacing: "0.08em",
                color: isBest ? "#1D9E75" : undefined,
              }}
            >
              {rankLabel}
            </p>
            <CardTitle
              className="leading-tight truncate"
              style={{ fontWeight: 700, fontSize: "15px" }}
            >
              {rec.model.displayName}
            </CardTitle>
            <p className="text-xs text-zinc-500 mt-0.5">{providerLabel}</p>
          </div>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
            style={{
              ...TIER_STYLE[rec.model.qualityTier],
              ...MONO,
              letterSpacing: "0.08em",
            }}
          >
            {rec.model.qualityTier}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Cost range */}
        <div className="rounded-md bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2">
          <p
            className="text-zinc-400 mb-1"
            style={{ ...MONO, fontSize: "10px", letterSpacing: "0.05em" }}
          >
            ESTIMATED COST (±15%)
          </p>
          <p
            className="text-zinc-900 dark:text-zinc-100"
            style={{ ...MONO, fontSize: "18px", fontWeight: 500 }}
          >
            {formatCost(rec.costRange.low)} – {formatCost(rec.costRange.high)}
          </p>
          <p className="text-zinc-400 mt-0.5" style={{ ...MONO, fontSize: "11px" }}>
            mid: {formatCost(rec.costRange.mid)}
          </p>
        </div>

        {/* Cost per 1k tokens */}
        {totalTokens > 0 && (
          <p className="text-xs text-zinc-500">
            <span style={MONO}>~{formatCost(costPer1k)}</span>{" "}
            <span className="text-zinc-400">per 1k tokens</span>
          </p>
        )}

        {/* Why expandable */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900 transition-colors"
          aria-expanded={open}
        >
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Why this model?
        </button>
        {open && (
          <div
            className="rounded-md px-3 py-2.5"
            style={{ backgroundColor: "#E1F5EE" }}
          >
            <ul className="space-y-1.5">
              {rec.reasons.map((r, i) => (
                <li key={i} className="text-xs text-zinc-700 flex items-start gap-1.5">
                  <span
                    aria-hidden
                    style={{ color: "#1D9E75", marginTop: "1px", flexShrink: 0 }}
                  >
                    ●
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RouterClient({ models, lastSynced, source }: Props) {
  const [prompt, setPrompt] = useState("");
  const [outputOverride, setOutputOverride] = useState<string>("");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const allIds = useMemo(() => new Set(models.map((m) => m.id)), [models]);
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    let initial = allIds;
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        const valid = new Set(parsed.filter((id) => allIds.has(id)));
        if (valid.size > 0) initial = valid;
      }
    } catch {
      // ignore malformed storage
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialising from localStorage (external system) is a canonical useEffect use case
    setSelectedIds(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectionChange = useCallback(
    (ids: Set<string>) => {
      setSelectedIds(ids);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
      } catch {
        // ignore storage errors
      }
    },
    []
  );

  const selectedModels = useMemo(
    () => (selectedIds ? models.filter((m) => selectedIds.has(m.id)) : []),
    [models, selectedIds]
  );

  const result = useMemo(() => {
    if (!prompt.trim() || selectedModels.length === 0) return null;
    const est = estimateTokens(
      prompt,
      "gpt-5.5",
      outputOverride ? Number(outputOverride) : undefined
    );
    return {
      est,
      rec: recommendFromPrompt(selectedModels, prompt, est.inputTokens, est.estimatedOutput),
      totalTokens: est.inputTokens + est.estimatedOutput,
    };
  }, [prompt, outputOverride, selectedModels]);

  const handleOutputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === "" || /^\d+$/.test(v)) setOutputOverride(v);
  }, []);

  return (
    <div className="flex flex-col">
      {/* Estimates strip */}
      <div
        className="w-full px-4 py-1.5"
        style={{
          backgroundColor: "rgba(253,230,138,0.06)",
          borderTop: "0.5px solid rgba(245,158,11,0.2)",
        }}
      >
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-semibold" style={{ color: "#451a03" }}>
              Estimates only
            </span>
            <span
              className="text-[13px]"
              style={{ fontFamily: "var(--font-syne)", color: "#a07020" }}
            >
              All costs are approximate ranges — not guarantees.
            </span>
          </div>
          <span
            className="text-[13px]"
            style={{ ...MONO, color: "#a07020" }}
          >
            Prices synced{" "}
            <span className="font-medium">{formatSynced(lastSynced)}</span>
            {source === "fallback" && (
              <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs">
                offline snapshot
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="w-full" style={{ backgroundColor: "#f4faf7" }}>
      <div className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Left panel */}
          <div className="flex flex-col gap-5 lg:w-[420px] shrink-0">
            {selectedIds === null ? (
              <div className="rounded-lg border border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-700">
                <div className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 rounded-lg">
                  <span>Model selection</span>
                  <span className="text-xs text-zinc-500">
                    {models.length} of {models.length} models selected
                  </span>
                </div>
              </div>
            ) : (
              <ModelSelector
                models={models}
                selectedIds={selectedIds!}
                open={selectorOpen}
                onOpenChange={setSelectorOpen}
                onChange={handleSelectionChange}
              />
            )}

            {/* Prompt */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="prompt"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Your prompt
              </label>
              <Textarea
                id="prompt"
                placeholder="Paste or type your prompt here…"
                className="min-h-[200px] resize-y text-sm"
                style={MONO}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                aria-label="Prompt input"
              />
              {result && (
                <p className="text-xs text-zinc-500">
                  Input tokens:{" "}
                  <span className="font-medium text-zinc-700" style={MONO}>
                    {result.est.inputTokens.toLocaleString()}
                  </span>
                  {!result.est.inputIsExact && (
                    <span className="ml-1 text-zinc-400">(approx, char-ratio)</span>
                  )}
                  {" · "}task:{" "}
                  <span className="font-medium text-zinc-700">
                    {result.est.detectedTaskType}
                  </span>
                </p>
              )}
            </div>

            {/* Output estimate override */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="output-tokens"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Expected output tokens{" "}
                <span className="font-normal text-zinc-400">(optional override)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="output-tokens"
                  type="text"
                  inputMode="numeric"
                  placeholder={
                    result
                      ? `auto: ${result.est.estimatedOutput.toLocaleString()}`
                      : "auto"
                  }
                  value={outputOverride}
                  onChange={handleOutputChange}
                  className="w-40 rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                  style={MONO}
                  aria-label="Output token override"
                />
                {outputOverride && (
                  <button
                    onClick={() => setOutputOverride("")}
                    className="text-xs text-zinc-400 hover:text-zinc-700"
                    aria-label="Clear output override"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Signal badges */}
            {result && Object.keys(result.rec.signals).length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p
                  className="text-xs font-medium text-zinc-500 uppercase tracking-wide"
                  style={MONO}
                >
                  Detected signals
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(result.rec.signals).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right panel — recommendations */}
          <div className="flex-1 min-w-0">
            {selectedModels.length === 0 ? (
              <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-amber-200 bg-amber-50 text-sm text-amber-700">
                Select at least one model to get recommendations
              </div>
            ) : !prompt.trim() ? (
              <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 text-sm text-zinc-400">
                Enter a prompt to see recommendations
              </div>
            ) : result && result.rec.recommendations.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-red-200 bg-red-50 px-6 py-8 text-center">
                <p className="font-medium text-red-700">
                  None of your selected models support this context length
                </p>
                <p className="mt-1 text-sm text-red-500">
                  Required context:{" "}
                  <span style={MONO}>
                    ~{(result.rec.requiredContext / 1000).toFixed(0)}k
                  </span>{" "}
                  tokens. Select models with larger context windows, or shorten your
                  prompt.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-zinc-500">
                  Required context (input + output + 15% margin):{" "}
                  <span className="font-medium text-zinc-700" style={MONO}>
                    {result?.rec.requiredContext.toLocaleString()} tokens
                  </span>
                </p>
                {result &&
                  result.rec.recommendations.length === 1 &&
                  result.rec.filtered.length + 1 < selectedModels.length && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-3 py-2 border border-amber-200">
                      Only 1 of your selected models fits this context length
                    </p>
                  )}
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  {result?.rec.recommendations.map((rec, i) => (
                    <RecommendationCard
                      key={rec.model.id}
                      rec={rec}
                      rank={i}
                      totalTokens={result.totalTokens}
                    />
                  ))}
                </div>
                {result && result.rec.filtered.length > 0 && (
                  <details className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <summary className="cursor-pointer text-xs font-medium text-zinc-500">
                      {result.rec.filtered.length} model(s) excluded
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {result.rec.filtered.map(({ model, reason }) => (
                        <li key={model.id} className="text-xs text-zinc-500">
                          <span className="font-medium text-zinc-700">
                            {model.displayName}
                          </span>
                          : {reason}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
