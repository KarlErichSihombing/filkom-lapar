"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setStandBuka } from "@/actions/menu";

export function TokoToggle({ buka }: { buka: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(buka);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !optimistic;
    setError(null);
    startTransition(async () => {
      setOptimistic(next);
      const res = await setStandBuka(next);
      if (res.error) setError(res.error);
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
            optimistic ? "text-secondary" : "text-on-surface-muted"
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              optimistic ? "bg-secondary-soft" : "bg-neutral"
            }`}
          />
          {optimistic ? "Toko buka" : "Toko tutup"}
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
        aria-checked={optimistic}
        aria-label="Stand menerima pesanan"
        onClick={toggle}
        disabled={pending}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          optimistic ? "bg-secondary-soft" : "bg-outline/40"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform ${
            optimistic ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}