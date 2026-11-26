import Link from "next/link";
import type { ReactNode } from "react";
import { BuyerNav } from "@/components/buyer/BuyerNav";
import { OrderStatusNotifier } from "@/components/buyer/OrderStatusNotifier";
import { LogoutButton } from "@/components/LogoutButton";
import { PwaControlPill } from "@/components/PwaControlPill";

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "P"
  );
}

export function BuyerShell({
  userId,
  nama,
  children,
}: {
  userId: string;
  nama: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh pb-28">
      <OrderStatusNotifier userId={userId} />
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link
          href="/beranda"
          className="font-headline text-lg font-bold leading-tight text-primary-strong"
        >
          FILKOM Lapar
        </Link>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <PwaControlPill targetUrl="/pesanan" roleLabel="pembeli" />
          {nama && <span className="hidden text-sm font-medium sm:block">{nama}</span>}
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-full bg-primary-strong font-label text-xs font-medium text-on-primary"
          >
            {initialsOf(nama)}
          </span>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6">{children}</main>
      <BuyerNav />
    </div>
  );
}
