import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu, UserMenuSkeleton } from "@/components/layout/user-menu";
import { Card, CardTitle } from "@/components/ui/card";

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
