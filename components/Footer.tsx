import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer
      className="w-full mt-auto"
      style={{ borderTop: "0.5px solid hsl(var(--border))", backgroundColor: "#f4faf7" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <Logo size="sm" wordmark={false} />
          <span
            className="text-sm text-zinc-400"
            style={{ fontFamily: "var(--font-syne)", fontWeight: 400 }}
          >
            © 2026 MorePerToken
          </span>
        </div>
        <nav className="flex items-center gap-5">
          <Link
            href="/privacy"
            className="text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            style={{ fontFamily: "var(--font-syne)", fontWeight: 400 }}
          >
            Privacy
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            style={{ fontFamily: "var(--font-syne)", fontWeight: 400 }}
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
