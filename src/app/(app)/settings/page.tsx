import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Card, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Configurações" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Configurações" />
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
    </>
  );
}
