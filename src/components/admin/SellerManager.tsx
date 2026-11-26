"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Modal } from "@/components/admin/Modal";
import { DeleteSellerForm, SellerForm } from "@/components/admin/SellerForm";
import { Button } from "@/components/ui/Button";
import { Pencil, Plus, Search, Trash } from "@/components/ui/icons";
import type { SellerRow } from "@/types/seller";

type Filter = "semua" | "aktif" | "nonaktif";
type DialogState =
  | { type: "create" }
  | { type: "edit"; row: SellerRow }
  | { type: "delete"; row: SellerRow }
  | null;

const pad = (n: number) => String(n).padStart(2, "0");

const filters: { value: Filter; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "aktif", label: "Aktif" },
  { value: "nonaktif", label: "Nonaktif" },
];

export function SellerManager({
  rows,
  stats,
}: {
  rows: SellerRow[];
  stats: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("semua");
  const [dialog, setDialog] = useState<DialogState>(null);
  const close = useCallback(() => setDialog(null), []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "aktif" && !r.aktif) return false;
      if (filter === "nonaktif" && r.aktif) return false;
      if (!q) return true;
      return [r.namaToko, r.namaPenjual, r.email, `stand ${pad(r.noStand)}`].some(
        (v) => v.toLowerCase().includes(q),
      );
    });
  }, [rows, query, filter]);

  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-5 sm:p-6">
        <div>
          <p className="flex items-center gap-2 font-label text-[10px] uppercase tracking-wider">
            <span className="rounded-full bg-primary-container px-2 py-0.5 font-medium text-primary-strong">
              Manajemen tenant
            </span>
            <span className="text-on-surface-muted">· Kantin GKM</span>
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight">
            Kelola Akun Penjual &amp; Stand Kantin
          </h1>
          <p className="mt-1 text-sm text-on-surface-muted">
            Tambah, ubah, atau hapus akun penjual yang beroperasi di Kantin
            GKM FILKOM UB.
          </p>
        </div>
        <Button onClick={() => setDialog({ type: "create" })}>
          <Plus className="size-4" /> Tambah penjual
        </Button>
      </section>

      {stats}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-outline" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Cari penjual atau stand"
            placeholder="Cari nama penjual, nama stand, atau email..."
            className="w-full rounded-full bg-surface py-2.5 pl-10 pr-4 text-sm placeholder:text-outline"
          />
        </div>
        <div
          role="radiogroup"
          aria-label="Filter status"
          className="flex gap-1 rounded-full bg-surface p-1"
        >
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-4 py-1.5 font-label text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-primary-strong text-on-primary"
                  : "text-on-surface-muted hover:bg-surface-variant"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-x-auto rounded-3xl bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="font-label text-[11px] uppercase tracking-wider text-on-surface-muted">
              <th className="px-5 py-4 font-medium">No. stand</th>
              <th className="px-3 py-4 font-medium">Nama stand kantin</th>
              <th className="px-3 py-4 font-medium">Nama penjual</th>
              <th className="px-3 py-4 font-medium">Email / username</th>
              <th className="px-3 py-4 font-medium">Status</th>
              <th className="px-5 py-4">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.tokoId} className="border-t border-surface">
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 font-label text-xs font-medium ${
                      r.aktif
                        ? "bg-primary-container text-primary-strong"
                        : "bg-surface-variant text-on-surface-muted"
                    }`}
                  >
                    Stand {pad(r.noStand)}
                  </span>
                </td>
                <td className="px-3 py-4 font-headline font-semibold">
                  {r.namaToko}
                </td>
                <td className="px-3 py-4">{r.namaPenjual}</td>
                <td className="px-3 py-4 font-label text-xs">{r.email}</td>
                <td className="px-3 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-label text-xs font-medium ${
                      r.aktif
                        ? "bg-secondary-container text-secondary"
                        : "bg-neutral/15 text-on-surface-muted"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        r.aktif ? "bg-secondary-soft" : "bg-neutral"
                      }`}
                    />
                    {r.aktif ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setDialog({ type: "edit", row: r })}
                      className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 font-label text-xs font-medium transition-colors hover:bg-surface-variant"
                    >
                      <Pencil className="size-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDialog({ type: "delete", row: r })}
                      aria-label={`Hapus ${r.namaToko}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-error/10 px-3 py-1.5 font-label text-xs font-medium text-error transition-colors hover:bg-error/20"
                    >
                      <Trash className="size-3.5" /> Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visible.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-on-surface-muted">
            {rows.length === 0
              ? "Belum ada stand terdaftar. Klik Tambah penjual untuk membuat akun penjual pertama."
              : "Tidak ada hasil yang cocok dengan pencarian atau filter ini."}
          </p>
        )}
      </section>

      <Modal open={dialog?.type === "create"} onClose={close} title="Tambah penjual">
        {dialog?.type === "create" && (
          <SellerForm mode="create" onDone={close} onCancel={close} />
        )}
      </Modal>

      <Modal open={dialog?.type === "edit"} onClose={close} title="Ubah data penjual">
        {dialog?.type === "edit" && (
          <SellerForm mode="edit" row={dialog.row} onDone={close} onCancel={close} />
        )}
      </Modal>

      <Modal open={dialog?.type === "delete"} onClose={close} title="Hapus penjual?">
        {dialog?.type === "delete" && (
          <DeleteSellerForm row={dialog.row} onDone={close} onCancel={close} />
        )}
      </Modal>
    </>
  );
}