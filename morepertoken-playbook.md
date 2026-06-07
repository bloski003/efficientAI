# MorePerToken — Build Playbook

A staged plan for building with Claude Code. Decisions are already made so you can move fast.
Build in order. Ship Phase 1 publicly before you touch Phase 2.

---

## 0. Decisions made for you (and why)

| Question | Decision | Why |
|---|---|---|
| What's the MVP? | Recommender + cost calculator, **no keys, no execution** | Fastest to ship, zero key liability, most shareable, and it's the differentiated part |
| Pricing data | **Fetched live** from an open dataset (`models.dev`), with a committed fallback snapshot + `lastSynced` shown in UI | Hardcoded prices are wrong within weeks; live + visible timestamp = trust |
| Execution (Phase 2) | **Client-side, direct browser → provider** by default; thin opt-in proxy only for non-CORS providers | Makes "keys never leave your browser" literally true |
| Key storage | Passphrase-derived AES-GCM (PBKDF2), passphrase **never persisted** | Real protection, not theatre; you state the threat model openly |
| Token Slimmer | **Suggests** edits the user approves; never silent rewriting | Silent prompt edits change meaning and destroy trust |
| Recommendation logic | Explicit, transparent scoring with a visible "why" + 3 options across a price/quality gradient | A recommendation you can see the reasoning behind is one people trust |
| Monetization | Free = recommender + estimate; Pro = execution presets, history, slimmer, usage analytics | Keeps the free hook truly free and shareable |

**Your real edge** isn't the proxy (OpenRouter, Vercel AI Gateway, Portkey, LiteLLM, Helicone, NotDiamond, Martian all exist). It's the **transparent recommend-and-explain layer** — and your Silicon Mobility channel is the distribution engine for it.

---

## 1. Stack

- **Next.js (App Router) + TypeScript** — as you planned
- **Tailwind + shadcn/ui** — clean, trustworthy UI fast, no bespoke component debt
- **Zod** — validate the pricing config at runtime so bad data can't silently produce wrong costs
- **gpt-tokenizer** — accurate token counts for OpenAI-family; approximation + range for others
- **Vercel AI SDK** — Phase 2 only, for streaming
- **Vitest** — unit tests for the pure pricing/recommendation logic
- Hosting: Vercel. Analytics: Plausible (privacy-friendly, on-brand for a trust product)

---

## 2. The phases

**Phase 0 — Scaffold + data layer.** Repo, `CLAUDE.md`, pricing fetch + Zod validation + fallback snapshot. No UI yet.

**Phase 1 — MVP (ship this).** Token estimator → recommendation engine → cost-comparison UI. No keys. This is the public free tool.

**Phase 2 — Execution.** BYO key, client-side direct-to-provider, encrypted local storage, streaming chat. Proxy fallback only where CORS forces it.

**Phase 3 — Premium.** Saved presets, local history, the (approve-first) Token Slimmer, usage analytics, export. Paywall.

**Phase 4 — Trust, polish, launch.** Privacy page + threat model, open-source the client crypto, SEO landing, YouTube tie-in.

Ship Phase 1 to real users and gather feedback before committing to 2–4. Demand for the calculator validates the rest.

---

## 3. Drop this in as `CLAUDE.md` at the repo root first

Claude Code reads this automatically every session. It's the highest-leverage thing you'll do.

```markdown
# Project: MorePerToken

## What this is
A web app that estimates an LLM prompt's cost and recommends the most cost-efficient
capable model, with a transparent explanation. Premium users can run prompts with
their own API keys. Trust and accuracy are the product.

## Non-negotiable rules
- NEVER hardcode model prices in components or logic. All pricing comes from
  `lib/pricing/` which fetches from an open dataset and falls back to a committed
  snapshot. The UI always shows when prices were last synced.
- NEVER log, store, or transmit a user's API key to our server. Phase 2 execution
  is client-side, browser → provider directly. Any proxy is opt-in and stateless.
- Cost figures shown to users are ESTIMATES and must be labelled as such, shown as a
  range, never as false-precise single numbers.
- The recommendation engine must always output a human-readable reason. No black box.
- The Token Slimmer suggests edits for the user to approve. It never rewrites silently.

## Stack
Next.js App Router, TypeScript (strict), Tailwind, shadcn/ui, Zod, gpt-tokenizer,
Vitest. Vercel AI SDK is used only for Phase 2 streaming.

## Conventions
- Pure logic (pricing, tokenizing, recommendation) lives in `lib/` and is unit-tested.
- Validate all external data (fetched pricing) with Zod at the boundary.
- Components are server components by default; mark client components explicitly.
- Mobile-first responsive. Accessible (labels, focus states, keyboard nav).

## Ask before
- Adding any backend route that handles user keys.
- Adding any third-party script or analytics.
- Changing the pricing data source.

## After every task
Run `npm run typecheck && npm run lint && npm run build` and fix anything broken
before considering the task done. Write/extend tests for any logic in `lib/`.
```

