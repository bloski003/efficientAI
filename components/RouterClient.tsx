"use client";

import { useState, useMemo, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModelEntry } from "@/lib/pricing/schema";
import { estimateTokens } from "@/lib/tokens";
import { recommendFromPrompt, type Recommendation } from "@/lib/recommend";
import { ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  models: ModelEntry[];
  lastSynced: string;
  source: "live" | "fallback";
};

const BASELINE_OPTIONS = [
  { id: "gpt-5.5", label: "GPT-5.5" },
  { id: "gpt-5.4", label: "GPT-5.4" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

const TIER_COLORS: Record<string, string> = {
  budget: "bg-emerald-100 text-emerald-800",
  balanced: "bg-blue-100 text-blue-800",
  frontier: "bg-purple-100 text-purple-800",
};

const SLOT_LABELS: Record<string, string> = {
  cheapest: "Most Affordable",
  balanced: "Balanced",
  premium: "Premium",
};

const SLOT_BORDER: Record<string, string> = {
  cheapest: "border-emerald-200",
  balanced: "border-blue-200",
  premium: "border-purple-200",
};

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

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className={`border-2 ${SLOT_BORDER[rec.slot]}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">
              {SLOT_LABELS[rec.slot]}
            </p>
            <CardTitle className="text-base leading-tight">{rec.model.displayName}</CardTitle>
            <p className="text-xs text-zinc-500 mt-0.5 capitalize">{rec.model.provider}</p>
          </div>
          <Badge className={`${TIER_COLORS[rec.model.qualityTier]} shrink-0 border-0 text-xs`}>
            {rec.model.qualityTier}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Cost range */}
        <div className="rounded-md bg-zinc-50 px-3 py-2">
          <p className="text-xs text-zinc-500 mb-0.5">Estimated cost (±15%)</p>
          <p className="font-mono text-sm font-semibold">
            {formatCost(rec.costRange.low)} – {formatCost(rec.costRange.high)}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">mid: {formatCost(rec.costRange.mid)}</p>
        </div>

        {/* Savings */}
        {Math.abs(rec.savingsVsBaseline) > 0.00001 && (
          <p className={`text-xs font-medium ${rec.savingsVsBaseline > 0 ? "text-emerald-600" : "text-red-500"}`}>
            {rec.savingsVsBaseline > 0
              ? `Saves ~${formatCost(rec.savingsVsBaseline)} vs baseline`
              : `~${formatCost(Math.abs(rec.savingsVsBaseline))} more than baseline`}
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
          <ul className="space-y-1 pl-1">
            {rec.reasons.map((r, i) => (
              <li key={i} className="text-xs text-zinc-600 flex gap-1.5">
                <span className="mt-0.5 text-zinc-400">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function RouterClient({ models, lastSynced, source }: Props) {
  const [prompt, setPrompt] = useState("");
  const [outputOverride, setOutputOverride] = useState<string>("");
  const [baselineId, setBaselineId] = useState("gpt-5.5");

  const validBaselines = useMemo(
    () =>
      BASELINE_OPTIONS.filter((opt) =>
        models.some((m) => m.id === opt.id)
      ),
    [models]
  );

  const result = useMemo(() => {
    if (!prompt.trim()) return null;
    const est = estimateTokens(prompt, "gpt-5.5", outputOverride ? Number(outputOverride) : undefined);
    return {
      est,
      rec: recommendFromPrompt(models, prompt, est.inputTokens, est.estimatedOutput, baselineId),
    };
  }, [prompt, outputOverride, baselineId, models]);

  const handleOutputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === "" || /^\d+$/.test(v)) setOutputOverride(v);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header strip */}
      <header className="w-full border-b border-zinc-200 bg-amber-50 px-4 py-2.5">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">
              Estimates only
            </span>
            <span className="text-xs text-zinc-600">
              All costs are approximate ranges — not guarantees.
            </span>
          </div>
          <span className="text-xs text-zinc-500">
            Prices last synced:{" "}
            <span className="font-medium text-zinc-700">{formatSynced(lastSynced)}</span>
            {source === "fallback" && (
              <span className="ml-1.5 rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-600">
                offline snapshot
              </span>
            )}
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">LLM Router</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Paste your prompt to get cost estimates and model recommendations.
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Left panel */}
          <div className="flex flex-col gap-5 lg:w-[420px] shrink-0">
            {/* Prompt */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="prompt" className="text-sm font-medium text-zinc-700">
                Your prompt
              </label>
              <Textarea
                id="prompt"
                placeholder="Paste or type your prompt here…"
                className="min-h-[200px] resize-y font-mono text-sm"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                aria-label="Prompt input"
              />
              {result && (
                <p className="text-xs text-zinc-500">
                  Input tokens:{" "}
                  <span className="font-medium text-zinc-700">{result.est.inputTokens.toLocaleString()}</span>
                  {!result.est.inputIsExact && (
                    <span className="ml-1 text-zinc-400">(approx, char-ratio)</span>
                  )}
                  {" · "}task:{" "}
                  <span className="font-medium text-zinc-700">{result.est.detectedTaskType}</span>
                </p>
              )}
            </div>

            {/* Output estimate override */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="output-tokens" className="text-sm font-medium text-zinc-700">
                Expected output tokens{" "}
                <span className="font-normal text-zinc-400">(optional override)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="output-tokens"
                  type="text"
                  inputMode="numeric"
                  placeholder={result ? `auto: ${result.est.estimatedOutput.toLocaleString()}` : "auto"}
                  value={outputOverride}
                  onChange={handleOutputChange}
                  className="w-40 rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
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

            {/* Baseline selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Savings baseline</label>
              <Select value={baselineId} onValueChange={setBaselineId}>
                <SelectTrigger className="w-48" aria-label="Savings baseline model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {validBaselines.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                  {validBaselines.length === 0 && (
                    <SelectItem value="gpt-5.5">GPT-5.5</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-400">Savings are shown relative to this model.</p>
            </div>

            {/* Signal badges */}
            {result && Object.keys(result.rec.signals).length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
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
            {!prompt.trim() ? (
              <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 text-sm text-zinc-400">
                Enter a prompt to see recommendations
              </div>
            ) : result && result.rec.recommendations.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-red-200 bg-red-50 px-6 py-8 text-center">
                <p className="font-medium text-red-700">No models fit your requirements</p>
                <p className="mt-1 text-sm text-red-500">
                  Required context: ~{(result.rec.requiredContext / 1000).toFixed(0)}k tokens.
                  Try shortening your prompt or reducing the output estimate.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-zinc-500">
                  Required context (input + output + 15% margin):{" "}
                  <span className="font-medium text-zinc-700">
                    {result?.rec.requiredContext.toLocaleString()} tokens
                  </span>
                </p>
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  {result?.rec.recommendations.map((rec) => (
                    <RecommendationCard key={rec.model.id} rec={rec} />
                  ))}
                </div>
                {result && result.rec.filtered.length > 0 && (
                  <details className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <summary className="cursor-pointer text-xs font-medium text-zinc-500">
                      {result.rec.filtered.length} model(s) excluded
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {result.rec.filtered.map(({ model, reason }) => (
                        <li key={model.id} className="text-xs text-zinc-500">
                          <span className="font-medium text-zinc-700">{model.displayName}</span>:{" "}
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
