"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { NAV_ITEMS, SETTINGS_ITEM, type NavItem } from "./nav-items";

/*
 * The navs highlight the active item from the current path. On dynamic routes
 * the path is only known at request time, so the shell renders the
 * `Live*` variants (which read usePathname) inside <Suspense>, with the plain
 * variants and an empty pathname (nothing highlighted) as the fallback.
 */

type PathProps = { pathname: string };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({ item, pathname }: { item: NavItem } & PathProps) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-md px-3 text-body transition-colors duration-150",
        active ? "bg-brand-tint font-semibold text-brand" : "text-ink-muted hover:bg-brand-tint hover:text-ink",
      )}
    >
      <Icon name={item.icon} filled={active} />
      {item.label}
    </Link>
  );
}

/** Desktop navigation, shown in the sidebar from the lg breakpoint. */
export function SidebarNav({ pathname }: PathProps) {
  return (
    <nav aria-label="Principal" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <SidebarLink key={item.href} item={item} pathname={pathname} />
      ))}
    </nav>
  );
}

export function SidebarSettingsLink({ pathname }: PathProps) {
  return <SidebarLink item={SETTINGS_ITEM} pathname={pathname} />;
}

/** Mobile tab bar, fixed to the bottom of the screen below the lg breakpoint. */
export function BottomNav({ pathname }: PathProps) {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface-raised pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-[720px] grid-cols-6">
        {NAV_ITEMS.filter((item) => !item.desktopOnly).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-[12px] leading-none font-semibold",
                  active ? "text-brand" : "text-ink-muted",
                )}
              >
                <Icon name={item.icon} filled={active} />
                {item.shortLabel}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Settings shortcut for the mobile top bar. */
export function SettingsLink({ pathname }: PathProps) {
  const active = isActive(pathname, SETTINGS_ITEM.href);
  return (
    <Link
      href={SETTINGS_ITEM.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-md transition-colors hover:bg-brand-tint",
        active ? "text-brand" : "text-ink-muted hover:text-ink",
      )}
    >
      <Icon name={SETTINGS_ITEM.icon} filled={active} />
      <span className="sr-only">{SETTINGS_ITEM.label}</span>
    </Link>
  );
}

export function LiveSidebarNav() {
  return <SidebarNav pathname={usePathname()} />;
}

export function LiveSidebarSettingsLink() {
  return <SidebarSettingsLink pathname={usePathname()} />;
}

export function LiveBottomNav() {
  return <BottomNav pathname={usePathname()} />;
}

export function LiveSettingsLink() {
  return <SettingsLink pathname={usePathname()} />;
}
