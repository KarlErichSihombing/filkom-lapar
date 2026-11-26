"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { PwaControlPill } from "@/components/PwaControlPill";
import { useStandStatus } from "@/components/seller/StandStatus";
import {
  BarChart,
  MapPin,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Utensils,
} from "@/components/ui/icons";
import { pad2 } from "@/lib/format";
import type { SellerContext } from "@/lib/seller";
import { createClient } from "@/lib/supabase/client";

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
  const pathname = usePathname();
  const toko = ctx.toko;
  const { buka } = useStandStatus(toko?.buka ?? true);
  const displayName = ctx.nama || "Penjual";
  const [activeOrderCount, setActiveOrderCount] = useState<number>(0);

  useEffect(() => {
    if (!toko) return;
    const supabase = createClient();

    async function loadActiveCount() {
      const { count } = await supabase
        .from("pesanan")
        .select("id", { count: "exact", head: true })
        .eq("toko_id", toko!.id)
        .in("status_pesanan", ["dibayar", "diproses", "siap_diambil"]);
      if (typeof count === "number") setActiveOrderCount(count);
    }

    void loadActiveCount();

    const channel = supabase
      .channel(`seller-nav-${toko.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pesanan",
          filter: `toko_id=eq.${toko.id}`,
        },
        () => {
          void loadActiveCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toko]);

  const onMenuPage = pathname === "/dashboard";
  const onPesananPage = pathname.startsWith("/dashboard/pesanan");
  const onLaporanPage = pathname.startsWith("/dashboard/laporan");

  return (
    <div className="min-h-dvh pb-24 lg:grid lg:grid-cols-[16.5rem_1fr] lg:pb-0">
      <aside className="hidden flex-col justify-between bg-surface p-4 lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <div>
          <div className="flex items-center gap-3 px-2 pt-2">
            <span className="grid size-10 place-items-center rounded-2xl bg-primary-strong text-on-primary shadow-sm">
              <Utensils className="size-5" />
            </span>
            <div>
              <p className="font-headline text-lg font-extrabold leading-none text-primary-strong">
                FILKOM Lapar
              </p>
              <p className="mt-1 font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-muted">
                Merchant Portal · GKM
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-label text-[10px] font-bold uppercase tracking-wider text-primary-strong">
                {toko ? `Stand #${pad2(toko.noStand)}` : "Stand Kantin"}
              </span>
              {toko && toko.ratingRataRata > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 font-label text-[11px] font-bold text-on-surface">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  {toko.ratingRataRata.toFixed(1)}
                </span>
              )}
            </div>
            <p className="mt-1 truncate font-headline text-base font-bold leading-snug text-on-surface">
              {toko ? toko.namaToko : "Belum ada stand"}
            </p>
            {toko && (
              <p
                className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-label text-[11px] font-semibold ${
                  buka
                    ? "bg-secondary-container text-secondary"
                    : "bg-surface-variant text-on-surface-muted"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    buka ? "bg-secondary-soft" : "bg-neutral"
                  }`}
                />
                {buka ? "Buka · Menerima Pesanan" : "Sedang Tutup"}
              </p>
            )}
          </div>

          <div className="mt-6">
            <p className="px-3 font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-muted">
              Operasional Stand
            </p>
            <nav aria-label="Menu penjual" className="mt-2 space-y-1.5">
              <Link
                href="/dashboard/pesanan"
                aria-current={onPesananPage ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all ${
                  onPesananPage
                    ? "bg-primary-strong text-on-primary shadow-sm"
                    : "text-on-surface-muted hover:bg-surface-variant hover:text-on-surface"
                }`}
              >
                <ShoppingBag className="size-4 shrink-0" />
                <span>Pesanan Masuk</span>
                {activeOrderCount > 0 && (
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 font-label text-[11px] font-extrabold tabular-nums ${
                      onPesananPage
                        ? "bg-white text-primary-strong"
                        : "bg-primary-strong text-on-primary"
                    }`}
                  >
                    {activeOrderCount}
                  </span>
                )}
              </Link>

              <Link
                href="/dashboard"
                aria-current={onMenuPage ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all ${
                  onMenuPage
                    ? "bg-primary-strong text-on-primary shadow-sm"
                    : "text-on-surface-muted hover:bg-surface-variant hover:text-on-surface"
                }`}
              >
                <Utensils className="size-4 shrink-0" />
                <span>Kelola Menu &amp; Stok</span>
              </Link>

              <Link
                href="/dashboard/laporan"
                aria-current={onLaporanPage ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all ${
                  onLaporanPage
                    ? "bg-primary-strong text-on-primary shadow-sm"
                    : "text-on-surface-muted hover:bg-surface-variant hover:text-on-surface"
                }`}
              >
                <BarChart className="size-4 shrink-0" />
                <span>Laporan &amp; Ulasan</span>
              </Link>
            </nav>
          </div>
        </div>

        {/* Kartu info sistem bawah sidebar */}
        <div className="rounded-2xl bg-white/80 p-3.5 text-xs">
          <p className="flex items-center gap-1.5 font-label text-[11px] font-bold text-secondary">
            <QrCode className="size-3.5" />
            QRIS Xendit Aktif
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-on-surface-muted">
            Stok menu, pesanan masuk, dan mutasi saldo tersinkronisasi secara real-time.
          </p>
          <p className="mt-2 flex items-center gap-1 font-label text-[10px] text-outline">
            <ShieldCheck className="size-3 text-secondary" />
            Kantin GKM FILKOM UB
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="grid size-8 place-items-center rounded-xl bg-primary-strong text-on-primary">
                <Utensils className="size-4" />
              </span>
              <p className="font-headline font-bold text-primary-strong">
                FILKOM Lapar
              </p>
            </div>
            <span className="hidden items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 font-label text-xs font-medium text-on-surface-muted sm:inline-flex">
              <MapPin className="size-3.5 text-primary-strong" />
              Kantin GKM FILKOM UB{toko ? ` · Stand ${pad2(toko.noStand)}` : ""}
            </span>
            {activeOrderCount > 0 && !onPesananPage && (
              <Link
                href="/dashboard/pesanan"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-3 py-1 font-label text-xs font-bold text-primary-strong transition-colors hover:brightness-95"
              >
                <span className="size-2 animate-pulse rounded-full bg-primary-strong" />
                {activeOrderCount} Pesanan Aktif →
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <PwaControlPill targetUrl="/dashboard/pesanan" roleLabel="penjual" />
            <div className="hidden text-right text-xs leading-tight sm:block">
              <p className="font-semibold text-on-surface">{displayName}</p>
              <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-muted">
                Merchant Stand {toko ? `#${pad2(toko.noStand)}` : ""}
              </p>
            </div>
            <span
              aria-hidden
              className="grid size-10 place-items-center rounded-full bg-primary-strong font-label text-sm font-bold text-on-primary shadow-xs"
            >
              {initialsOf(displayName)}
            </span>
            <LogoutButton />
          </div>
        </header>

        <main className="space-y-5 px-4 pb-10 sm:px-6">{children}</main>
      </div>

      {/* Navigasi bawah untuk penjual di layar HP (< lg) */}
      <nav
        aria-label="Navigasi penjual mobile"
        className="fixed inset-x-0 bottom-4 z-20 mx-auto flex w-fit gap-1 rounded-full bg-surface p-1.5 shadow-lg shadow-primary/10 lg:hidden"
      >
        <Link
          href="/dashboard/pesanan"
          aria-current={onPesananPage ? "page" : undefined}
          className={`flex items-center gap-2 rounded-full px-4 py-2.5 font-label text-xs font-semibold transition-colors ${
            onPesananPage
              ? "bg-primary-strong text-on-primary"
              : "text-on-surface-muted hover:bg-surface-variant"
          }`}
        >
          <ShoppingBag className="size-4" />
          <span>Pesanan</span>
          {activeOrderCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                onPesananPage
                  ? "bg-white text-primary-strong"
                  : "bg-primary-strong text-on-primary"
              }`}
            >
              {activeOrderCount}
            </span>
          )}
        </Link>

        <Link
          href="/dashboard"
          aria-current={onMenuPage ? "page" : undefined}
          className={`flex items-center gap-2 rounded-full px-4 py-2.5 font-label text-xs font-semibold transition-colors ${
            onMenuPage
              ? "bg-primary-strong text-on-primary"
              : "text-on-surface-muted hover:bg-surface-variant"
          }`}
        >
          <Store className="size-4" />
          <span>Menu &amp; Stok</span>
        </Link>

        <Link
          href="/dashboard/laporan"
          aria-current={onLaporanPage ? "page" : undefined}
          className={`flex items-center gap-2 rounded-full px-4 py-2.5 font-label text-xs font-semibold transition-colors ${
            onLaporanPage
              ? "bg-primary-strong text-on-primary"
              : "text-on-surface-muted hover:bg-surface-variant"
          }`}
        >
          <BarChart className="size-4" />
          <span>Laporan</span>
        </Link>
      </nav>
    </div>
  );
}
