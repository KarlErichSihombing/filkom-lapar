import Link from "next/link";
import { notFound } from "next/navigation";
import { TokoMenuView } from "@/components/buyer/TokoMenuView";
import { ArrowLeft } from "@/components/ui/icons";
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TokoPage({
  params,
}: {
  params: Promise<{ tokoId: string }>;
}) {
  const { tokoId } = await params;
  if (!UUID_RE.test(tokoId)) notFound();

  const supabase = await createClient();

  // RLS: stand nonaktif tidak terlihat oleh pembeli -> dianggap tidak ada
  const [tokoRes, menuRes] = await Promise.all([
    supabase
      .from("toko")
      .select("id, no_stand, nama_toko, buka, rating_rata_rata, foto_url")
      .eq("id", tokoId)
      .maybeSingle(),
    supabase
      .from("menu")
      .select("id, nama_menu, deskripsi, harga, kategori, foto_url, tersedia")
      .eq("toko_id", tokoId)
      .is("deleted_at", null),
  ]);

  if (!tokoRes.data) notFound();
  if (menuRes.error) {
    return (
      <p role="alert" className="rounded-3xl bg-white p-6 text-sm text-error">
        Gagal memuat menu: {menuRes.error.message}
      </p>
    );
  }

  const toko = tokoRes.data;
  const menu: MenuItem[] = ((menuRes.data ?? []) as MenuRow[]).map((r) => ({
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
      <Link
        href="/beranda"
        className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 font-label text-xs font-medium text-on-surface-muted transition-colors hover:bg-surface-variant"
      >
        <ArrowLeft className="size-4" /> Semua stand
      </Link>

      <TokoMenuView
        toko={{
          id: toko.id,
          namaToko: toko.nama_toko,
          noStand: toko.no_stand,
          rating: Number(toko.rating_rata_rata ?? 0),
          buka: toko.buka,
          fotoUrl: toko.foto_url ?? null,
        }}
        initialMenu={menu}
      />
    </>
  );
}
