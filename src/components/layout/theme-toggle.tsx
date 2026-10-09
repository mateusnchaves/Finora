"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/*
 * The current theme lives on <html data-theme>, set before paint by the
 * root layout. Both icons are rendered and CSS shows the right one, so the
 * server and client markup always match.
 */
export function ThemeToggle({ className }: { className?: string }) {
  function toggleTheme() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("finora-theme", next);
    } catch {
      // Storage can be blocked (private mode); the theme still applies for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-brand-tint hover:text-ink",
        className,
      )}
    >
      <Icon name="dark_mode" className="dark:hidden" />
      <Icon name="light_mode" className="hidden dark:inline-block" />
      <span className="sr-only">
        <span className="dark:hidden">Ativar tema escuro</span>
        <span className="hidden dark:inline">Ativar tema claro</span>
      </span>
    </button>
  );
}
