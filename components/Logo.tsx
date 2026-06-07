type LogoSize = "sm" | "md" | "lg";

const SIZE_PX: Record<LogoSize, number> = {
  sm: 28,
  md: 42,
  lg: 56,
};

type Props = {
  size?: LogoSize;
  wordmark?: boolean;
  variant?: "light" | "dark";
};

export function Logo({ size = "md", wordmark = true, variant = "dark" }: Props) {
  const px = SIZE_PX[size];
  const textSize =
    size === "sm" ? "text-sm" : size === "lg" ? "text-2xl" : "text-lg";

  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={px}
        height={px}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* CSS classes (not Tailwind arbitrary values) so dark-mode vars apply */}
        <rect width="44" height="44" rx="11" className="logo-mark-bg" />
        <path
          d="M12 12L28 22L12 32"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="logo-mark-path"
        />
      </svg>
      {wordmark && (
        <span
          className={`${textSize} leading-none tracking-tight`}
          style={{ fontFamily: "var(--font-syne)" }}
        >
          <span style={{ fontWeight: 800, color: variant === "dark" ? "#F0F4FF" : undefined }}>More</span>
          <span style={{ fontWeight: 400, color: variant === "dark" ? "#4a9a7a" : undefined }} className={variant === "dark" ? undefined : "text-muted-foreground"}>
            Per
          </span>
          <span className={variant === "dark" ? undefined : "logo-token"} style={{ fontWeight: 800, color: variant === "dark" ? "#1D9E75" : undefined }}>
            Token
          </span>
        </span>
      )}
    </div>
  );
}
