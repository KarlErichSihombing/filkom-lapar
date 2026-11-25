"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  fetchSellerOrders,
  ubahStatusPesanan,
  type SellerOrderCard,
} from "@/actions/order";
import { Button } from "@/components/ui/Button";
import { CircleCheck, Clock, Receipt, ShoppingBag, Utensils, X } from "@/components/ui/icons";
import { pad2, rupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import {
  STATUS_PESANAN_BADGE,
  STATUS_PESANAN_LABEL,
  type StatusPesanan,
} from "@/types/order";

type FilterTab = "aktif" | "dibayar" | "diproses" | "siap_diambil" | "selesai" | "semua";

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "aktif", label: "Perlu Diproses" },
  { value: "dibayar", label: "Baru Masuk" },
  { value: "diproses", label: "Diproses" },
  { value: "siap_diambil", label: "Siap Diambil" },
  { value: "selesai", label: "Selesai" },
  { value: "semua", label: "Semua" },
];

const STEPS: { key: StatusPesanan; label: string }[] = [
  { key: "dibayar", label: "1. Masuk" },
  { key: "diproses", label: "2. Diproses" },
  { key: "siap_diambil", label: "3. Siap Diambil" },
  { key: "selesai", label: "4. Selesai" },
];

function stepIndex(status: StatusPesanan) {
  if (status === "dibayar") return 0;
  if (status === "diproses") return 1;
  if (status === "siap_diambil") return 2;
  if (status === "selesai") return 3;
  return -1;
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** Bunyi notifikasi singkat menggunakan Web Audio API (tanpa file audio eksternal). */
function playAlertChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.14); // A5
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    /* abaikan bila browser memblokir autoplay audio */
  }
}

function triggerBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body, tag: "filkom-lapar-seller" });
    } catch {
      /* abaikan pada perangkat yang memerlukan service worker */
    }
  }
}

