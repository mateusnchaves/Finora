import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/*
 * One primary button per screen at most; the rest are secondary or ghost.
 * Labels use an infinitive verb: "Adicionar despesa", "Ver extrato".
 */
const variants = {
  primary: "border-transparent bg-brand px-5 text-on-brand hover:bg-brand-hover",
  secondary: "border-border-strong px-5 text-ink hover:bg-brand-tint",
  ghost: "border-transparent px-3 text-brand hover:bg-brand-tint",
  /** Low-emphasis actions repeated on every list row. */
  quiet: "border-transparent px-3 text-ink-muted hover:bg-brand-tint hover:text-ink",
  danger: "border-transparent bg-negative-tint px-5 text-negative hover:brightness-95",
} as const;

export type ButtonVariant = keyof typeof variants;

export function buttonClasses(variant: ButtonVariant = "primary", className?: string) {
  return cn(
    "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border-[1.5px]",
    "text-body font-semibold transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-border disabled:text-ink-muted",
    variants[variant],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant };

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}
