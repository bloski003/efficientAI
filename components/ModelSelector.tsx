"use client";

import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import type { ModelEntry } from "@/lib/pricing/schema";
import { ChevronDown, ChevronUp } from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  budget: "bg-emerald-100 text-emerald-800",
  balanced: "bg-blue-100 text-blue-800",
  frontier: "bg-purple-100 text-purple-800",
};

function formatPricePer1k(perM: number): string {
  const per1k = perM / 1000;
  if (per1k < 0.0001) return "<$0.0001";
  if (per1k < 0.01) return `$${per1k.toFixed(4)}`;
  return `$${per1k.toFixed(3)}`;
}

type Props = {
  models: ModelEntry[];
  selectedIds: Set<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (ids: Set<string>) => void;
};

export function ModelSelector({ models, selectedIds, open, onOpenChange, onChange }: Props) {
  const grouped = models.reduce<Record<string, ModelEntry[]>>((acc, m) => {
    (acc[m.provider] ??= []).push(m);
    return acc;
  }, {});

  const toggleModel = useCallback(
    (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onChange(next);
    },
    [selectedIds, onChange]
  );

  const toggleProvider = useCallback(
    (providerModels: ModelEntry[]) => {
      const ids = providerModels.map((m) => m.id);
      const allSelected = ids.every((id) => selectedIds.has(id));
      const next = new Set(selectedIds);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      onChange(next);
    },
    [selectedIds, onChange]
  );

  const toggleAll = useCallback(() => {
    if (selectedIds.size === models.length) onChange(new Set());
    else onChange(new Set(models.map((m) => m.id)));
  }, [selectedIds, models, onChange]);

  const summary = `${selectedIds.size} of ${models.length} models selected`;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors rounded-lg"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
      >
        <span>Model selection</span>
        <span className="flex items-center gap-2">
          <span className={`text-xs ${selectedIds.size === 0 ? "text-red-500 font-semibold" : "text-zinc-500"}`}>
            {summary}
          </span>
          {open ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-zinc-100 px-4 pb-4 pt-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-500">Pick which models to consider</span>
            <button
              onClick={toggleAll}
              className="text-xs text-zinc-500 hover:text-zinc-800 underline"
            >
              {selectedIds.size === models.length ? "Deselect all" : "Select all"}
            </button>
          </div>

          <div className="space-y-4">
            {Object.entries(grouped).map(([provider, providerModels]) => {
              const allSelected = providerModels.every((m) => selectedIds.has(m.id));
              return (
                <div key={provider}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400 capitalize">
                      {provider}
                    </span>
                    <button
                      onClick={() => toggleProvider(providerModels)}
                      className="text-xs text-zinc-400 hover:text-zinc-700"
                    >
                      {allSelected ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {providerModels.map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center gap-2.5 py-1.5 px-2 rounded hover:bg-zinc-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(m.id)}
                          onChange={() => toggleModel(m.id)}
                          className="h-3.5 w-3.5 rounded accent-zinc-700 shrink-0"
                          aria-label={`Include ${m.displayName}`}
                        />
                        <span className="flex-1 min-w-0 text-sm text-zinc-700 truncate">
                          {m.displayName}
                        </span>
                        <Badge
                          className={`${TIER_COLORS[m.qualityTier]} shrink-0 border-0 text-xs`}
                        >
                          {m.qualityTier}
                        </Badge>
                        <span className="text-xs text-zinc-400 shrink-0 tabular-nums whitespace-nowrap">
                          {formatPricePer1k(m.inputPricePerM)}&thinsp;/&thinsp;{formatPricePer1k(m.outputPricePerM)}
                          <span className="text-zinc-300"> /1k</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
