import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { ClaraEntry } from "@/components/clara/clara-entry";
import { OfflineSync } from "@/components/pwa/offline-sync";
import { SignedInServiceWorker } from "@/components/pwa/signed-in-service-worker";
import {
  BottomNav,
  LiveBottomNav,
  LiveSettingsLink,
  LiveSidebarNav,
  LiveSidebarSettingsLink,
  SettingsLink,
  SidebarNav,
  SidebarSettingsLink,
} from "./app-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu, UserMenuSkeleton } from "./user-menu";

/*
 * Sidebar on desktop; top bar + bottom tab bar on mobile.
 * Content is a single centered column, max 720px, per the brand book.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="sidebar-deep sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface-raised px-4 py-6 lg:flex">
        <div className="mb-8 flex items-center justify-between pl-2">
          <Link href="/dashboard" aria-label="Finora, ir para a visão geral">
            <Logo size={36} />
          </Link>
          <ThemeToggle />
        </div>
        <Suspense fallback={<SidebarNav pathname="" />}>
          <LiveSidebarNav />
        </Suspense>
        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4">
          <Suspense fallback={<SidebarSettingsLink pathname="" />}>
            <LiveSidebarSettingsLink />
          </Suspense>
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenu />
          </Suspense>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/90 px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 backdrop-blur lg:hidden">
        <Link href="/dashboard" aria-label="Finora, ir para a visão geral">
          <Logo size={32} />
        </Link>
        <div className="flex items-center">
          <ThemeToggle />
          <Suspense fallback={<SettingsLink pathname="" />}>
            <LiveSettingsLink />
          </Suspense>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[720px] px-4 pt-8 pb-28 lg:px-8 lg:pt-16 lg:pb-16">{children}</main>

      <Suspense fallback={<BottomNav pathname="" />}>
        <LiveBottomNav />
      </Suspense>

      <Suspense fallback={null}>
        <ClaraEntry />
        <SignedInServiceWorker />
      </Suspense>
      <OfflineSync />
    </div>
  );
}
