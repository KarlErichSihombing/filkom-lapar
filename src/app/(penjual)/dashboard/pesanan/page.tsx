import { fetchSellerOrders } from "@/actions/order";
import { SellerOrderManager } from "@/components/seller/SellerOrderManager";
import { StandBanner } from "@/components/seller/StandBanner";
import { getSellerContext } from "@/lib/seller";

export default async function SellerPesananPage() {
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
  const orders = await fetchSellerOrders();

  return (
    <>
      <StandBanner
        tokoId={toko.id}
        namaToko={toko.namaToko}
        noStand={toko.noStand}
        fotoUrl={toko.fotoUrl}
        buka={toko.buka}
      />
      <SellerOrderManager
        tokoId={toko.id}
        namaToko={toko.namaToko}
        noStand={toko.noStand}
        initialOrders={orders}
      />
    </>
  );
}
