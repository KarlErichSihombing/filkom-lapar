import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CartLine } from "@/types/cart";

type TokoRow = { id: string; nama_toko: string; no_stand: number; buka: boolean };
type MenuRow = {
  id: string;
  nama_menu: string;
  harga: number | string;
  foto_url: string | null;
  tersedia: boolean;
  toko_id: string;
  toko: TokoRow | TokoRow[] | null;
};
type Row = {
  menu_id: string;
  jumlah: number;
  catatan: string | null;
  menu: MenuRow | MenuRow[] | null;
};

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/** Keranjang pembeli yang sedang login, lengkap dengan status ketersediaan tiap baris. */
export async function fetchCartLines(): Promise<CartLine[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("keranjang_item")
    .select(
      "menu_id, jumlah, catatan, menu(id, nama_menu, harga, foto_url, tersedia, toko_id, toko(id, nama_toko, no_stand, buka))",
    )
    .order("created_at", { ascending: true });
  if (error || !data) return [];

  return (data as unknown as Row[]).map((r): CartLine => {
    const menu = one(r.menu);
    const toko = menu ? one(menu.toko) : null;

    // Menu yang sudah dihapus / stand nonaktif tidak terlihat (RLS) -> menu bernilai null
    if (!menu) {
      return {
        menuId: r.menu_id,
        tokoId: null,
        namaMenu: "Menu tidak tersedia lagi",
        harga: 0,
        fotoUrl: null,
        jumlah: r.jumlah,
        catatan: r.catatan ?? "",
        namaToko: "Stand tidak tersedia",
        noStand: null,
        valid: false,
        reason: "Menu sudah tidak tersedia",
      };
    }

    const reason = !menu.tersedia ? "Habis" : toko && !toko.buka ? "Stand sedang tutup" : null;
    return {
      menuId: menu.id,
      tokoId: menu.toko_id,
      namaMenu: menu.nama_menu,
      harga: Number(menu.harga),
      fotoUrl: menu.foto_url,
      jumlah: r.jumlah,
      catatan: r.catatan ?? "",
      namaToko: toko?.nama_toko ?? "Stand",
      noStand: toko?.no_stand ?? null,
      valid: reason === null,
      reason,
    };
  });
}