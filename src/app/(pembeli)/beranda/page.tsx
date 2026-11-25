import { TokoList } from "@/components/buyer/TokoList";
import { getBuyerContext } from "@/lib/buyer";
import { createClient } from "@/lib/supabase/server";
import type { StandCard } from "@/types/toko";

type StandRow = {
  id: string;
  no_stand: number;
  nama_toko: string;
  buka: boolean;
  rating_rata_rata: number | null;
  foto_url: string | null;
  menu: {
    id: string;
    nama_menu: string;
    foto_url: string | null;
    tersedia: boolean;
  }[];
};

export default async function BerandaPage() {
  const ctx = await getBuyerContext();
  const supabase = await createClient();

  // RLS: pembeli hanya menerima stand aktif dan menu yang belum dihapus
  const { data, error } = await supabase
    .from("toko")
    .select(
      "id, no_stand, nama_toko, buka, rating_rata_rata, foto_url, menu(id, nama_menu, foto_url, tersedia)",
    )
    .order("no_stand", { ascending: true });

  if (error) {
    return (
      <p role="alert" className="rounded-3xl bg-white p-6 text-sm text-error">
        Gagal memuat daftar stand: {error.message}. Pastikan SQL 002_menu sudah
        dijalankan di Supabase.
      </p>
    );
  }

  const stands: StandCard[] = ((data ?? []) as unknown as StandRow[])
    .map((r) => ({
      id: r.id,
      noStand: r.no_stand,
      namaToko: r.nama_toko,
      buka: r.buka,
      rating: Number(r.rating_rata_rata ?? 0),
      fotoUrl: r.foto_url,
      menu: r.menu.map((m) => ({
        id: m.id,
        namaMenu: m.nama_menu,
        fotoUrl: m.foto_url,
        tersedia: m.tersedia,
      })),
    }))
    // stand yang buka tampil lebih dulu
    .sort((a, b) => Number(b.buka) - Number(a.buka) || a.noStand - b.noStand);

  const firstName = ctx.nama.split(/\s+/)[0] || "kamu";

  return (
    <>
      <section className="rounded-3xl bg-surface p-6 sm:p-8">
        <p className="font-label text-[11px] font-medium uppercase tracking-wider text-primary-strong">
          Kantin Gedung F · Lantai 1
        </p>
        <h1 className="mt-2 font-headline text-3xl font-bold leading-tight sm:text-4xl">
          Halo, {firstName}. Mau makan apa hari ini?
        </h1>
        <p className="mt-2 max-w-xl text-sm text-on-surface-muted">
          Pilih stand, lihat menunya, dan cek ketersediaan sebelum antre.
        </p>
      </section>

      <TokoList stands={stands} />
    </>
  );
}
