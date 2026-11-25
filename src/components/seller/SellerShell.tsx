"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { useStandStatus } from "@/components/seller/StandStatus";
import { BarChart, MapPin, ShoppingBag, Utensils } from "@/components/ui/icons";
import { pad2 } from "@/lib/format";
import type { SellerContext } from "@/lib/seller";

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

export function SellerShell({
  ctx,
  children,
}: {
  ctx: SellerContext;
  children: ReactNode;
}) {
  const toko = ctx.toko;
  const { buka } = useStandStatus(toko?.buka ?? true);
  const displayName = ctx.nama || "Penjual";

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
            Merchant portal
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-4">
          <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-muted">
            Stand kantin aktif
          </p>
          <p className="mt-1 font-headline font-semibold leading-tight">
            {toko ? `${toko.namaToko} #${pad2(toko.noStand)}` : "Belum ada stand"}
          </p>
          {toko && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-on-surface-muted">
              <span
                className={`size-1.5 rounded-full ${
                  buka ? "bg-secondary-soft" : "bg-neutral"
                }`}
              />
              {buka ? "Buka · Menerima pesanan" : "Tutup"}
            </p>
          )}
        </div>

        <nav aria-label="Menu penjual" className="mt-6 space-y-1">
          <Link
            href="/dashboard"
            aria-current="page"
            className="flex items-center gap-3 rounded-xl bg-primary-strong px-3 py-2.5 text-sm font-medium text-on-primary"
          >
            <Utensils className="size-4" /> Kelola menu &amp; stok
          </Link>
          {[
            { label: "Pesanan masuk", icon: <ShoppingBag className="size-4" /> },
            { label: "Laporan penjualan", icon: <BarChart className="size-4" /> },
          ].map((item) => (
            <span
              key={item.label}
              aria-disabled="true"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-on-surface-muted opacity-70"
            >
              {item.icon}
              {item.label}
              <span className="ml-auto rounded-full bg-surface-variant px-2 py-0.5 font-label text-[10px]">
                Segera
              </span>
            </span>
          ))}
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
              Gedung F FILKOM UB{toko ? ` · Stand ${pad2(toko.noStand)}` : ""}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-xs leading-tight">
              <p className="font-semibold">{displayName}</p>
              <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-muted">
                Pemilik stand
              </p>
            </div>
            <span
              aria-hidden
              className="grid size-10 place-items-center rounded-full bg-primary-strong font-label text-sm font-medium text-on-primary"
            >
              {initialsOf(displayName)}
            </span>
            <LogoutButton />
          </div>
        </header>

        <main className="space-y-4 px-4 pb-10 sm:px-6">{children}</main>
      </div>
    </div>
  );
}