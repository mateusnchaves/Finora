import { signOut } from "@/app/(auth)/actions";
import { Icon } from "@/components/ui/icon";
import { getCurrentUser } from "@/lib/auth";

function initials(nameOrEmail: string) {
  const words = nameOrEmail.split(/[\s@.]+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Signed-in user with a sign-out button. Reads the session: render inside <Suspense>. */
export async function UserMenu() {
  const user = await getCurrentUser();
  const displayName = user.name ?? user.email;

  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-pill bg-brand-tint text-label text-brand"
      >
        {initials(displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-medium text-ink">{displayName}</p>
        <p className="truncate text-body-sm text-ink-muted">{user.isDemo ? "Conta demo" : user.email}</p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-brand-tint hover:text-ink"
        >
          <Icon name="logout" />
          <span className="sr-only">Sair</span>
        </button>
      </form>
    </div>
  );
}

export function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-3 px-2 py-2" aria-hidden="true">
      <span className="size-10 rounded-pill bg-brand-tint" />
      <span className="h-4 flex-1 rounded-sm bg-brand-tint" />
    </div>
  );
}
