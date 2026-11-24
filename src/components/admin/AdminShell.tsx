import type { ReactNode } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { MapPin } from "@/components/ui/icons";

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "A"
  );
}

export function AdminShell({
  adminName,
  children,
}: {
  adminName: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="hidden flex-col bg-surface p-4 lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <div className="px-2 pt-2">
          <p className="font-headline text-xl font-bold leading-tight text-primary-strong">
            FILKOM
            <br />
            Lapar
          </p>
          <p className="mt-1 font-label text-[10px] uppercase tracking-wider text-on-surface-muted">
            Admin portal
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-4">
          <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-muted">
            Peran aktif
          </p>
          <p className="mt-1 font-headline font-semibold">Admin kantin</p>
        </div>

        <nav aria-label="Menu admin" className="mt-6">
          <a
            href="/admin"
            aria-current="page"
            className="block rounded-xl bg-primary-container px-3 py-2 text-xs font-medium text-primary-strong"
          >
            Data penjual &amp; kantin
          </a>
        </nav>

      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <p className="font-headline font-bold text-primary-strong lg:hidden">
              FILKOM Lapar
            </p>
            <span className="hidden items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs text-on-surface-muted sm:flex">
              <MapPin className="size-3.5" />
              Gedung F FILKOM UB
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-xs leading-tight">
              <p className="font-semibold">{adminName}</p>
              <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-muted">
                Admin
              </p>
            </div>
            <span
              aria-hidden
              className="grid size-10 place-items-center rounded-full bg-primary-strong font-label text-sm font-medium text-on-primary"
            >
              {initialsOf(adminName)}
            </span>
            <LogoutButton />
          </div>
        </header>

        <main className="space-y-4 px-4 pb-10 sm:px-6">{children}</main>
      </div>
    </div>
  );
}