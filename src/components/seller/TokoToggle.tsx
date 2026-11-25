"use client";

import { useState, useTransition } from "react";
import { setStandBuka } from "@/actions/menu";
import { useStandStatus } from "@/components/seller/StandStatus";

export function TokoToggle({
  tokoId,
  buka: initialBuka,
}: {
  tokoId: string;
  buka?: boolean;
}) {
  const { buka, setBuka } = useStandStatus(initialBuka ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const prev = buka;
    const next = !prev;
    setError(null);
    setBuka(next);
    startTransition(async () => {
      const res = await setStandBuka(tokoId, next);
      if (res.error) {
        setBuka(prev);
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
      <div className="text-right">
        <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-muted">
          Stand menerima pesanan
        </p>
        <p
          className={`flex items-center justify-end gap-1.5 text-xs font-medium ${
            buka ? "text-secondary" : "text-on-surface-muted"
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              buka ? "bg-secondary-soft" : "bg-neutral"
            }`}
          />
          {buka ? "Toko buka" : "Toko tutup"}
        </p>
        {error && (
          <p role="alert" className="text-[11px] text-error">
            {error}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={buka}
        aria-label="Stand menerima pesanan"
        onClick={toggle}
        disabled={pending}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          buka ? "bg-secondary-soft" : "bg-outline/40"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform ${
            buka ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}
