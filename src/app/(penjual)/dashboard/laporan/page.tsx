import { fetchSellerReportData } from "@/actions/review";
import { SellerReportView } from "@/components/seller/SellerReportView";
import { StandBanner } from "@/components/seller/StandBanner";
import { getSellerContext } from "@/lib/seller";

export default async function SellerLaporanPage() {
  const ctx = await getSellerContext();

  if (!ctx.toko) {
    return (
      <p className="rounded-3xl bg-white p-6 text-sm text-on-surface-muted">
        Akun ini belum terhubung ke stand mana pun. Hubungi admin kantin untuk mendaftarkan stand
        Anda.
      </p>
    );
  }

  const toko = ctx.toko;
  const report = await fetchSellerReportData();

  return (
    <>
      <StandBanner
        tokoId={toko.id}
        namaToko={toko.namaToko}
        noStand={toko.noStand}
        fotoUrl={toko.fotoUrl}
        buka={toko.buka}
      />
      <SellerReportView
        namaToko={toko.namaToko}
        noStand={toko.noStand}
        initialRating={report.ratingRataRata}
        initialOrders={report.orders}
        initialReviews={report.reviews}
      />
    </>
  );
}
