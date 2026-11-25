"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Timer } from "@/components/ui/icons";

const REASONS = [
  "Ingin mengubah pesanan",
  "Salah memilih menu",
  "Stand terlalu antre",
];

type Props = {
  /** Waktu bayar dari server (ISO string), mis. pembayaran.waktu_bayar */
  paidAt: string;
  windowSeconds?: number;
  disabled?: boolean;
  onCancel: (reason: string) => void | Promise<void>;
};

export function CancelCountdown({
  paidAt,
  windowSeconds = 10,
  disabled = false,
  onCancel,
}: Props) {
  const [remaining, setRemaining] = useState(() => {
    const deadline = new Date(paidAt).getTime() + windowSeconds * 1000;
    return Math.max(0, (deadline - Date.now()) / 1000);
  });
  const [reason, setReason] = useState(REASONS[0]!);

  useEffect(() => {
    const deadline = new Date(paidAt).getTime() + windowSeconds * 1000;
    const tick = () => setRemaining(Math.max(0, (deadline - Date.now()) / 1000));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [paidAt, windowSeconds]);

  const expired = remaining <= 0;

  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-on-surface">
          <Timer className="size-4 text-primary-strong" />
          <span>
            {expired
              ? "Batas waktu pembatalan 10 detik berakhir"
              : "Pembatalan otomatis aktif (≤ 10 detik)"}
          </span>
        </p>
        <span
          className={`font-label text-lg font-bold tabular-nums ${
            expired ? "text-on-surface-muted" : "text-primary-strong"
          }`}
        >
          00:{String(Math.ceil(remaining)).padStart(2, "0")}
        </span>
      </div>

      <ProgressBar
        value={(remaining / windowSeconds) * 100}
        label="Sisa waktu pembatalan"
      />

      {!expired ? (
        <>
          <div className="mt-3">
            <p className="mb-1.5 font-label text-[11px] text-on-surface-muted">
              Alasan pembatalan:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`rounded-full px-3 py-1 font-label text-[11px] font-medium transition-colors ${
                    reason === r
                      ? "bg-primary-strong text-on-primary"
                      : "bg-white text-on-surface-muted hover:bg-surface-variant"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="danger"
            className="mt-3 w-full py-2.5"
            disabled={disabled}
            onClick={() => void onCancel(reason)}
          >
            {disabled ? "Memproses pembatalan..." : "Batalkan Pesanan (Refund Otomatis)"}
          </Button>
        </>
      ) : (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-muted">
          <span>Tombol batal otomatis dinonaktifkan setelah 10 detik.</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => void onCancel(reason)}
            className="rounded-full bg-white px-3 py-1 font-label text-[11px] font-medium text-primary-strong underline hover:bg-surface-variant disabled:opacity-50"
          >
            {disabled ? "Menguji..." : "Uji Validasi Server (>10d)"}
          </button>
        </div>
      )}
    </div>
  );
}
