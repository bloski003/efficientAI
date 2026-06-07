import { getModels } from "@/lib/pricing";
import RouterClient from "@/components/RouterClient";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { models, lastSynced, source } = await getModels();

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero — dark section */}
        <section
          style={{
            backgroundColor: "#060f0c",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Orb 1 — top-right */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "-80px",
              right: "-80px",
              width: "320px",
              height: "320px",
              borderRadius: "9999px",
              background:
                "radial-gradient(circle, rgba(29,158,117,0.18) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          {/* Orb 2 — bottom-left */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              bottom: "40px",
              left: "8%",
              width: "200px",
              height: "200px",
              borderRadius: "9999px",
              background:
                "radial-gradient(circle, rgba(15,110,86,0.12) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <div className="mx-auto max-w-6xl px-4 pt-12 pb-10" style={{ position: "relative" }}>
            {/* Pill badge */}
            <div
              style={{
                display: "inline-block",
                background: "rgba(29,158,117,0.15)",
                border: "0.5px solid rgba(29,158,117,0.35)",
                borderRadius: "9999px",
                padding: "4px 14px",
                marginBottom: "20px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "#5DCAA5",
                }}
              >
                {models.length} models · prices synced live
              </span>
            </div>

            <h1
              className="font-extrabold tracking-tight"
              style={{
                fontFamily: "var(--font-syne)",
                fontWeight: 800,
                fontSize: "clamp(36px, 6vw, 72px)",
                whiteSpace: "normal",
                textAlign: "left",
              }}
            >
              <span style={{ color: "#F0F4FF" }}>Get more from </span>
              <span style={{ color: "#1D9E75" }}>every token</span>
            </h1>
            <p
              className="mt-3 max-w-xl text-lg"
              style={{
                fontFamily: "var(--font-syne)",
                fontWeight: 400,
                color: "#7aaa95",
              }}
            >
              Paste your prompt. MorePerToken recommends the right model for the
              task — and shows you exactly why.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span
                className="text-xs"
                style={{ fontFamily: "var(--font-mono)", color: "#4a9a7a" }}
              >
                <span style={{ color: "#1D9E75" }}>✓</span> No account needed
              </span>
              <span aria-hidden style={{ color: "#1a3d2e" }}>·</span>
              <span
                className="text-xs"
                style={{ fontFamily: "var(--font-mono)", color: "#4a9a7a" }}
              >
                <span style={{ color: "#1D9E75" }}>✓</span> Prices synced live
              </span>
              <span aria-hidden style={{ color: "#1a3d2e" }}>·</span>
              <span
                className="text-xs"
                style={{ fontFamily: "var(--font-mono)", color: "#4a9a7a" }}
              >
                <span style={{ color: "#1D9E75" }}>✓</span> Your prompt stays local
              </span>
            </div>
          </div>
        </section>

        <RouterClient models={models} lastSynced={lastSynced} source={source} />
      </main>
      <Footer />
    </>
  );
}
