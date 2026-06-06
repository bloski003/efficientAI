import { NextResponse } from "next/server";
import { fetchModels, type FetchResult } from "@/lib/pricing/fetch";
import { invalidatePricingCache } from "@/lib/pricing";

declare global {
  var __pricingCache: FetchResult | undefined;
}

export async function GET() {
  try {
    const result = await fetchModels();
    globalThis.__pricingCache = result;
    invalidatePricingCache();
    return NextResponse.json({
      ok: true,
      modelCount: result.models.length,
      lastSynced: result.lastSynced,
    });
  } catch (err) {
    console.error("[pricing/sync] revalidation failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 502 }
    );
  }
}