function OrderCard({
  order,
  onStatusChanged,
}: {
  order: SellerOrderCard;
  onStatusChanged: (id: string, next: StatusPesanan) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentIdx = stepIndex(order.statusPesanan);

  function advance(nextStatus: StatusPesanan) {
    const prevStatus = order.statusPesanan;
    setError(null);
    onStatusChanged(order.id, nextStatus);

    startTransition(async () => {
      const res = await ubahStatusPesanan(order.id, nextStatus);
      if (res.error) {
        onStatusChanged(order.id, prevStatus);
        setError(res.error);
      }
    });
  }

  const totalPorsi = order.items.reduce((acc, i) => acc + i.jumlah, 0);

  return (
    <li className="flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm ring-1 ring-surface-variant/60">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-label text-xs font-semibold uppercase tracking-wider text-primary-strong">
              #{order.kode} · {totalPorsi} Porsi
            </p>
            <h3 className="mt-0.5 font-headline text-lg font-semibold">
              {order.namaPembeli}
            </h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-on-surface-muted">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                {formatTime(order.createdAt)}
              </span>
              {order.noTelpPembeli && <span>· {order.noTelpPembeli}</span>}
            </p>
          </div>

          <span
            className={`rounded-full px-3.5 py-1 font-label text-xs font-semibold ${
              STATUS_PESANAN_BADGE[order.statusPesanan] ?? "bg-surface text-on-surface-muted"
            }`}
          >
            {STATUS_PESANAN_LABEL[order.statusPesanan] ?? order.statusPesanan}
          </span>
        </div>

        {/* Tahapan status alur */}
        {currentIdx >= 0 && (
          <div
            aria-label="Tahapan status pesanan"
            className="mt-4 grid grid-cols-4 gap-1.5 rounded-2xl bg-surface p-2"
          >
            {STEPS.map((s, idx) => {
              const done = idx <= currentIdx;
              const current = idx === currentIdx;
              return (
                <div
                  key={s.key}
                  className={`rounded-xl px-2 py-1.5 text-center font-label text-[10px] font-medium transition-colors ${
                    current
                      ? "bg-primary-strong text-on-primary shadow-sm"
                      : done
                        ? "bg-secondary-container text-secondary"
                        : "text-on-surface-muted opacity-65"
                  }`}
                >
                  {s.label}
                </div>
              );
            })}
          </div>
        )}

        {/* Daftar item menu & catatan */}
        <ul className="mt-4 divide-y divide-surface text-sm">
          {order.items.map((item) => (
            <li key={item.menuId} className="py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">
                  <span className="mr-1.5 inline-block rounded-md bg-primary-container px-1.5 py-0.5 font-label text-xs font-bold text-primary-strong">
                    {item.jumlah}×
                  </span>
                  {item.namaMenu}
                </p>
                <span className="shrink-0 font-label text-xs text-on-surface-muted">
                  {rupiah(item.subtotal)}
                </span>
              </div>
              {item.catatan && (
                <p className="mt-1.5 rounded-xl bg-surface px-3 py-1.5 text-xs font-medium text-primary-strong">
                  Catatan: &ldquo;{item.catatan}&rdquo;
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 border-t border-surface pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-on-surface-muted">Total Pesanan</span>
          <span className="font-headline text-xl font-bold text-primary-strong">
            {rupiah(order.totalHarga)}
          </span>
        </div>

        {error && (
          <p role="alert" className="mt-2 rounded-xl bg-error/10 px-3 py-2 text-xs text-error">
            {error}
          </p>
        )}

        <div className="mt-3">
          {order.statusPesanan === "dibayar" && (
            <Button
              className="w-full py-3"
              onClick={() => advance("diproses")}
              disabled={pending}
            >
              <Utensils className="size-4" />
              {pending ? "Memproses..." : "Terima Pesanan (Mulai Masak)"}
            </Button>
          )}

          {order.statusPesanan === "diproses" && (
            <Button
              className="w-full py-3"
              onClick={() => advance("siap_diambil")}
              disabled={pending}
            >
              <ShoppingBag className="size-4" />
              {pending ? "Memproses..." : "Tandai Siap Diambil"}
            </Button>
          )}

          {order.statusPesanan === "siap_diambil" && (
            <Button
              variant="secondary"
              className="w-full py-3"
              onClick={() => advance("selesai")}
              disabled={pending}
            >
              <CircleCheck className="size-4" />
              {pending ? "Memproses..." : "Selesaikan Pesanan (Sudah Diambil)"}
            </Button>
          )}

          {order.statusPesanan === "selesai" && (
            <div className="flex items-center justify-center gap-1.5 rounded-full bg-secondary-container/70 py-2.5 font-label text-xs font-semibold text-secondary">
              <CircleCheck className="size-4" /> Pesanan telah selesai diserahkan
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export function SellerOrderManager({
  tokoId,
  namaToko,
  noStand,
  initialOrders,
}: {
  tokoId: string;
  namaToko: string;
  noStand: number;
  initialOrders: SellerOrderCard[];
}) {
  const [orders, setOrders] = useState<SellerOrderCard[]>(initialOrders);
  const [tab, setTab] = useState<FilterTab>("aktif");
  const [alertBanner, setAlertBanner] = useState<string | null>(null);
  const [notifPerm, setNotifPerm] = useState<string>(() =>
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );

  const reloadOrders = useCallback(async () => {
    try {
      const fresh = await fetchSellerOrders();
      setOrders(fresh);
    } catch {
      /* pertahankan state yang ada */
    }
  }, []);

  // Langganan Supabase Realtime pada tabel pesanan untuk stand ini
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`penjual-pesanan-${tokoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pesanan",
          filter: `toko_id=eq.${tokoId}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: string;
            kode?: string;
            status_pesanan?: StatusPesanan;
            total_harga?: number | string;
          };
          const oldRow = payload.old as { status_pesanan?: StatusPesanan } | undefined;

          if (!row?.id || !row.status_pesanan) return;
          if (
            row.status_pesanan === "menunggu_pembayaran" ||
            row.status_pesanan === "kedaluwarsa"
          ) {
            return;
          }

          // Deteksi pesanan yang baru saja dibayar
          const isNewlyPaid =
            row.status_pesanan === "dibayar" &&
            (payload.eventType === "INSERT" || oldRow?.status_pesanan !== "dibayar");

          if (isNewlyPaid) {
            const msg = `Pesanan baru masuk #${row.kode ?? ""} (${rupiah(
              Number(row.total_harga ?? 0),
            )})!`;
            setAlertBanner(msg);
            playAlertChime();
            triggerBrowserNotification(`Pesanan Baru · ${namaToko}`, msg);
          }

          // Perbarui status lokal secara instan dan muat detail item terbaru
          setOrders((prev) => {
            const exists = prev.some((o) => o.id === row.id);
            if (!exists) return prev;
            return prev.map((o) =>
              o.id === row.id ? { ...o, statusPesanan: row.status_pesanan! } : o,
            );
          });
          void reloadOrders();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tokoId, namaToko, reloadOrders]);

  const handleStatusChanged = useCallback((id: string, next: StatusPesanan) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, statusPesanan: next } : o)),
    );
  }, []);

  async function enableBrowserNotif() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
  }

  const counts = useMemo(() => {
    const dibayar = orders.filter((o) => o.statusPesanan === "dibayar").length;
    const diproses = orders.filter((o) => o.statusPesanan === "diproses").length;
    const siap = orders.filter((o) => o.statusPesanan === "siap_diambil").length;
    const selesai = orders.filter((o) => o.statusPesanan === "selesai").length;
    return {
      aktif: dibayar + diproses + siap,
      dibayar,
      diproses,
      siap_diambil: siap,
      selesai,
      semua: orders.length,
    };
  }, [orders]);

  const visible = useMemo(() => {
    if (tab === "semua") return orders;
    if (tab === "aktif") {
      return orders.filter((o) =>
        ["dibayar", "diproses", "siap_diambil"].includes(o.statusPesanan),
      );
    }
    return orders.filter((o) => o.statusPesanan === tab);
  }, [orders, tab]);

  return (
    <section className="space-y-4">
      {alertBanner && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl bg-primary-strong px-5 py-3.5 text-sm font-medium text-on-primary shadow-md"
        >
          <span className="flex items-center gap-2.5">
            <ShoppingBag className="size-5 shrink-0" />
            <span>{alertBanner}</span>
          </span>
          <button
            type="button"
            onClick={() => setAlertBanner(null)}
            aria-label="Tutup notifikasi pesanan baru"
            className="grid size-7 shrink-0 place-items-center rounded-full bg-white/15 hover:bg-white/25"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="rounded-3xl bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-label text-[10px] uppercase tracking-wider text-primary-strong">
              Antrean Real-Time · Stand {pad2(noStand)}
            </p>
            <h2 className="mt-0.5 text-2xl font-semibold">Pesanan Masuk</h2>
            <p className="mt-0.5 text-sm text-on-surface-muted">
              Tekan tombol tahapan di bawah untuk memperbarui status di layar pembeli secara
              real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {notifPerm === "default" && (
              <button
                type="button"
                onClick={enableBrowserNotif}
                className="rounded-full bg-primary-container px-3.5 py-2 font-label text-xs font-medium text-primary-strong hover:brightness-95"
              >
                Aktifkan Notifikasi Perangkat
              </button>
            )}
            <button
              type="button"
              onClick={() => void reloadOrders()}
              className="rounded-full bg-surface px-3.5 py-2 font-label text-xs font-medium text-on-surface-muted hover:bg-surface-variant"
            >
              Segarkan
            </button>
          </div>
        </div>

        {/* Ringkasan cepat antrean */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-2xl bg-primary-container/60 p-3.5">
            <p className="font-label text-[11px] font-medium text-primary-strong">
              Baru Masuk (Dibayar)
            </p>
            <p className="mt-1 font-headline text-2xl font-bold text-primary-strong">
              {counts.dibayar}
            </p>
          </div>
          <div className="rounded-2xl bg-tertiary-container/60 p-3.5">
            <p className="font-label text-[11px] font-medium text-tertiary-strong">
              Sedang Diproses
            </p>
            <p className="mt-1 font-headline text-2xl font-bold text-tertiary-strong">
              {counts.diproses}
            </p>
          </div>
          <div className="rounded-2xl bg-secondary-container/70 p-3.5">
            <p className="font-label text-[11px] font-medium text-secondary">
              Siap Diambil
            </p>
            <p className="mt-1 font-headline text-2xl font-bold text-secondary">
              {counts.siap_diambil}
            </p>
          </div>
          <div className="rounded-2xl bg-surface p-3.5">
            <p className="font-label text-[11px] font-medium text-on-surface-muted">
              Selesai
            </p>
            <p className="mt-1 font-headline text-2xl font-bold text-on-surface">
              {counts.selesai}
            </p>
          </div>
        </div>

        {/* Filter tab */}
        <div
          role="radiogroup"
          aria-label="Filter status pesanan"
          className="mt-4 flex flex-wrap gap-1.5 rounded-2xl bg-surface p-1.5"
        >
          {FILTER_TABS.map((t) => {
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
          <div className="mt-5 rounded-2xl bg-surface px-5 py-12 text-center">
            <Receipt className="mx-auto size-8 text-outline" />
            <p className="mt-2 font-headline text-base font-semibold">
              Belum ada pesanan pada kategori ini
            </p>
            <p className="mt-1 text-xs text-on-surface-muted">
              Pesanan baru yang sudah dibayar pembeli akan langsung muncul di sini secara otomatis.
            </p>
          </div>
        ) : (
          <ul className="mt-5 grid gap-4 xl:grid-cols-2">
            {visible.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChanged={handleStatusChanged}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
