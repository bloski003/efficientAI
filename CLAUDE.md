\# Project: MorePerToken



\## What this is

A web app that estimates an LLM prompt's cost and recommends the most cost-efficient

capable model, with a transparent explanation. Premium users can run prompts with

their own API keys. Trust and accuracy are the product.



\## Non-negotiable rules

\- NEVER hardcode model prices in components or logic. All pricing comes from

&#x20; `lib/pricing/` which fetches from an open dataset and falls back to a committed

&#x20; snapshot. The UI always shows when prices were last synced.

\- NEVER log, store, or transmit a user's API key to our server. Phase 2 execution

&#x20; is client-side, browser → provider directly. Any proxy is opt-in and stateless.

\- Cost figures shown to users are ESTIMATES and must be labelled as such, shown as a

&#x20; range, never as false-precise single numbers.

\- The recommendation engine must always output a human-readable reason. No black box.

\- The Token Slimmer suggests edits for the user to approve. It never rewrites silently.



\## Stack

Next.js App Router, TypeScript (strict), Tailwind, shadcn/ui, Zod, gpt-tokenizer,

Vitest. Vercel AI SDK is used only for Phase 2 streaming.



\## Conventions

\- Pure logic (pricing, tokenizing, recommendation) lives in `lib/` and is unit-tested.

\- Validate all external data (fetched pricing) with Zod at the boundary.

\- Components are server components by default; mark client components explicitly.

\- Mobile-first responsive. Accessible (labels, focus states, keyboard nav).



\## Ask before

\- Adding any backend route that handles user keys.

\- Adding any third-party script or analytics.

\- Changing the pricing data source.



\## After every task

Run `npm run typecheck \&\& npm run lint \&\& npm run build` and fix anything broken

before considering the task done. Write/extend tests for any logic in `lib/`.

