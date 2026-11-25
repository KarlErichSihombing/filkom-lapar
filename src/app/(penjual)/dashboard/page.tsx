import { MenuManager } from "@/components/seller/MenuManager";
import { StandBanner } from "@/components/seller/StandBanner";
import { getSellerContext } from "@/lib/seller";
import { createClient } from "@/lib/supabase/server";
import type { Kategori, MenuItem } from "@/types/menu";

type MenuRow = {
  id: string;
  nama_menu: string;
  deskripsi: string | null;
  harga: number | string;
  kategori: Kategori;
  foto_url: string | null;
  tersedia: boolean;
};

export default async function DashboardPage() {
  const ctx = await getSellerContext();

  if (!ctx.toko) {
    return (
      <p className="rounded-3xl bg-white p-6 text-sm text-on-surface-muted">
        Akun ini belum terhubung ke stand mana pun. Hubungi admin kantin untuk
        mendaftarkan stand Anda.
      </p>
    );
  }
  const toko = ctx.toko;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu")
    .select("id, nama_menu, deskripsi, harga, kategori, foto_url, tersedia")
    .eq("toko_id", toko.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p role="alert" className="rounded-3xl bg-white p-6 text-sm text-error">
        Gagal memuat menu: {error.message}. Pastikan SQL 002_menu sudah
        dijalankan di Supabase.
      </p>
    );
  }

  const items: MenuItem[] = ((data ?? []) as MenuRow[]).map((r) => ({
    id: r.id,
    namaMenu: r.nama_menu,
    deskripsi: r.deskripsi,
    harga: Number(r.harga),
    kategori: r.kategori,
    fotoUrl: r.foto_url,
    tersedia: r.tersedia,
  }));

  return (
    <>
      <StandBanner
        tokoId={toko.id}
        namaToko={toko.namaToko}
        noStand={toko.noStand}
        fotoUrl={toko.fotoUrl}
        buka={toko.buka}
      />
      <MenuManager tokoId={toko.id} items={items} rating={toko.ratingRataRata} />
    </>
  );
}
