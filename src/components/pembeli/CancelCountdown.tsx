"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";

type Props = {
    /** Waktu bayar dari server (ISO string), mis. pembayaran.waktuBayar */
    paidAt: string;
    windowSeconds?: number;
    onCancel: () => void | Promise<void>;
};

export function CancelCountdown({ paidAt, windowSeconds = 10, onCancel }: Props) {
    const [remaining, setRemaining] = useState(windowSeconds);

    useEffect(() => {
        const deadline = new Date(paidAt).getTime() + windowSeconds * 1000;
        const tick = () => setRemaining(Math.max(0, (deadline - Date.now()) / 1000));
        tick();
        const id = setInterval(tick, 100);
        return () => clearInterval(id);

    }, [paidAt, windowSeconds]);

    //setelah waktu habis tombol batal hilang
    if (remaining <= 0) return null;

    return (
        <div className="rounded-card bg-surface p-4">
            <div className="mb-3 flex items-baseline justify-between">
                <p className="text-sm text-on-surface-muted">Pembatalan otomatis aktif</p>
                <span className="font-label text-xl tabular-nums text-primary-strong">
                    00:{String(Math.ceil(remaining)).padStart(2, "0")}
                </span>
            </div>
            <ProgressBar
                value={(remaining / windowSeconds) * 100}
                label="Sisa waktu pembatalan"
            />
            <Button variant="outlined" className="mt-4 w-full" onClick={onCancel}>
                Batalkan pesanan
            </Button>
        </div>
    );
}