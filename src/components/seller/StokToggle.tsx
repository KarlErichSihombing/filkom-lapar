"use client";

import { useState, useTransition } from "react";
import { toggleStok } from "@/actions/menu";

type Props = {
  menuId: string;
  tersedia: boolean;
  nama: string;
  onChange?: (tersedia: boolean) => void;
};

export function StokToggle({ menuId, tersedia, nama, onChange }: Props) {
  const [localOverride, setLocalOverride] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const checked = onChange ? tersedia : (localOverride ?? tersedia);

  function toggle() {
    const prev = checked;
    const next = !prev;
    setError(null);
    setLocalOverride(next);
    onChange?.(next);

    startTransition(async () => {
      const res = await toggleStok(menuId, next);
      if (res.error) {
        setLocalOverride(prev);
        onChange?.(prev);
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span
          className={`font-label text-[11px] font-medium ${
            checked ? "text-secondary" : "text-error"
          }`}
        >
          {checked ? "Tersedia" : "Habis"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={`Stok ${nama}`}
          onClick={toggle}
          disabled={pending}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            checked ? "bg-secondary-soft" : "bg-outline/40"
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
              checked ? "translate-x-5" : ""
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
