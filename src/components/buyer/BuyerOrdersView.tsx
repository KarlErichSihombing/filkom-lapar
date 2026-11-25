"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CircleCheck, Clock, Receipt, ShoppingBag } from "@/components/ui/icons";
import { pad2, rupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import {
  STATUS_PESANAN_BADGE,
  STATUS_PESANAN_LABEL,
  type PesananSummary,
  type StatusPesanan,
} from "@/types/order";

type BuyerTab = "semua" | "berjalan" | "siap_diambil" | "selesai";

const TABS: { value: BuyerTab; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "berjalan", label: "Sedang Berjalan" },
  { value: "siap_diambil", label: "Siap Diambil" },
  { value: "selesai", label: "Selesai" },
];

const TIMELINE_STEPS: { key: StatusPesanan; label: string; desc: string }[] = [
  { key: "dibayar", label: "Diterima", desc: "Menunggu konfirmasi stand" },
  { key: "diproses", label: "Diproses", desc: "Sedang dimasak/disiapkan" },
  { key: "siap_diambil", label: "Siap Diambil", desc: "Silakan ambil di stand" },
  { key: "selesai", label: "Selesai", desc: "Pesanan sudah diterima" },
];

function timelineIndex(status: StatusPesanan) {
  if (status === "dibayar") return 0;
  if (status === "diproses") return 1;
  if (status === "siap_diambil") return 2;
  if (status === "selesai") return 3;
  return -1;
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function BuyerOrdersView({
  userId,
  initialOrders,
}: {
  userId: string;
  initialOrders: PesananSummary[];
}) {
  const [orders, setOrders] = useState<PesananSummary[]>(initialOrders);
  const [tab, setTab] = useState<BuyerTab>("semua");
  const [notifPerm, setNotifPerm] = useState<string>(() =>
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );

  // Langganan Supabase Realtime agar saat penjual menekan tombol di HP penjual,
  // status pesanan di HP pembeli langsung berubah tanpa refresh halaman.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`pembeli-pesanan-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pesanan",
          filter: `pembeli_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: string;
            status_pesanan?: StatusPesanan;
            alasan_pembatalan?: string | null;
          };
          if (!row?.id || !row.status_pesanan) return;
          setOrders((prev) =>
            prev.map((o) =>
              o.id === row.id
                ? {
                    ...o,
                    statusPesanan: row.status_pesanan!,
                    alasanPembatalan:
                      row.alasan_pembatalan === undefined
                        ? o.alasanPembatalan
                        : row.alasan_pembatalan,
                  }
                : o,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function requestBrowserNotif() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
  }

  const counts = useMemo(() => {
    const berjalan = orders.filter((o) =>
      ["menunggu_pembayaran", "dibayar", "diproses", "siap_diambil"].includes(o.statusPesanan),
    ).length;
    const siap = orders.filter((o) => o.statusPesanan === "siap_diambil").length;
    const selesai = orders.filter((o) => o.statusPesanan === "selesai").length;
    return {
      semua: orders.length,
      berjalan,
      siap_diambil: siap,
      selesai,
    };
  }, [orders]);

  const visible = useMemo(() => {
    if (tab === "semua") return orders;
    if (tab === "berjalan") {
      return orders.filter((o) =>
        ["menunggu_pembayaran", "dibayar", "diproses", "siap_diambil"].includes(o.statusPesanan),
      );
    }
    return orders.filter((o) => o.statusPesanan === tab);
  }, [orders, tab]);

  if (orders.length === 0) {
    return (
      <section className="rounded-3xl bg-surface px-6 py-16 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-white text-primary-strong">
          <Receipt className="size-6" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold">Belum ada pesanan</h1>
        <p className="mt-1 text-sm text-on-surface-muted">
          Pesanan yang sudah kamu checkout akan tercatat dan dapat dilacak secara real-time di sini.
        </p>
        <Link
          href="/beranda"
          className="mt-6 inline-flex rounded-full bg-primary-strong px-6 py-3 font-label text-sm font-medium text-on-primary"
        >
          Mulai pesan makan
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Pesanan Saya</h1>
          <p className="mt-0.5 text-xs text-on-surface-muted">
            Status pesanan diperbarui secara otomatis (real-time) dari stand kantin.
          </p>
        </div>

        {notifPerm === "default" && (
          <button
            type="button"
            onClick={requestBrowserNotif}
            className="rounded-full bg-primary-container px-4 py-2 font-label text-xs font-semibold text-primary-strong hover:brightness-95"
          >
            Aktifkan Notifikasi Pesanan Siap
          </button>
        )}
      </div>

      {/* Filter tab */}
      <div
        role="radiogroup"
        aria-label="Filter status pesanan"
        className="flex flex-wrap gap-1.5 rounded-2xl bg-surface p-1.5"
      >
        {TABS.map((t) => {
          const active = tab === t.value;
          const count = counts[t.value];
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTab(t.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 font-label text-xs font-medium transition-colors ${
                active
                  ? "bg-primary-strong text-on-primary"
                  : "text-on-surface-muted hover:bg-surface-variant"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  active ? "bg-white/20 text-on-primary" : "bg-white text-on-surface-muted"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-3xl bg-surface px-5 py-12 text-center text-sm text-on-surface-muted">
          Tidak ada pesanan pada filter ini.
        </p>
      ) : (
        <ul className="space-y-4">
          {visible.map((p) => {
            const status = p.statusPesanan;
            const stepIdx = timelineIndex(status);

            return (
              <li
                key={p.id}
                className={`rounded-3xl bg-white p-5 sm:p-6 ${
                  status === "siap_diambil" ? "ring-2 ring-secondary-soft" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-label text-xs font-semibold text-primary-strong">
                      #{p.kode}
                      {p.noStand !== null && ` · Stand ${pad2(p.noStand)}`}
                    </p>
                    <h2 className="mt-0.5 font-headline text-xl font-semibold">
                      {p.namaToko}
                    </h2>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-on-surface-muted">
                      <Clock className="size-3.5" />
                      {formatDateTime(p.createdAt)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3.5 py-1.5 font-label text-xs font-semibold ${
                      STATUS_PESANAN_BADGE[status] ?? "bg-surface text-on-surface-muted"
                    }`}
                  >
                    {STATUS_PESANAN_LABEL[status] ?? status}
                  </span>
                </div>

                {/* Banner perhatian khusus saat pesanan Siap Diambil */}
                {status === "siap_diambil" && (
                  <div
                    role="status"
                    className="mt-4 flex items-center gap-3 rounded-2xl bg-secondary-container px-4 py-3 text-xs font-medium text-secondary"
                  >
                    <ShoppingBag className="size-5 shrink-0" />
                    <span>
                      Pesananmu sudah <strong>Siap Diambil</strong> di{" "}
                      <strong>
                        {p.noStand !== null ? `Stand ${pad2(p.noStand)} (${p.namaToko})` : p.namaToko}
                      </strong>
                      ! Tunjukkan kode <strong>#{p.kode}</strong> ke penjual.
                    </span>
                  </div>
                )}

                {/* Linimasa progres pesanan 4 tahap (Diterima -> Diproses -> Siap Diambil -> Selesai) */}
                {stepIdx >= 0 && (
                  <div
                    aria-label="Progres status pesanan"
                    className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-surface p-3 sm:grid-cols-4"
                  >
                    {TIMELINE_STEPS.map((s, idx) => {
                      const done = idx <= stepIdx;
                      const current = idx === stepIdx;
                      return (
                        <div
                          key={s.key}
                          className={`rounded-xl p-2.5 transition-colors ${
                            current
                              ? "bg-primary-strong text-on-primary shadow-sm"
                              : done
                                ? "bg-secondary-container/80 text-secondary"
                                : "bg-white/60 text-on-surface-muted opacity-70"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-label text-xs font-bold">
                              {idx + 1}. {s.label}
                            </span>
                            {done && <CircleCheck className="size-3.5 shrink-0" />}
                          </div>
                          <p
                            className={`mt-0.5 text-[11px] leading-snug ${
                              current ? "text-on-primary/90" : ""
                            }`}
                          >
                            {s.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <ul className="mt-4 divide-y divide-surface text-sm">
                  {p.items.map((d) => (
                    <li key={d.menuId} className="flex justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {d.jumlah} × {d.namaMenu}
                        </p>
                        {d.catatan && (
                          <p className="mt-0.5 text-xs text-on-surface-muted">
                            Catatan: {d.catatan}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 font-label">{rupiah(d.subtotal)}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-surface pt-4">
                  <div>
                    <span className="text-xs text-on-surface-muted">Total pesanan stand</span>
                    <p className="font-headline text-xl font-bold text-primary-strong">
                      {rupiah(p.totalHarga)}
                    </p>
                  </div>

                  <Link
                    href={`/pembayaran/${p.pembayaranId}`}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-label text-xs font-semibold transition-colors ${
                      status === "menunggu_pembayaran"
                        ? "bg-primary-strong text-on-primary hover:brightness-110"
                        : "bg-primary-container text-primary-strong hover:brightness-95"
                    }`}
                  >
                    {status === "menunggu_pembayaran" ? "Bayar sekarang" : "Detail pembayaran"}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
