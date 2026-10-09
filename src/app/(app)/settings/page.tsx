import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu, UserMenuSkeleton } from "@/components/layout/user-menu";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Configurações" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Configurações" />
      <div className="flex flex-col gap-6">
        <Card>
          <CardTitle className="mb-2">Conta</CardTitle>
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenu />
          </Suspense>
        </Card>
        <Card className="p-0">
          <Link
            href="/settings/categories"
            className="flex min-h-11 items-center gap-4 rounded-lg p-6 transition-colors hover:bg-brand-tint/60"
          >
            <span className="grid size-10 place-items-center rounded-pill bg-brand-tint text-brand" aria-hidden="true">
              <Icon name="sell" size={22} />
            </span>
            <span className="flex-1">
              <span className="block font-display text-heading-md text-ink">Categorias</span>
              <span className="block text-body-sm text-ink-muted">Criar, renomear e excluir categorias.</span>
            </span>
            <Icon name="chevron_right" className="text-ink-muted" />
          </Link>
        </Card>
        <Card>
          <CardTitle>Aparência</CardTitle>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-body text-ink">Tema</p>
              <p className="text-body-sm text-ink-muted">Alterne entre o tema claro e o escuro.</p>
            </div>
            <ThemeToggle className="border-[1.5px] border-border-strong" />
          </div>
        </Card>
      </div>
    </>
  );
}
