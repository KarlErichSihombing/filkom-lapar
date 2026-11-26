import { fetchSellerBalanceInfo, fetchSellerOrders } from "@/actions/order";
import { MenuManager, type SellerMenuItem } from "@/components/seller/MenuManager";
import { StandBanner } from "@/components/seller/StandBanner";
import { getSellerContext } from "@/lib/seller";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Kategori } from "@/types/menu";

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
  const admin = createAdminClient();

  const [menuRes, orders, balanceInfo, reviewsRes] = await Promise.all([
    supabase
      .from("menu")
      .select("id, nama_menu, deskripsi, harga, kategori, foto_url, tersedia")
      .eq("toko_id", toko.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    fetchSellerOrders(),
    fetchSellerBalanceInfo(),
    admin.from("ulasan").select("rating").eq("toko_id", toko.id),
  ]);

  if (menuRes.error) {
    return (
      <p role="alert" className="rounded-3xl bg-white p-6 text-sm text-error">
        Gagal memuat menu: {menuRes.error.message}. Pastikan SQL 002_menu sudah
        dijalankan di Supabase.
      </p>
    );
  }

  // Hitung porsi terjual per menu dari pesanan stand yang valid (bukan dibatalkan)
  const soldByMenu = new Map<string, number>();
  for (const o of orders) {
    if (o.statusPesanan === "dibatalkan") continue;
    for (const item of o.items) {
      soldByMenu.set(item.menuId, (soldByMenu.get(item.menuId) ?? 0) + item.jumlah);
    }
  }

  const activeOrders = orders.filter((o) =>
    ["dibayar", "diproses", "siap_diambil"].includes(o.statusPesanan),
  ).length;

  const reviewRows = (reviewsRes.data ?? []) as { rating: number }[];
  const reviewCount = reviewRows.length;
  const computedRating =
    reviewCount > 0
      ? Number(
          (reviewRows.reduce((acc, r) => acc + Number(r.rating ?? 0), 0) / reviewCount).toFixed(1),
        )
      : toko.ratingRataRata;

  const items: SellerMenuItem[] = ((menuRes.data ?? []) as MenuRow[]).map((r) => ({
    id: r.id,
    namaMenu: r.nama_menu,
    deskripsi: r.deskripsi,
    harga: Number(r.harga),
    kategori: r.kategori,
    fotoUrl: r.foto_url,
    tersedia: r.tersedia,
    terjual: soldByMenu.get(r.id) ?? 0,
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
      <MenuManager
        tokoId={toko.id}
        items={items}
        rating={computedRating}
        reviewCount={reviewCount}
        saldoAktif={balanceInfo.saldoToko}
        activeOrders={activeOrders}
      />
    </>
  );
}