---

## 4. The prompts (one per phase, paste into Claude Code)

> Workflow for each: start a fresh session, run `/clear`, enter **plan mode** (Shift+Tab to cycle), paste the prompt, **review the plan before approving**, then let it execute. Commit when green.

### Phase 0 — Scaffold + pricing data layer

```
Scaffold a Next.js (App Router, TypeScript strict) project with Tailwind and
shadcn/ui initialised. Add Zod, gpt-tokenizer, and Vitest. Set up npm scripts:
dev, build, lint, typecheck, test.

Then build the pricing data layer in lib/pricing/ ONLY (no UI yet):

1. Define a Zod schema for a model entry: id (provider API string), displayName,
   provider, inputPricePerM, outputPricePerM, contextWindow, maxOutput, and a
   `capabilities` array of tags from: coding, structured_json, reasoning,
   long_context, data_cleaning, casual_chat, summarization, document_analysis.
   Add a quality tier: budget | balanced | frontier.

2. Fetch the model list + pricing from the open models.dev dataset at build time
   AND expose a runtime revalidation path. Map it into our schema, validate with Zod,
   and DROP any entry that fails validation (log it, don't crash).

3. Commit a fallback snapshot (a typed JSON file) used when the fetch fails, and
   expose a `lastSynced` timestamp.

4. Seed our capability tags and quality tiers for these models specifically, since
   the dataset won't have our tags: DeepSeek V3.2, DeepSeek V4, GPT-4.1 Nano,
   GPT-5.4 Nano, GPT-5.4 Mini, GPT-5.4, GPT-5.5, Gemini 2.5 Flash-Lite,
   Gemini 2.5 Flash, Gemini 3 Pro, Claude Haiku, Claude Sonnet, Claude Opus.
   Use the live dataset for prices; do NOT hardcode prices — only the tags/tiers.

5. Unit-test the validation and fallback paths.

Do not invent prices from memory. Prices come only from the fetched dataset or the
fallback snapshot.
```

