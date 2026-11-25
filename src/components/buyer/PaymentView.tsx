"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { batalkanPembayaranPembeli } from "@/actions/order";
import { segarkanPembayaran, simulasiBayar } from "@/actions/payment";
import { QrCodeVisual } from "@/components/buyer/QrCodeVisual";
import { CancelCountdown } from "@/components/pembeli/CancelCountdown";
import { Button } from "@/components/ui/Button";
import { CircleCheck, Clock, QrCode, Receipt } from "@/components/ui/icons";
import { pad2, rupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import {
  STATUS_PEMBAYARAN_LABEL,
  STATUS_PESANAN_BADGE,
  STATUS_PESANAN_LABEL,
  type StatusPembayaran,
  type StatusPesanan,
} from "@/types/order";

export type PembayaranItemView = {
  menuId: string;
  namaMenu: string;
  jumlah: number;
  hargaSatuan: number;
  subtotal: number;
  catatan: string | null;
};

export type PesananCardView = {
  id: string;
  kode: string;
  tokoId: string;
  namaToko: string;
  noStand: number | null;
  totalHarga: number;
  statusPesanan: StatusPesanan;
  alasanPembatalan?: string | null;
  createdAt: string;
  items: PembayaranItemView[];
};

type Props = {
  pembayaran: {
    id: string;
    totalBayar: number;
    metodePembayaran: string;
    statusPembayaran: StatusPembayaran;
    externalId: string;
    xenditQrId: string | null;
    qrString: string;
    expiresAt: string;
    waktuBayar: string | null;
    xenditError?: string;
  };
  initialPesanan: PesananCardView[];
};

function formatCountdown(targetIso: string) {
  const diffSec = Math.max(0, Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000));
  const m = Math.floor(diffSec / 60);
  const s = diffSec % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function PaymentView({ pembayaran, initialPesanan }: Props) {
  const [statusBayar, setStatusBayar] = useState<StatusPembayaran>(pembayaran.statusPembayaran);
  const [waktuBayar, setWaktuBayar] = useState<string | null>(pembayaran.waktuBayar);
  const [pesananList, setPesananList] = useState<PesananCardView[]>(initialPesanan);
  const [countdown, setCountdown] = useState(() => formatCountdown(pembayaran.expiresAt));
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [simPending, startSimTransition] = useTransition();
  const [checkPending, startCheckTransition] = useTransition();
  const [cancelPending, startCancelTransition] = useTransition();

  // Hitung mundur batas waktu pembayaran 15 menit
  useEffect(() => {
    if (statusBayar !== "menunggu") return;
    const tick = () => setCountdown(formatCountdown(pembayaran.expiresAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [statusBayar, pembayaran.expiresAt]);

  // Langganan Supabase Realtime untuk perubahan status pembayaran (mis. dari webhook Xendit)
  // dan perubahan status pesanan tiap stand.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`pembayaran-${pembayaran.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pembayaran",
          filter: `id=eq.${pembayaran.id}`,
        },
        (payload) => {
          const row = payload.new as {
            status_pembayaran?: StatusPembayaran;
            waktu_bayar?: string | null;
          };
          if (row.status_pembayaran) {
            setStatusBayar(row.status_pembayaran);
            if (row.status_pembayaran === "berhasil") {
              setWaktuBayar(row.waktu_bayar ?? new Date().toISOString());
              setPesananList((prev) =>
                prev.map((p) =>
                  p.statusPesanan === "menunggu_pembayaran"
                    ? { ...p, statusPesanan: "dibayar" }
                    : p,
                ),
              );
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pesanan",
          filter: `pembayaran_id=eq.${pembayaran.id}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: string;
            status_pesanan?: StatusPesanan;
            alasan_pembatalan?: string | null;
          };
          if (!row.id || !row.status_pesanan) return;
          setPesananList((prev) =>
            prev.map((p) =>
              p.id === row.id
                ? {
                    ...p,
                    statusPesanan: row.status_pesanan!,
                    alasanPembatalan:
                      row.alasan_pembatalan === undefined
                        ? p.alasanPembatalan
                        : row.alasan_pembatalan,
                  }
                : p,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pembayaran.id]);

  function handleSimulate() {
    setError(null);
    setInfo(null);
    startSimTransition(async () => {
      const res = await simulasiBayar(pembayaran.id);
      if (res.error) {
        setError(res.error);
        return;
      }
      const paidIso = res.paidAt ?? new Date().toISOString();
      setStatusBayar("berhasil");
      setWaktuBayar(paidIso);
      setPesananList((prev) =>
        prev.map((p) =>
          p.statusPesanan === "menunggu_pembayaran"
            ? { ...p, statusPesanan: "dibayar" }
            : p,
        ),
      );
      setInfo(
        res.xenditSimulated
          ? "Simulasi Xendit berhasil dikirim & pembayaran terverifikasi otomatis."
          : res.xenditNotice
            ? `Pembayaran lokal berhasil (${res.xenditNotice}).`
            : "Simulasi pembayaran berhasil. Status pesanan kini Dibayar.",
      );
    });
  }

  function handleCheckStatus() {
    setError(null);
    startCheckTransition(async () => {
      await segarkanPembayaran(pembayaran.id);
    });
  }

  function handleCancelPayment(reason: string) {
    setError(null);
    setInfo(null);
    startCancelTransition(async () => {
      const res = await batalkanPembayaranPembeli(pembayaran.id, reason);
      if (res.error) {
        setError(res.error);
        return;
      }
      setPesananList((prev) =>
        prev.map((p) =>
          p.statusPesanan === "dibayar"
            ? { ...p, statusPesanan: "dibatalkan", alasanPembatalan: reason }
            : p,
        ),
      );
      setInfo(
        "Pesanan berhasil dibatalkan (≤ 10 detik). Saldo stand telah dipotong otomatis dan dana dikembalikan ke Saldo Toko Anda.",
      );
    });
  }

  async function handleCopyRef() {
    try {
      await navigator.clipboard.writeText(pembayaran.externalId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* abaikan bila clipboard tidak diizinkan */
    }
  }

  const isPaid = statusBayar === "berhasil";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-start">
      <div className="space-y-4">
        <section className="rounded-3xl bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-label text-[11px] font-medium uppercase tracking-wider text-primary-strong">
                Status Transaksi · {pembayaran.metodePembayaran}
              </p>
              <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold sm:text-3xl">
                {isPaid && <CircleCheck className="size-7 text-secondary" />}
                <span>{STATUS_PEMBAYARAN_LABEL[statusBayar] ?? statusBayar}</span>
              </h1>
              {isPaid && waktuBayar ? (
                <p className="mt-1 text-xs text-secondary">
                  Dibayar pada {formatDateTime(waktuBayar)}
                </p>
              ) : (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-on-surface-muted">
                  <Clock className="size-3.5" />
                  Selesaikan sebelum {formatDateTime(pembayaran.expiresAt)}
                </p>
              )}
            </div>

            {!isPaid ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-3.5 py-1.5 font-label text-xs font-semibold tabular-nums text-primary-strong">
                <Clock className="size-3.5" />
                {countdown}
              </span>
            ) : (
              <span className="rounded-full bg-secondary-container px-3.5 py-1.5 font-label text-xs font-semibold text-secondary">
                Lunas · {pesananList.length} Stand
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3 rounded-2xl bg-surface p-4">
            <div>
              <span className="block text-xs text-on-surface-muted">Total Tagihan</span>
              <span className="font-headline text-3xl font-bold text-primary-strong">
                {rupiah(pembayaran.totalBayar)}
              </span>
            </div>
            <div className="text-right">
              <span className="block text-[11px] text-on-surface-muted">Nomor Referensi</span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-label text-xs font-medium text-on-surface hover:bg-surface-variant"
              >
                <span className="max-w-36 truncate">{pembayaran.externalId}</span>
                <span className="text-[10px] font-semibold text-primary-strong">
                  {copied ? "Tersalin" : "Salin"}
                </span>
              </button>
            </div>
          </div>

          {isPaid &&
            waktuBayar &&
            pesananList.some((p) => p.statusPesanan === "dibayar") && (
              <div className="mt-4">
                <CancelCountdown
                  paidAt={waktuBayar}
                  windowSeconds={10}
                  disabled={cancelPending}
                  onCancel={handleCancelPayment}
                />
              </div>
            )}

          {error && isPaid && (
            <p
              role="alert"
              className="mt-3 rounded-2xl bg-error/10 px-4 py-3 text-xs font-medium text-error"
            >
              {error}
            </p>
          )}
          {info && isPaid && (
            <p
              role="status"
              className="mt-3 rounded-2xl bg-secondary-container px-4 py-3 text-xs font-medium text-secondary"
            >
              {info}
            </p>
          )}
        </section>

        <div className="space-y-3">
          <h2 className="font-headline text-lg font-semibold">
            Rincian Pesanan per Stand ({pesananList.length})
          </h2>
          {pesananList.map((p) => {
            const status = p.statusPesanan;
            return (
              <section key={p.id} className="rounded-3xl bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-label text-xs font-semibold text-primary-strong">
                      #{p.kode}
                      {p.noStand !== null && ` · Stand ${pad2(p.noStand)}`}
                    </p>
                    <h3 className="font-headline text-lg font-semibold">{p.namaToko}</h3>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 font-label text-xs font-medium ${
                      STATUS_PESANAN_BADGE[status] ?? "bg-surface text-on-surface-muted"
                    }`}
                  >
                    {STATUS_PESANAN_LABEL[status] ?? status}
                  </span>
                </div>

                <ul className="mt-3 divide-y divide-surface text-sm">
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

                <div className="mt-3 flex items-baseline justify-between border-t border-surface pt-3 text-sm">
                  <span className="text-on-surface-muted">Subtotal stand</span>
                  <span className="font-label font-semibold text-primary-strong">
                    {rupiah(p.totalHarga)}
                  </span>
                </div>
                {p.statusPesanan === "dibatalkan" && (
                  <p className="mt-2.5 rounded-xl bg-error/10 px-3 py-2 text-xs text-error">
                    Dibatalkan ({p.alasanPembatalan || "Permintaan pembatalan"}) · Refund{" "}
                    {rupiah(p.totalHarga)} tercatat ke mutasi saldo.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <aside className="rounded-3xl bg-white p-5 lg:sticky lg:top-28">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <QrCode className="size-5 text-primary-strong" />
            <h2 className="text-lg font-semibold">Metode QRIS</h2>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 font-label text-[10px] font-medium ${
              pembayaran.xenditQrId && !pembayaran.xenditQrId.startsWith("qr_sim_")
                ? "bg-secondary-container text-secondary"
                : "bg-surface text-on-surface-muted"
            }`}
          >
            {pembayaran.xenditQrId && !pembayaran.xenditQrId.startsWith("qr_sim_")
              ? "Xendit Live/Test"
              : "Mode Simulasi"}
          </span>
        </div>

        {pembayaran.xenditError && !isPaid && (
          <p className="mt-3 rounded-2xl bg-primary-container/60 px-3.5 py-2.5 text-[11px] text-primary-strong">
            Catatan Xendit: {pembayaran.xenditError}
          </p>
        )}

        {!isPaid ? (
          <>
            <div className="mt-4 rounded-2xl bg-surface p-4 text-center">
              <QrCodeVisual value={pembayaran.qrString} />
              <p className="mt-3 text-xs text-on-surface-muted">
                Scan QRIS menggunakan aplikasi e-wallet atau m-banking pilihan Anda. Nominal{" "}
                <strong className="text-on-surface">{rupiah(pembayaran.totalBayar)}</strong>{" "}
                terisi otomatis.
              </p>
            </div>

            {error && (
              <p role="alert" className="mt-3 rounded-2xl bg-error/10 px-4 py-2.5 text-xs text-error">
                {error}
              </p>
            )}
            {info && (
              <p className="mt-3 rounded-2xl bg-secondary-container px-4 py-2.5 text-xs text-secondary">
                {info}
              </p>
            )}

            <div className="mt-4 space-y-2.5">
              <Button
                className="w-full py-3.5"
                onClick={handleSimulate}
                disabled={simPending}
              >
                {simPending ? "Memproses simulasi..." : "Simulasi Bayar (Test Mode)"}
              </Button>

              <Button
                variant="secondary"
                className="w-full"
                onClick={handleCheckStatus}
                disabled={checkPending || simPending}
              >
                {checkPending ? "Memeriksa..." : "Cek Status Pembayaran"}
              </Button>
            </div>

            <div className="mt-5 border-t border-surface pt-4">
              <p className="font-headline text-xs font-semibold">Petunjuk Pembayaran</p>
              <ol className="mt-2 space-y-1.5 text-xs text-on-surface-muted">
                <li>1. Buka aplikasi e-wallet (GoPay, OVO, DANA, ShopeePay) atau m-banking.</li>
                <li>2. Pilih menu Scan QRIS dan arahkan ke kode QR di atas.</li>
                <li>
                  3. Pastikan nama merchant <strong>FILKOM LAPAR</strong> dan nominal{" "}
                  <strong>{rupiah(pembayaran.totalBayar)}</strong> sudah sesuai.
                </li>
                <li>
                  4. Untuk pengujian/demo, klik tombol <strong>Simulasi Bayar</strong> di atas.
                </li>
              </ol>
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl bg-secondary-container/70 p-5 text-center">
              <CircleCheck className="mx-auto size-12 text-secondary" />
              <p className="mt-2 font-headline text-base font-semibold text-secondary">
                Pembayaran Terverifikasi
              </p>
              <p className="mt-1 text-xs text-secondary/90">
                Pesanan Anda sudah diteruskan ke masing-masing stand dengan status{" "}
                <strong>Dibayar</strong>.
              </p>
            </div>

            {info && (
              <p className="rounded-2xl bg-surface px-4 py-2.5 text-xs text-on-surface-muted">
                {info}
              </p>
            )}

            <Link
              href="/pesanan"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-strong px-6 py-3.5 font-label text-sm font-medium text-on-primary transition-colors hover:brightness-110"
            >
              <Receipt className="size-4" /> Lacak di Pesanan Saya
            </Link>
            <Link
              href="/beranda"
              className="block text-center font-label text-xs font-medium text-primary-strong"
            >
              Pesan menu lainnya
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
