import type { Metadata } from "next";
import { AccountForm } from "@/components/finance/account-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Nova conta" };

export default function NewAccountPage() {
  return (
    <>
      <PageHeader title="Nova conta" />
      <Card>
        <AccountForm />
      </Card>
    </>
  );
}
