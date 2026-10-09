import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";

/** Empty screens explain the next step: "Nenhuma despesa neste mês. Adicione a primeira." */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-pill bg-brand-tint text-brand">
        <Icon name={icon} size={28} />
      </span>
      <h2 className="font-display text-heading-md text-ink">{title}</h2>
      <p className="mt-2 max-w-sm text-body text-ink-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}
