import { fetchBuyerSaldoToko } from "@/actions/order";
import { BuyerOrdersView } from "@/components/buyer/BuyerOrdersView";
import { getBuyerContext } from "@/lib/buyer";
import { createClient } from "@/lib/supabase/server";
import type { PesananSummary, StatusPesanan, UlasanSummary } from "@/types/order";

type TokoRel = { id: string; nama_toko: string; no_stand: number };
type PembayaranRel = { waktu_bayar: string | null };
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
  pembayaran_id: string;
  total_harga: number | string;
  status_pesanan: StatusPesanan;
  alasan_pembatalan: string | null;
  created_at: string;
  toko: TokoRel | TokoRel[] | null;
  pembayaran: PembayaranRel | PembayaranRel[] | null;
  detail_pesanan: DetailRow[];
};

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export default async function PesananPage() {
  const [ctx, supabase, saldoTokoList] = await Promise.all([
    getBuyerContext(),
    createClient(),
    fetchBuyerSaldoToko(),
  ]);

  const [orderRes, ulasanRes] = await Promise.all([
    supabase
      .from("pesanan")
      .select(
        "id, kode, toko_id, pembayaran_id, total_harga, status_pesanan, alasan_pembatalan, created_at, toko(id, nama_toko, no_stand), pembayaran(waktu_bayar), detail_pesanan(menu_id, nama_menu, jumlah, harga_satuan, subtotal, catatan)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("ulasan")
      .select("id, pesanan_id, rating, komentar, created_at")
      .eq("pembeli_id", ctx.userId),
  ]);

  if (orderRes.error) {
    return (
      <p role="alert" className="rounded-3xl bg-white p-6 text-sm text-error">
        Gagal memuat daftar pesanan: {orderRes.error.message}. Pastikan SQL Tahap 3 sudah dijalankan
        di Supabase.
      </p>
    );
  }

  const ulasanByPesanan = new Map<string, UlasanSummary>();
  if (!ulasanRes.error && ulasanRes.data) {
    for (const u of ulasanRes.data) {
      ulasanByPesanan.set(String(u.pesanan_id), {
        id: String(u.id),
        pesananId: String(u.pesanan_id),
        rating: Number(u.rating),
        komentar: u.komentar ? String(u.komentar) : null,
        createdAt: String(u.created_at),
      });
    }
  }

  const rows = (orderRes.data ?? []) as unknown as PesananRow[];
  const initialOrders: PesananSummary[] = rows.map((p) => {
    const toko = one(p.toko);
    const bayar = one(p.pembayaran);
    return {
      id: p.id,
      kode: p.kode,
      tokoId: p.toko_id,
      namaToko: toko?.nama_toko ?? "Stand Kantin",
      noStand: toko?.no_stand ?? null,
      pembayaranId: p.pembayaran_id,
      totalHarga: Number(p.total_harga),
      statusPesanan: p.status_pesanan,
      alasanPembatalan: p.alasan_pembatalan,
      waktuBayar: bayar?.waktu_bayar ?? null,
      createdAt: p.created_at,
      items: p.detail_pesanan.map((d) => ({
        menuId: d.menu_id,
        namaMenu: d.nama_menu,
        jumlah: d.jumlah,
        hargaSatuan: Number(d.harga_satuan),
        subtotal: Number(d.subtotal),
        catatan: d.catatan,
      })),
      ulasan: ulasanByPesanan.get(p.id) ?? null,
    };
  });

  return (
    <BuyerOrdersView
      userId={ctx.userId}
      initialOrders={initialOrders}
      initialSaldoToko={saldoTokoList}
    />
  );
}
