import { TokoList } from "@/components/buyer/TokoList";
import { getBuyerContext } from "@/lib/buyer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Kategori } from "@/types/menu";
import type { BestSellerItem, StandCard, StandReviewItem } from "@/types/toko";

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
    deskripsi: string | null;
    harga: number | string;
    kategori: Kategori;
    foto_url: string | null;
    tersedia: boolean;
    deleted_at: string | null;
  }[];
};

type RawUlasanRow = {
  id: string;
  toko_id: string;
  pembeli_id: string;
  rating: number;
  komentar: string | null;
  created_at: string;
};

function maskName(fullName: string | null | undefined) {
  const clean = (fullName ?? "").trim();
  if (!clean) return "Pembeli FILKOM";
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[1]![0]?.toUpperCase() ?? ""}.`;
}

export default async function BerandaPage() {
  const [, supabase] = await Promise.all([getBuyerContext(), createClient()]);
  const admin = createAdminClient();

  // Ambil daftar stand + menu, data penjualan real (detail_pesanan), dan daftar ulasan real
  const [tokoRes, salesRes, reviewsRes] = await Promise.all([
    supabase
      .from("toko")
      .select(
        "id, no_stand, nama_toko, buka, rating_rata_rata, foto_url, menu(id, nama_menu, deskripsi, harga, kategori, foto_url, tersedia, deleted_at)",
      )
      .order("no_stand", { ascending: true }),
    admin
      .from("detail_pesanan")
      .select("menu_id, jumlah, pesanan!inner(status_pesanan)")
      .not("pesanan.status_pesanan", "in", '("menunggu_pembayaran","dibatalkan","kedaluwarsa")'),
    admin
      .from("ulasan")
      .select("id, toko_id, pembeli_id, rating, komentar, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (tokoRes.error) {
    return (
      <p role="alert" className="rounded-3xl bg-white p-6 text-sm text-error">
        Gagal memuat daftar stand: {tokoRes.error.message}. Pastikan SQL 002_menu sudah
        dijalankan di Supabase.
      </p>
    );
  }

  // Hitung total porsi terjual per menu_id dari transaksi real di database
  const soldByMenu = new Map<string, number>();
  for (const row of (salesRes.data ?? []) as unknown as { menu_id: string; jumlah: number }[]) {
    const prev = soldByMenu.get(row.menu_id) ?? 0;
    soldByMenu.set(row.menu_id, prev + Number(row.jumlah ?? 0));
  }

  // Ambil nama pembeli untuk setiap ulasan
  const rawReviews = (reviewsRes.data ?? []) as unknown as RawUlasanRow[];
  const reviewerIds = Array.from(new Set(rawReviews.map((r) => r.pembeli_id)));
  const reviewerNameMap = new Map<string, string>();

  if (reviewerIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, nama")
      .in("id", reviewerIds);
    for (const p of profiles ?? []) {
      reviewerNameMap.set(p.id, maskName(p.nama));
    }
  }

  // Kelompokkan ulasan & hitung rata-rata rating real per toko_id
  const reviewsByToko = new Map<string, StandReviewItem[]>();
  const reviewStatsByToko = new Map<string, { count: number; sum: number }>();

  for (const r of rawReviews) {
    const stat = reviewStatsByToko.get(r.toko_id) ?? { count: 0, sum: 0 };
    stat.count += 1;
    stat.sum += Number(r.rating ?? 0);
    reviewStatsByToko.set(r.toko_id, stat);

    const list = reviewsByToko.get(r.toko_id) ?? [];
    list.push({
      id: r.id,
      namaPembeli: reviewerNameMap.get(r.pembeli_id) ?? "Pembeli FILKOM",
      rating: Number(r.rating ?? 5),
      komentar: r.komentar,
      createdAt: r.created_at,
    });
    reviewsByToko.set(r.toko_id, list);
  }

  const stands: StandCard[] = ((tokoRes.data ?? []) as unknown as StandRow[])
    .map((r) => {
      const rev = reviewStatsByToko.get(r.id);
      const computedRating =
        rev && rev.count > 0
          ? Number((rev.sum / rev.count).toFixed(1))
          : Number(r.rating_rata_rata ?? 0);

      const activeMenus = (r.menu ?? [])
        .filter((m) => !m.deleted_at)
        .map((m) => ({
          id: m.id,
          namaMenu: m.nama_menu,
          deskripsi: m.deskripsi,
          harga: Number(m.harga),
          kategori: m.kategori ?? "makanan",
          fotoUrl: m.foto_url,
          tersedia: m.tersedia,
          terjual: soldByMenu.get(m.id) ?? 0,
        }))
        .sort(
          (a, b) =>
            Number(b.tersedia) - Number(a.tersedia) ||
            b.terjual - a.terjual ||
            a.namaMenu.localeCompare(b.namaMenu, "id"),
        );

      return {
        id: r.id,
        noStand: r.no_stand,
        namaToko: r.nama_toko,
        buka: r.buka,
        rating: computedRating,
        reviewCount: rev?.count ?? 0,
        fotoUrl: r.foto_url,
        menu: activeMenus,
        reviews: reviewsByToko.get(r.id) ?? [],
      };
    })
    .sort((a, b) => Number(b.buka) - Number(a.buka) || a.noStand - b.noStand);

  // Cari menu Best Seller #1 berdasarkan porsi terjual terbanyak dari data real
  const allCandidates: BestSellerItem[] = [];
  for (const s of stands) {
    const menuTersediaStand = s.menu.filter((m) => m.tersedia).length;
    for (const m of s.menu) {
      allCandidates.push({
        menuId: m.id,
        namaMenu: m.namaMenu,
        deskripsi: m.deskripsi,
        harga: m.harga,
        kategori: m.kategori,
        fotoUrl: m.fotoUrl,
        tersedia: m.tersedia,
        terjual: m.terjual,
        tokoId: s.id,
        namaToko: s.namaToko,
        noStand: s.noStand,
        buka: s.buka,
        rating: s.rating,
        menuTersediaStand,
      });
    }
  }

  allCandidates.sort(
    (a, b) =>
      Number(b.buka && b.tersedia) - Number(a.buka && a.tersedia) ||
      b.terjual - a.terjual ||
      b.rating - a.rating ||
      Number(Boolean(b.fotoUrl)) - Number(Boolean(a.fotoUrl)),
  );

  const bestSeller = allCandidates[0] ?? null;

  return <TokoList stands={stands} initialBestSeller={bestSeller} />;
}
