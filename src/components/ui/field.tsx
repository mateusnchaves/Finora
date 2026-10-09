import type { ComponentProps, ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const controlClasses = cn(
  "min-h-11 w-full rounded-md border-[1.5px] border-border-strong bg-surface-raised px-3.5 text-body text-ink",
  "placeholder:text-ink-muted/70 focus-visible:border-focus",
  "aria-invalid:border-negative",
);

type FieldShellProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: (describedBy: string | undefined) => ReactNode;
};

/** Label + control + hint/error, wired with aria-describedby. */
function FieldShell({ id, label, hint, error, className, children }: FieldShellProps) {
  const messageId = error || hint ? `${id}-message` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-label text-ink-muted">
        {label}
      </label>
      {children(messageId)}
      {error ? (
        <p id={messageId} className="flex items-center gap-1 text-body-sm text-negative">
          <Icon name="error" size={16} />
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="text-body-sm text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

type FieldProps = { label: string; hint?: string; error?: string; name: string };

/** Labeled text input. Borders use `border-strong` (3:1 on surface in both themes). */
export function Field({ label, hint, error, className, id, name, ...props }: ComponentProps<"input"> & FieldProps) {
  const inputId = id ?? `field-${name}`;
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} className={className}>
      {(describedBy) => (
        <input
          id={inputId}
          name={name}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={controlClasses}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className,
  id,
  name,
  children,
  ...props
}: ComponentProps<"select"> & FieldProps) {
  const selectId = id ?? `field-${name}`;
  return (
    <FieldShell id={selectId} label={label} hint={hint} error={error} className={className}>
      {(describedBy) => (
        <div className="relative">
          <select
            id={selectId}
            name={name}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            className={cn(controlClasses, "cursor-pointer appearance-none pr-10")}
            {...props}
          >
            {children}
          </select>
          <Icon
            name="expand_more"
            size={20}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-muted"
          />
        </div>
      )}
    </FieldShell>
  );
}

export function TextareaField({
  label,
  hint,
  error,
  className,
  id,
  name,
  ...props
}: ComponentProps<"textarea"> & FieldProps) {
  const textareaId = id ?? `field-${name}`;
  return (
    <FieldShell id={textareaId} label={label} hint={hint} error={error} className={className}>
      {(describedBy) => (
        <textarea
          id={textareaId}
          name={name}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(controlClasses, "min-h-24 py-2.5")}
          {...props}
        />
      )}
    </FieldShell>
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
