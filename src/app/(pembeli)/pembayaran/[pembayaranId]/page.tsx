import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentView, type PesananCardView } from "@/components/buyer/PaymentView";
import { ArrowLeft } from "@/components/ui/icons";
import { ensurePembayaranQr } from "@/lib/payment";
import { createClient } from "@/lib/supabase/server";
import type { StatusPembayaran, StatusPesanan } from "@/types/order";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TokoRel = { id: string; nama_toko: string; no_stand: number };
type DetailRow = {
  menu_id: string;
  nama_menu: string;
  jumlah: number;
  harga_satuan: number | string;
  subtotal: number | string;
  catatan: string | null;
};
type PesananRow = {
  id: string;
  kode: string;
  toko_id: string;
  total_harga: number | string;
  status_pesanan: StatusPesanan;
  created_at: string;
  toko: TokoRel | TokoRel[] | null;
  detail_pesanan: DetailRow[];
};

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export default async function PembayaranPage({
  params,
}: {
  params: Promise<{ pembayaranId: string }>;
}) {
  const { pembayaranId } = await params;
  if (!UUID_RE.test(pembayaranId)) notFound();

  const supabase = await createClient();

  const [payRes, orderRes] = await Promise.all([
    supabase
      .from("pembayaran")
      .select(
        "id, total_bayar, metode_pembayaran, status_pembayaran, external_id, xendit_qr_id, token_payment, expires_at, waktu_bayar, created_at",
      )
      .eq("id", pembayaranId)
      .maybeSingle(),
    supabase
      .from("pesanan")
      .select(
        "id, kode, toko_id, total_harga, status_pesanan, created_at, toko(id, nama_toko, no_stand), detail_pesanan(menu_id, nama_menu, jumlah, harga_satuan, subtotal, catatan)",
      )
      .eq("pembayaran_id", pembayaranId)
      .order("kode", { ascending: true }),
  ]);

  if (!payRes.data) notFound();

  const pembayaran = payRes.data;
  const qrInfo = pembayaran.token_payment
    ? {
        qrString: pembayaran.token_payment,
        qrId: pembayaran.xendit_qr_id,
        externalId: pembayaran.external_id ?? pembayaran.id,
      }
    : await ensurePembayaranQr(pembayaran.id);

  const pesananRows = (orderRes.data ?? []) as unknown as PesananRow[];
  const initialPesanan: PesananCardView[] = pesananRows.map((p) => {
    const toko = one(p.toko);
    return {
      id: p.id,
      kode: p.kode,
      tokoId: p.toko_id,
      namaToko: toko?.nama_toko ?? "Stand Kantin",
      noStand: toko?.no_stand ?? null,
      totalHarga: Number(p.total_harga),
      statusPesanan: p.status_pesanan,
      createdAt: p.created_at,
      items: p.detail_pesanan.map((d) => ({
        menuId: d.menu_id,
        namaMenu: d.nama_menu,
        jumlah: d.jumlah,
        hargaSatuan: Number(d.harga_satuan),
        subtotal: Number(d.subtotal),
        catatan: d.catatan,
      })),
    };
  });

  return (
    <>
      <Link
        href="/pesanan"
        className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 font-label text-xs font-medium text-on-surface-muted transition-colors hover:bg-surface-variant"
      >
        <ArrowLeft className="size-4" /> Daftar pesanan
      </Link>

      <PaymentView
        pembayaran={{
          id: pembayaran.id,
          totalBayar: Number(pembayaran.total_bayar),
          metodePembayaran: pembayaran.metode_pembayaran,
          statusPembayaran: (pembayaran.status_pembayaran as StatusPembayaran) ?? "menunggu",
          externalId: qrInfo.externalId ?? pembayaran.id,
          xenditQrId: qrInfo.qrId ?? pembayaran.xendit_qr_id,
          qrString: qrInfo.qrString ?? pembayaran.id,
          expiresAt: pembayaran.expires_at,
          waktuBayar: pembayaran.waktu_bayar,
        }}
        initialPesanan={initialPesanan}
      />
    </>
  );
}
