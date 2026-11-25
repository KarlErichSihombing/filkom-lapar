"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toggleStok } from "@/actions/menu";

type Props = { menuId: string; tersedia: boolean; nama: string };

export function StokToggle({ menuId, tersedia, nama }: Props) {
  const [optimistic, setOptimistic] = useOptimistic(tersedia);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !optimistic;
    setError(null);
    startTransition(async () => {
      setOptimistic(next); // tampil langsung; kembali ke semula bila server gagal
      const res = await toggleStok(menuId, next);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span
          className={`font-label text-[11px] font-medium ${
            optimistic ? "text-secondary" : "text-error"
          }`}
        >
          {optimistic ? "Tersedia" : "Habis"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={optimistic}
          aria-label={`Stok ${nama}`}
          onClick={toggle}
          disabled={pending}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            optimistic ? "bg-secondary-soft" : "bg-outline/40"
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
              optimistic ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
      {error && (
        <p role="alert" className="text-[11px] text-error">
          {error}
        </p>
      )}
    </div>
  );
}