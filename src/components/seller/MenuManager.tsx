"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { DeleteMenuForm, MenuForm } from "@/components/seller/MenuForm";
import { SellerStats } from "@/components/seller/SellerStats";
import { StokToggle } from "@/components/seller/StokToggle";
import { Button } from "@/components/ui/Button";
import { ImageIcon, Pencil, Plus, Search, Trash } from "@/components/ui/icons";
import { rupiah } from "@/lib/format";
import { KATEGORI_LABEL, type Kategori, type MenuItem } from "@/types/menu";

type KategoriFilter = "semua" | Kategori;
type StokFilter = "semua" | "tersedia" | "habis";
type DialogState =
  | { type: "create" }
  | { type: "edit"; item: MenuItem }
  | { type: "delete"; item: MenuItem }
  | null;

const kategoriFilters: { value: KategoriFilter; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "makanan", label: "Makanan" },
  { value: "minuman", label: "Minuman" },
  { value: "camilan", label: "Camilan" },
];

const stokFilters: { value: StokFilter; label: string }[] = [
  { value: "semua", label: "Semua stok" },
  { value: "tersedia", label: "Tersedia" },
  { value: "habis", label: "Habis" },
];

function Pills<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 rounded-full bg-surface p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3.5 py-1.5 font-label text-xs font-medium transition-colors ${
            value === o.value
              ? "bg-primary-strong text-on-primary"
              : "text-on-surface-muted hover:bg-surface-variant"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function MenuManager({
  tokoId,
  items,
  rating = 0,
}: {
  tokoId: string;
  items: MenuItem[];
  rating?: number;
}) {
  const [stokOverrides, setStokOverrides] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [kategori, setKategori] = useState<KategoriFilter>("semua");
  const [stok, setStok] = useState<StokFilter>("semua");
  const [dialog, setDialog] = useState<DialogState>(null);
  const close = useCallback(() => setDialog(null), []);

  const list = useMemo(
    () =>
      items.map((m) =>
        m.id in stokOverrides ? { ...m, tersedia: stokOverrides[m.id]! } : m,
      ),
    [items, stokOverrides],
  );

  const handleToggleStok = useCallback((menuId: string, nextTersedia: boolean) => {
    setStokOverrides((prev) => ({ ...prev, [menuId]: nextTersedia }));
  }, []);

  const available = useMemo(() => list.filter((m) => m.tersedia).length, [list]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((m) => {
      if (kategori !== "semua" && m.kategori !== kategori) return false;
      if (stok === "tersedia" && !m.tersedia) return false;
      if (stok === "habis" && m.tersedia) return false;
      return !q || m.namaMenu.toLowerCase().includes(q);
    });
  }, [list, query, kategori, stok]);

  return (
    <>
      <SellerStats
        total={list.length}
        available={available}
        unavailable={list.length - available}
        rating={rating}
      />

      <section className="rounded-3xl bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Manajemen menu &amp; stok</h2>
            <p className="mt-0.5 text-sm text-on-surface-muted">
              Ganti ketersediaan menu secara instan saat bahan habis. Pembeli
              langsung melihat perubahannya.
            </p>
          </div>
          <Button onClick={() => setDialog({ type: "create" })}>
            <Plus className="size-4" /> Tambah menu
          </Button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-outline" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Cari menu"
              placeholder="Cari nama menu..."
              className="w-full rounded-full bg-surface py-2.5 pl-10 pr-4 text-sm placeholder:text-outline"
            />
          </div>
          <Pills label="Filter kategori" value={kategori} options={kategoriFilters} onChange={setKategori} />
          <Pills label="Filter stok" value={stok} options={stokFilters} onChange={setStok} />
        </div>

        {visible.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-surface px-5 py-10 text-center text-sm text-on-surface-muted">
            {items.length === 0
              ? "Belum ada menu. Klik Tambah menu untuk membuat menu pertama."
              : "Tidak ada menu yang cocok dengan pencarian atau filter ini."}
          </p>
        ) : (
          <ul className="mt-5 grid gap-3 xl:grid-cols-2">
            {visible.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-2xl bg-surface p-3"
              >
                <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-outline">
                  {m.fotoUrl ? (
                    <Image
                      src={m.fotoUrl}
                      alt=""
                      fill
                      sizes="64px"
                      className={`object-cover ${m.tersedia ? "" : "grayscale"}`}
                    />
                  ) : (
                    <ImageIcon className="size-6" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate font-headline font-semibold ${
                      m.tersedia ? "" : "text-on-surface-muted line-through"
                    }`}
                  >
                    {m.namaMenu}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className="font-label font-medium text-primary-strong">
                      {rupiah(m.harga)}
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 font-label text-[10px] text-on-surface-muted">
                      {KATEGORI_LABEL[m.kategori]}
                    </span>
                  </p>
                  {m.deskripsi && (
                    <p className="mt-1 truncate text-xs text-on-surface-muted">
                      {m.deskripsi}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StokToggle
                    menuId={m.id}
                    tersedia={m.tersedia}
                    nama={m.namaMenu}
                    onChange={(next) => handleToggleStok(m.id, next)}
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDialog({ type: "edit", item: m })}
                      aria-label={`Ubah ${m.namaMenu}`}
                      className="grid size-8 place-items-center rounded-full bg-white text-on-surface-muted transition-colors hover:bg-surface-variant"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDialog({ type: "delete", item: m })}
                      aria-label={`Hapus ${m.namaMenu}`}
                      className="grid size-8 place-items-center rounded-full bg-error/10 text-error transition-colors hover:bg-error/20"
                    >
                      <Trash className="size-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={dialog?.type === "create"} onClose={close} title="Tambah menu">
        {dialog?.type === "create" && (
          <MenuForm mode="create" tokoId={tokoId} onDone={close} onCancel={close} />
        )}
      </Modal>

      <Modal open={dialog?.type === "edit"} onClose={close} title="Ubah menu">
        {dialog?.type === "edit" && (
          <MenuForm
            mode="edit"
            item={dialog.item}
            tokoId={tokoId}
            onDone={close}
            onCancel={close}
          />
        )}
      </Modal>

      <Modal open={dialog?.type === "delete"} onClose={close} title="Hapus menu?">
        {dialog?.type === "delete" && (
          <DeleteMenuForm item={dialog.item} onDone={close} onCancel={close} />
        )}
      </Modal>
    </>
  );
}