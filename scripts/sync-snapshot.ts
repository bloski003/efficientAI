/**
 * Fetches live pricing from models.dev and writes lib/pricing/snapshot.json.
 * Run once after cloning or whenever you want to refresh the committed fallback:
 *   npx tsx scripts/sync-snapshot.ts
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { fetchModels } from "../lib/pricing/fetch";

async function main() {
  console.log("Fetching models.dev...");
  const result = await fetchModels();

  const output = {
    lastSynced: result.lastSynced,
    models: result.models,
  };

  const dest = join(__dirname, "../lib/pricing/snapshot.json");
  writeFileSync(dest, JSON.stringify(output, null, 2) + "\n", "utf-8");

  console.log(
    `Done. Wrote ${result.models.length} models to lib/pricing/snapshot.json`
  );
  console.log("Models:");
  for (const m of result.models) {
    console.log(
      `  ${m.id} (${m.provider}) — $${m.inputPricePerM}/$${m.outputPricePerM} per M tokens`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
