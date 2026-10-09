import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-heading-lg text-ink">{title}</h1>
        {description && <p className="mt-1 text-body text-ink-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}
