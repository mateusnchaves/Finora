import type { ComponentProps } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/** Labeled text input. Borders use `border-strong` (3:1 on surface in both themes). */
export function Field({
  label,
  hint,
  className,
  id,
  name,
  ...props
}: ComponentProps<"input"> & { label: string; hint?: string; name: string }) {
  const inputId = id ?? `field-${name}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-label text-ink-muted">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        aria-describedby={hintId}
        className={cn(
          "min-h-11 rounded-md border-[1.5px] border-border-strong bg-surface-raised px-3.5 text-body text-ink",
          "placeholder:text-ink-muted/70 focus-visible:border-focus",
        )}
        {...props}
      />
      {hint && (
        <p id={hintId} className="text-body-sm text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Real alert box: `negative` on `negative-tint`, always with an icon and words. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-md bg-negative-tint px-3.5 py-3 text-body-sm text-negative">
      <Icon name="error" size={18} className="mt-px shrink-0" />
      {message}
    </p>
  );
}
