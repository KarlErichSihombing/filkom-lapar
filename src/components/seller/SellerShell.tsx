"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { PwaControlPill } from "@/components/PwaControlPill";
import { useStandStatus } from "@/components/seller/StandStatus";
import { BarChart, MapPin, ShoppingBag, Utensils } from "@/components/ui/icons";
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
    <div className="min-h-dvh pb-24 lg:grid lg:grid-cols-[15rem_1fr] lg:pb-0">
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
            href="/dashboard/pesanan"
            aria-current={onPesananPage ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              onPesananPage
                ? "bg-primary-strong text-on-primary"
                : "text-on-surface-muted hover:bg-surface-variant"
            }`}
          >
            <ShoppingBag className="size-4" />
            <span>Pesanan masuk</span>
            {activeOrderCount > 0 && (
              <span
                className={`ml-auto rounded-full px-2 py-0.5 font-label text-[11px] font-bold tabular-nums ${
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
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              onMenuPage
                ? "bg-primary-strong text-on-primary"
                : "text-on-surface-muted hover:bg-surface-variant"
            }`}
          >
            <Utensils className="size-4" /> Kelola menu &amp; stok
          </Link>

          <Link
            href="/dashboard/laporan"
            aria-current={onLaporanPage ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              onLaporanPage
                ? "bg-primary-strong text-on-primary"
                : "text-on-surface-muted hover:bg-surface-variant"
            }`}
          >
            <BarChart className="size-4" /> Laporan &amp; ulasan
          </Link>
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

          <div className="flex items-center gap-2.5 sm:gap-3">
            <PwaControlPill targetUrl="/dashboard/pesanan" roleLabel="penjual" />
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

      {/* Navigasi bawah untuk penjual di layar HP (< lg) */}
      <nav
        aria-label="Navigasi penjual mobile"
        className="fixed inset-x-0 bottom-4 z-20 mx-auto flex w-fit gap-1 rounded-full bg-surface p-1.5 shadow-lg shadow-primary/10 lg:hidden"
      >
        <Link
          href="/dashboard/pesanan"
          aria-current={onPesananPage ? "page" : undefined}
          className={`flex items-center gap-2 rounded-full px-4 py-2.5 font-label text-xs font-medium transition-colors ${
            onPesananPage
              ? "bg-primary-strong text-on-primary"
              : "text-on-surface-muted hover:bg-surface-variant"
          }`}
        >
          <ShoppingBag className="size-4" />
          <span>Pesanan Masuk</span>
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
          className={`flex items-center gap-2 rounded-full px-4 py-2.5 font-label text-xs font-medium transition-colors ${
            onMenuPage
              ? "bg-primary-strong text-on-primary"
              : "text-on-surface-muted hover:bg-surface-variant"
          }`}
        >
          <Utensils className="size-4" />
          <span>Menu &amp; Stok</span>
        </Link>

        <Link
          href="/dashboard/laporan"
          aria-current={onLaporanPage ? "page" : undefined}
          className={`flex items-center gap-2 rounded-full px-4 py-2.5 font-label text-xs font-medium transition-colors ${
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
