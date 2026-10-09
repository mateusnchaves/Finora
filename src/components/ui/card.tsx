import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Raised card on `surface`: radius-lg, shadow-card, padding space-5. */
export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-lg bg-surface-raised p-6 shadow-card", className)} {...props} />;
}

/** Card and list title in Bodoni Moda (heading-md, never below 20px). */
export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("font-display text-heading-md text-ink", className)} {...props} />;
}
