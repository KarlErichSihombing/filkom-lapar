"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Kategori, MenuItem } from "@/types/menu";
import type { StandCatalog } from "@/types/toko";

type MenuRow = {
  id: string;
  toko_id: string;
  nama_menu: string;
  deskripsi: string | null;
  harga: number | string;
  kategori: Kategori;
  foto_url: string | null;
  tersedia: boolean;
  deleted_at: string | null;
};
type TokoRow = { id: string; nama_toko?: string; buka?: boolean; foto_url?: string | null };

const toItem = (r: MenuRow): MenuItem => ({
  id: r.id,
  namaMenu: r.nama_menu,
  deskripsi: r.deskripsi,
  harga: Number(r.harga),
  kategori: r.kategori,
  fotoUrl: r.foto_url,
  tersedia: r.tersedia,
});

/**
 * Daftar stand + menu yang ikut berubah saat penjual menggeser stok, menambah menu,
 * atau membuka/menutup stand. Berikan onlyTokoId untuk memantau satu stand saja.
 */
export function useLiveCatalog(initial: StandCatalog[], onlyTokoId?: string) {
  const [stands, setStands] = useState(initial);

  useEffect(() => {
    const supabase = createClient();
    const menuFilter = onlyTokoId ? { filter: `toko_id=eq.${onlyTokoId}` } : {};
    const tokoFilter = onlyTokoId ? { filter: `id=eq.${onlyTokoId}` } : {};

    const channel = supabase
      .channel(`katalog-${onlyTokoId ?? "semua"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu", ...menuFilter },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            if (id) {
              setStands((prev) =>
                prev.map((s) => ({ ...s, menu: s.menu.filter((m) => m.id !== id) })),
              );
            }
            return;
          }
          const row = payload.new as unknown as MenuRow;
          setStands((prev) =>
            prev.map((s) => {
              if (row.deleted_at) {
                return { ...s, menu: s.menu.filter((m) => m.id !== row.id) };
              }
              if (s.id !== row.toko_id) return s;
              const item = toItem(row);
              return s.menu.some((m) => m.id === item.id)
                ? { ...s, menu: s.menu.map((m) => (m.id === item.id ? item : m)) }
                : { ...s, menu: [...s.menu, item] };
            }),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "toko", ...tokoFilter },
        (payload) => {
          const row = payload.new as unknown as TokoRow;
          setStands((prev) =>
            prev.map((s) =>
              s.id === row.id
                ? {
                    ...s,
                    buka: row.buka ?? s.buka,
                    fotoUrl: row.foto_url === undefined ? s.fotoUrl : row.foto_url,
                    namaToko: row.nama_toko ?? s.namaToko,
                  }
                : s,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onlyTokoId]);

  return stands;
}