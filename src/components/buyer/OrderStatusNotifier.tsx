"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag, X } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { STATUS_PESANAN_LABEL, type StatusPesanan } from "@/types/order";

type ToastNotice = {
  id: string;
  kode: string;
  status: StatusPesanan;
  message: string;
};

function playBuyerChime(isReady: boolean) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    if (isReady) {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24); // G5
    } else {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
    }
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    /* abaikan bila browser memblokir audio otomatis */
  }
}

function sendBrowserNotif(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body, tag: "filkom-lapar-order-status" });
    } catch {
      /* abaikan bila perangkat tidak mengizinkan */
    }
  }
}

/**
 * Pemantau global perubahan status pesanan milik pembeli yang sedang login.
 * Memunculkan banner notifikasi real-time & bunyi setiap kali penjual mengubah status
 * (Diterima/Diproses -> Siap Diambil -> Selesai), di halaman mana pun pembeli berada.
 */
export function OrderStatusNotifier({ userId }: { userId: string }) {
  const [notice, setNotice] = useState<ToastNotice | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifikasi-pembeli-${userId}`)
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
            kode?: string;
            status_pesanan?: StatusPesanan;
          };
          const oldRow = payload.old as { status_pesanan?: StatusPesanan } | undefined;

          if (!row?.id || !row.status_pesanan) return;
          if (oldRow?.status_pesanan && oldRow.status_pesanan === row.status_pesanan) {
            return;
          }

          const status = row.status_pesanan;
          if (!["diproses", "siap_diambil", "selesai", "dibatalkan"].includes(status)) {
            return;
          }

          const kode = row.kode ? `#${row.kode}` : "Pesananmu";
          const label = STATUS_PESANAN_LABEL[status] ?? status;
          const message =
            status === "siap_diambil"
              ? `${kode} sudah SIAP DIAMBIL di stand kantin!`
              : status === "diproses"
                ? `${kode} diterima penjual dan sedang dimasak/diproses.`
                : status === "selesai"
                  ? `${kode} telah selesai. Selamat menikmati!`
                  : `${kode} berstatus: ${label}.`;

          setNotice({ id: row.id, kode, status, message });
          playBuyerChime(status === "siap_diambil");
          sendBrowserNotif(`Status Pesanan · ${label}`, message);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (!notice) return null;

  const isReady = notice.status === "siap_diambil";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-4 top-4 z-40 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-xs font-medium shadow-lg ${
        isReady
          ? "bg-secondary text-on-primary"
          : "bg-primary-strong text-on-primary"
      }`}
    >
      <Link
        href="/pesanan"
        onClick={() => setNotice(null)}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/15">
          <ShoppingBag className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block font-label text-[10px] uppercase tracking-wider opacity-85">
            Pembaruan Status Pesanan
          </span>
          <span className="block truncate text-xs font-semibold">{notice.message}</span>
        </span>
      </Link>

      <button
        type="button"
        onClick={() => setNotice(null)}
        aria-label="Tutup notifikasi"
        className="grid size-7 shrink-0 place-items-center rounded-full bg-white/15 hover:bg-white/25"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
