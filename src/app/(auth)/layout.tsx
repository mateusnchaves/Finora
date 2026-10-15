import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ServiceWorker } from "@/components/pwa/service-worker";

/*
 * Split screen: a blu notte brand panel (desktop only) and the form.
 * The gold rings rising from the bottom edge are the "Alvorada" sunrise,
 * this screen's single use of `accent`.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-deep p-12 text-on-deep lg:flex lg:flex-col">
        <Logo size={40} nameClassName="text-on-deep" />
        <div className="mt-auto mb-40 max-w-md">
          <h2 className="font-display text-display-lg">Seu dinheiro, com clareza.</h2>
          <p className="mt-4 text-body-lg opacity-85">
            Veja para onde vai cada real, acompanhe orçamentos e investimentos em um só lugar.
          </p>
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 400 200"
          className="absolute -bottom-px left-12 w-[min(420px,70%)] fill-none stroke-accent"
          strokeWidth="6"
        >
          <path d="M140 200a60 60 0 0 1 120 0" />
          <path d="M90 200a110 110 0 0 1 220 0" />
          <path d="M40 200a160 160 0 0 1 320 0" />
        </svg>
      </aside>

      <div className="flex min-h-dvh flex-col px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-6 lg:px-16">
        <div className="flex items-center justify-between lg:justify-end">
          <Logo size={32} className="lg:hidden" />
          <ThemeToggle />
        </div>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</main>
        {/* Nobody is signed in here: wipe any pages a previous user left in the offline cache. */}
        <ServiceWorker userId={null} />
      </div>
    </div>
  );
}