*(After this runs: spot-check a few prices in the snapshot against the provider pricing pages yourself. Don't trust any model's memory of prices, including Claude Code's.)*

### Phase 1 — MVP: estimator + recommender + UI

```
Build the token estimator and recommendation engine in lib/, then the UI. No API
keys, no execution anywhere in this phase.

TOKEN ESTIMATOR (lib/tokens/):
- Use gpt-tokenizer for OpenAI-family counts.
- For non-OpenAI models, approximate with a chars/token ratio and LABEL the result
  as an approximation.
- Return input tokens, an estimated output-token default (heuristic: 1x input capped
  at 1000, or higher if a generation/coding task is detected), and let the user
  override the output estimate.

RECOMMENDATION ENGINE (lib/recommend/) — implement EXACTLY this, no improvising:
- Detect task signals from the prompt via keyword/regex sets for each capability tag,
  WITH simple negation handling (e.g. "no code" should not trigger coding). Treat
  >128k required tokens as a long_context signal.
- requiredContext = inputTokens + estimatedOutput + 15% margin.
- Filter out any model whose contextWindow < requiredContext, and any model below
  `balanced` tier when reasoning/critical signals are strongly present.
- For each surviving model compute estimatedCost =
  inputTokens/1e6 * inputPrice + estimatedOutput/1e6 * outputPrice.
- Return THREE recommendations across a gradient: "cheapest that fits",
  "balanced", "premium". Each must include: model, estimatedCost as a RANGE (+/-15%),
  savings vs a configurable baseline (default GPT-5.5), and a human-readable `reasons`
  array referencing the actual signals and constraints that drove the pick.
- Unit-test the engine with prompts that exercise each signal, negation, and the
  context-window filter.

UI (app/page.tsx + components):
- Split layout (stacks on mobile): left = prompt input + output-estimate control +
  baseline selector; right = the three recommendation cards, each showing model,
  cost range, savings, and an expandable "Why this model" list.
- A clear header strip: "Estimates only" + "Prices last synced {lastSynced}".
- shadcn/ui, clean, accessible. No dark patterns, no fake precision.
```

### Phase 2 — Execution (client-side, BYO key)

```
Add optional prompt execution. Keys must NEVER reach our server.

CRYPTO (lib/crypto/):
- AES-GCM via Web Crypto. Derive the key from a user passphrase with PBKDF2.
  The passphrase is NEVER persisted. Store only ciphertext + IV + salt in
  localStorage. Provide encrypt/decrypt and a clear "this is locked until you enter
  your passphrase this session" flow.
- Add UI copy stating plainly what this protects against (DB breach, casual
  inspection) and what it does not (XSS, malware on your device).

EXECUTION:
- Default path: call the provider directly from the browser using the Vercel AI SDK
  client utilities / fetch with SSE parsing, and stream into a chat panel. Add the
  Anthropic browser-access header where required.
- For any provider that does NOT allow browser CORS calls, do NOT silently proxy.
  Show the user that execution for that provider needs an opt-in stateless proxy, and
  only enable it if they explicitly turn it on. The proxy must never log or store the
  key.
- Validate a key (cheap test call) before saving it. Handle stream errors, rate
  limits, and provider-down gracefully with clear messages.
- Add a "Run with recommended model" button wired to the Phase 1 recommendation.
```

### Phase 3 — Premium layer

```
Add the premium features behind a simple gate (free tier = recommender + estimate +
N executions/day; pro = unlimited + the below). Use Stripe Checkout for upgrade;
keep entitlement state minimal.

- Saved prompt presets and local execution history (stored locally, exportable).
- Token Slimmer: analyse the prompt and SUGGEST removable filler / redundancy with
  estimated token+cost savings. The user reviews and approves each change; nothing is
  rewritten silently. Prefer deterministic detection; if an LLM pass is used, say so.
- Usage analytics dashboard: spend over time, by model, estimated savings realised.
- Export (CSV/JSON) of history and analytics.
```

### Phase 4 — Trust, polish, launch

```
Prepare for public launch.

- Add a /privacy page and an in-app threat-model statement matching how keys are
  actually handled. Make the client-side crypto + execution code open-source and link
  to the repo from the UI.
- Build an SEO landing page targeting "LLM cost calculator" / "which AI model should
  I use" with the free recommender embedded above the fold.
- Add Plausible analytics (no cookies). Add a lightweight feedback widget.
- Final pass: mobile, accessibility (axe), Lighthouse, empty/error/loading states,
  and a build that passes typecheck + lint + tests.
```

---

## 5. How to actually drive Claude Code

- **`CLAUDE.md` first.** Everything above assumes it's in place. Update it as decisions evolve.
- **Plan mode before every phase.** Let it produce a plan, read it, push back, *then* approve. Don't let it one-shot a whole phase blind.
- **`/clear` between phases** so context from Phase 1 doesn't pollute Phase 3.
- **Commit per logical step; branch per phase** (`git checkout -b phase-1`). Frequent commits are your undo button when it goes sideways.
- **Make it test the pure logic.** Pricing and recommendation are pure functions — cheap to test, and tests catch the costly-to-users bugs (wrong cost, wrong filter).
- **Force the build gate.** The `CLAUDE.md` already tells it to run typecheck/lint/build after each task; hold it to that.
- **Never trust price recall.** The model will confidently state stale prices. Prices come from the fetch + your own spot-check, full stop.
- **Give the recommendation spec verbatim.** It's in the Phase 1 prompt for a reason — left to improvise, it invents an arbitrary heuristic.

---

## 6. Launch sequence

1. Ship Phase 1 as a free public tool at a clean domain.
2. One Silicon Mobility video: "I built a tool to stop overpaying for AI APIs — here's how to pick the right model." Link in description.
3. Watch which prompts people paste (Plausible event, no content stored) to learn what tasks dominate — that tells you which capabilities to refine.
4. Only build Phase 2+ if the calculator gets real, repeat usage. Demand first, execution second.
