"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { DeleteMenuForm, MenuForm } from "@/components/seller/MenuForm";
import { SellerStats } from "@/components/seller/SellerStats";
import { StokToggle } from "@/components/seller/StokToggle";
import { Button } from "@/components/ui/Button";
import { ImageIcon, Pencil, Plus, Search, Trash, Utensils } from "@/components/ui/icons";
import { rupiah } from "@/lib/format";
import { KATEGORI_LABEL, type Kategori, type MenuItem } from "@/types/menu";

type KategoriFilter = "semua" | Kategori;
type StokFilter = "semua" | "tersedia" | "habis";
type DialogState =
  | { type: "create" }
  | { type: "edit"; item: MenuItem }
  | { type: "delete"; item: MenuItem }
  | null;

export type SellerMenuItem = MenuItem & {
  terjual?: number;
};

export function MenuManager({
  tokoId,
  items,
  rating = 0,
  reviewCount = 0,
  saldoAktif = 0,
  activeOrders = 0,
}: {
  tokoId: string;
  items: SellerMenuItem[];
  rating?: number;
  reviewCount?: number;
  saldoAktif?: number;
  activeOrders?: number;
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
  const totalTerjual = useMemo(
    () => list.reduce((acc, m) => acc + (m.terjual ?? 0), 0),
    [list],
  );

  const kategoriCounts = useMemo(() => {
    return {
      semua: list.length,
      makanan: list.filter((m) => m.kategori === "makanan").length,
      minuman: list.filter((m) => m.kategori === "minuman").length,
      camilan: list.filter((m) => m.kategori === "camilan").length,
    };
  }, [list]);

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
        reviewCount={reviewCount}
        totalTerjual={totalTerjual}
        saldoAktif={saldoAktif}
        activeOrders={activeOrders}
      />

      <section className="rounded-[2rem] bg-white p-5 shadow-xs sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-surface pb-5">
          <div>
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-primary-strong">
              Katalog Real-Time Stand
            </p>
            <h2 className="mt-1 text-2xl font-bold">Manajemen Menu &amp; Ketersediaan Stok</h2>
            <p className="mt-0.5 text-xs text-on-surface-muted sm:text-sm">
              Geser saklar stok untuk mengubah status <strong>Tersedia / Habis</strong> secara
              instan di layar pembeli.
            </p>
          </div>
          <Button onClick={() => setDialog({ type: "create" })}>
            <Plus className="size-4" /> Tambah Menu Baru
          </Button>
        </div>

        {/* Filter Pencarian, Kategori, & Stok */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-outline" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Cari menu"
              placeholder="Cari nama menu di stand Anda..."
              className="w-full rounded-full bg-surface py-2.5 pl-11 pr-4 text-sm placeholder:text-outline"
            />
          </div>

          <div
            role="radiogroup"
            aria-label="Filter kategori"
            className="flex flex-wrap gap-1 rounded-full bg-surface p-1"
          >
            {(
              [
                { value: "semua", label: "Semua", count: kategoriCounts.semua },
                { value: "makanan", label: "Makanan", count: kategoriCounts.makanan },
                { value: "minuman", label: "Minuman", count: kategoriCounts.minuman },
                { value: "camilan", label: "Camilan", count: kategoriCounts.camilan },
              ] as const
            ).map((o) => {
              const active = kategori === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setKategori(o.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-label text-xs font-semibold transition-colors ${
                    active
                      ? "bg-primary-strong text-on-primary"
                      : "text-on-surface-muted hover:bg-surface-variant"
                  }`}
                >
                  <span>{o.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                      active ? "bg-white/20 text-on-primary" : "bg-white text-on-surface-muted"
                    }`}
                  >
                    {o.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            role="radiogroup"
            aria-label="Filter stok"
            className="flex gap-1 rounded-full bg-surface p-1"
          >
            {(
              [
                { value: "semua", label: "Semua Stok" },
                { value: "tersedia", label: "Tersedia" },
                { value: "habis", label: "Habis" },
              ] as const
            ).map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={stok === o.value}
                onClick={() => setStok(o.value)}
                className={`rounded-full px-3.5 py-1.5 font-label text-xs font-semibold transition-colors ${
                  stok === o.value
                    ? "bg-primary-strong text-on-primary"
                    : "text-on-surface-muted hover:bg-surface-variant"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-surface px-5 py-14 text-center">
            <Utensils className="mx-auto size-10 text-outline" />
            <p className="mt-3 font-headline text-base font-bold text-on-surface">
              {list.length === 0
                ? "Stand Anda Belum Memiliki Menu"
                : "Tidak Ada Menu yang Cocok dengan Filter"}
            </p>
            <p className="mt-1 text-xs text-on-surface-muted">
              {list.length === 0
                ? "Klik tombol Tambah Menu Baru di kanan atas untuk mulai menampilkan makanan/minuman ke pembeli."
                : "Coba ubah kata kunci pencarian atau pilih kategori lainnya."}
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((m) => (
              <li
                key={m.id}
                className={`flex flex-col justify-between overflow-hidden rounded-3xl bg-surface/65 p-4 ring-1 transition-all hover:shadow-md ${
                  m.tersedia ? "ring-surface-variant/80" : "ring-error/25"
                }`}
              >
                <div>
                  <div className="flex gap-3.5">
                    <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-outline shadow-2xs">
                      {m.fotoUrl ? (
                        <Image
                          src={m.fotoUrl}
                          alt={m.namaMenu}
                          fill
                          sizes="96px"
                          className={`object-cover ${m.tersedia ? "" : "grayscale"}`}
                        />
                      ) : (
                        <ImageIcon className="size-8" />
                      )}
                      <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/65 px-2 py-0.5 font-label text-[9px] font-semibold text-white backdrop-blur-xs">
                        {KATEGORI_LABEL[m.kategori]}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`font-headline text-base font-bold leading-snug ${
                            m.tersedia
                              ? "text-on-surface"
                              : "text-on-surface-muted line-through"
                          }`}
                        >
                          {m.namaMenu}
                        </h3>
                      </div>

                      <p className="mt-1 font-headline text-lg font-extrabold text-primary-strong">
                        {rupiah(m.harga)}
                      </p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 font-label text-[10px] font-semibold ${
                            m.tersedia
                              ? "bg-secondary-container text-secondary"
                              : "bg-error/15 text-error"
                          }`}
                        >
                          {m.tersedia ? "Stok Tersedia" : "Stok Habis"}
                        </span>
                        {(m.terjual ?? 0) > 0 && (
                          <span className="rounded-full bg-white px-2 py-0.5 font-label text-[10px] font-semibold text-primary-strong">
                            {m.terjual}× terjual
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {m.deskripsi && (
                    <p className="mt-3 line-clamp-2 rounded-xl bg-white/70 px-3 py-2 text-xs text-on-surface-muted">
                      {m.deskripsi}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-surface-variant/60 pt-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDialog({ type: "edit", item: m })}
                      aria-label={`Ubah ${m.namaMenu}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-label text-xs font-semibold text-on-surface transition-colors hover:bg-surface-variant"
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDialog({ type: "delete", item: m })}
                      aria-label={`Hapus ${m.namaMenu}`}
                      className="inline-flex items-center gap-1 rounded-full bg-error/10 px-2.5 py-1.5 font-label text-xs font-semibold text-error transition-colors hover:bg-error/20"
                    >
                      <Trash className="size-3.5" />
                    </button>
                  </div>

                  <StokToggle
                    menuId={m.id}
                    tersedia={m.tersedia}
                    nama={m.namaMenu}
                    onChange={(next) => handleToggleStok(m.id, next)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={dialog?.type === "create"} onClose={close} title="Tambah Menu Baru">
        {dialog?.type === "create" && (
          <MenuForm mode="create" tokoId={tokoId} onDone={close} onCancel={close} />
        )}
      </Modal>

      <Modal open={dialog?.type === "edit"} onClose={close} title="Ubah Menu">
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

      <Modal open={dialog?.type === "delete"} onClose={close} title="Hapus Menu?">
        {dialog?.type === "delete" && (
          <DeleteMenuForm item={dialog.item} onDone={close} onCancel={close} />
        )}
      </Modal>
    </>
  );
}
