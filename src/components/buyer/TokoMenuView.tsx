"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ImageIcon, Search, Star } from "@/components/ui/icons";
import { pad2, rupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { KATEGORI_LABEL, type Kategori, type MenuItem } from "@/types/menu";

type Props = {
  toko: {
    id: string;
    namaToko: string;
    noStand: number;
    rating: number;
    buka: boolean;
  };
  initialMenu: MenuItem[];
};

type MenuRow = {
  id: string;
  nama_menu: string;
  deskripsi: string | null;
  harga: number | string;
  kategori: Kategori;
  foto_url: string | null;
  tersedia: boolean;
  deleted_at: string | null;
};

const toItem = (r: MenuRow): MenuItem => ({
  id: r.id,
  namaMenu: r.nama_menu,
  deskripsi: r.deskripsi,
  harga: Number(r.harga),
  kategori: r.kategori,
  fotoUrl: r.foto_url,
  tersedia: r.tersedia,
});

export function TokoMenuView({ toko, initialMenu }: Props) {
  const [menu, setMenu] = useState(initialMenu);
  const [buka, setBuka] = useState(toko.buka);
  const [query, setQuery] = useState("");
  const [kategori, setKategori] = useState<"semua" | Kategori>("semua");

  // Perubahan dari penjual langsung masuk tanpa memuat ulang halaman.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`toko-${toko.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu", filter: `toko_id=eq.${toko.id}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            if (id) setMenu((l) => l.filter((m) => m.id !== id));
            return;
          }
          const row = payload.new as unknown as MenuRow;
          if (row.deleted_at) {
            setMenu((l) => l.filter((m) => m.id !== row.id));
            return;
          }
          const item = toItem(row);
          setMenu((l) =>
            l.some((m) => m.id === item.id)
              ? l.map((m) => (m.id === item.id ? item : m))
              : [...l, item],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "toko", filter: `id=eq.${toko.id}` },
        (payload) => setBuka(Boolean((payload.new as { buka?: boolean }).buka)),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toko.id]);

  const kategoriTersedia = useMemo(
    () => Array.from(new Set(menu.map((m) => m.kategori))),
    [menu],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menu
      .filter((m) => {
        if (kategori !== "semua" && m.kategori !== kategori) return false;
        return !q || m.namaMenu.toLowerCase().includes(q);
      })
      // yang tersedia lebih dulu, lalu urut nama
      .sort(
        (a, b) =>
          Number(b.tersedia) - Number(a.tersedia) ||
          a.namaMenu.localeCompare(b.namaMenu, "id"),
      );
  }, [menu, query, kategori]);

  const available = menu.filter((m) => m.tersedia).length;

  return (
    <>
      <section className="rounded-3xl bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-muted">
              Stand No. {pad2(toko.noStand)}
            </p>
            <h1 className="mt-1 text-3xl font-semibold leading-tight">{toko.namaToko}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-on-surface-muted">
              <span className="flex items-center gap-1">
                <Star className="size-4 text-primary" />
                {toko.rating > 0 ? toko.rating.toFixed(1) : "Belum ada ulasan"}
              </span>
              <span>
                {menu.length === 0
                  ? "Belum ada menu"
                  : `${menu.length} menu · ${available} tersedia`}
              </span>
            </p>
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-label text-xs font-medium ${
              buka ? "bg-secondary-container text-secondary" : "bg-inverted text-on-primary"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${buka ? "bg-secondary-soft" : "bg-neutral"}`}
            />
            {buka ? "Buka" : "Tutup"}
          </span>
        </div>

        {!buka && (
          <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-sm text-on-surface-muted">
            Stand ini sedang tutup. Menunya tetap bisa dilihat.
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-outline" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Cari menu"
            placeholder="Cari menu..."
            className="w-full rounded-full bg-surface py-3 pl-11 pr-4 text-sm placeholder:text-outline"
          />
        </div>
        {kategoriTersedia.length > 1 && (
          <div
            role="radiogroup"
            aria-label="Filter kategori"
            className="flex gap-1 rounded-full bg-surface p-1"
          >
            {(["semua", ...kategoriTersedia] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kategori === k}
                onClick={() => setKategori(k)}
                className={`rounded-full px-3.5 py-2 font-label text-xs font-medium transition-colors ${
                  kategori === k
                    ? "bg-primary-strong text-on-primary"
                    : "text-on-surface-muted hover:bg-surface-variant"
                }`}
              >
                {k === "semua" ? "Semua" : KATEGORI_LABEL[k]}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-3xl bg-surface px-5 py-12 text-center text-sm text-on-surface-muted">
          {menu.length === 0
            ? "Stand ini belum menambahkan menu."
            : "Tidak ada menu yang cocok dengan pencarian atau filter ini."}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-3xl bg-white">
              <div className="relative grid aspect-[4/3] place-items-center bg-surface text-outline">
                {m.fotoUrl ? (
                  <Image
                    src={m.fotoUrl}
                    alt={m.namaMenu}
                    fill
                    sizes="(min-width:1024px) 320px, (min-width:640px) 45vw, 100vw"
                    className={`object-cover ${m.tersedia ? "" : "grayscale"}`}
                  />
                ) : (
                  <ImageIcon className="size-10" />
                )}
                {!m.tersedia && (
                  <span className="absolute left-3 top-3 rounded-full bg-error px-3 py-1 font-label text-xs font-medium text-on-primary">
                    Habis
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3
                    className={`font-headline font-semibold leading-snug ${
                      m.tersedia ? "" : "text-on-surface-muted"
                    }`}
                  >
                    {m.namaMenu}
                  </h3>
                  <span className="shrink-0 rounded-full bg-surface px-2.5 py-0.5 font-label text-[10px] text-on-surface-muted">
                    {KATEGORI_LABEL[m.kategori]}
                  </span>
                </div>
                {m.deskripsi && (
                  <p className="mt-1.5 line-clamp-2 text-xs text-on-surface-muted">
                    {m.deskripsi}
                  </p>
                )}
                <p className="mt-3 font-label text-base font-medium text-primary-strong">
                  {rupiah(m.harga)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}