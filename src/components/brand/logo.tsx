import { cn } from "@/lib/cn";

/*
 * The Finora mark: an ivory geometric F on blu notte with a gold dot.
 * Colors come from theme tokens, so it matches finora-mark.svg in light
 * mode and finora-mark-dark.svg in dark mode. Minimum size: 24px.
 */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      role="img"
      aria-label="Finora"
      className={cn("shrink-0", className)}
    >
      <rect width="96" height="96" rx="21.5" className="fill-deep" />
      <g transform="translate(-3 -3)">
        <path
          className="fill-on-deep"
          d="M30 70V30a4 4 0 0 1 4-4h32a6 6 0 0 1 0 12H42v8h18a6 6 0 0 1 0 12H42v12a6 6 0 0 1-12 0z"
        />
        <circle cx="60" cy="70" r="6" className="fill-accent" />
      </g>
    </svg>
  );
}

/** Mark + name, for headers and welcome screens. */
export function Logo({
  size = 36,
  className,
  nameClassName = "text-ink",
}: {
  size?: number;
  className?: string;
  nameClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark size={size} />
      <span
        className={cn("font-display leading-none font-bold tracking-[-0.01em]", nameClassName)}
        style={{ fontSize: Math.round(size * 0.75) }}
        aria-hidden="true"
      >
        Finora
      </span>
    </span>
  );
}
