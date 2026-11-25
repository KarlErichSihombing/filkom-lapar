"use server";

import { revalidatePath } from "next/cache";
import { getSellerContext } from "@/lib/seller";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { StatusPesanan } from "@/types/order";

export type OrderActionResult = {
  ok?: boolean;
  error?: string;
  statusPesanan?: StatusPesanan;
};

const VALID_NEXT: Partial<Record<StatusPesanan, StatusPesanan>> = {
  dibayar: "diproses",
  diproses: "siap_diambil",
  siap_diambil: "selesai",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SellerOrderItem = {
  menuId: string;
  namaMenu: string;
  jumlah: number;
  hargaSatuan: number;
  subtotal: number;
  catatan: string | null;
};

export type SellerOrderCard = {
  id: string;
  kode: string;
  pembeliId: string;
  namaPembeli: string;
  noTelpPembeli: string | null;
  totalHarga: number;
  statusPesanan: StatusPesanan;
  createdAt: string;
  updatedAt: string;
  items: SellerOrderItem[];
};

type RawDetail = {
  menu_id: string;
  nama_menu: string;
  jumlah: number;
  harga_satuan: number | string;
  subtotal: number | string;
  catatan: string | null;
};

type RawPesanan = {
  id: string;
  kode: string;
  pembeli_id: string;
  total_harga: number | string;
  status_pesanan: StatusPesanan;
  created_at: string;
  updated_at: string;
  detail_pesanan: RawDetail[];
};

/**
 * Ambil seluruh pesanan yang sudah dibayar/diproses/siap/selesai untuk stand milik penjual.
 * Memakai admin client setelah memverifikasi kepemilikan stand lewat getSellerContext()
 * agar nama & nomor telepon pembeli selalu terbaca meskipun policy profil belum dijalankan.
 */
export async function fetchSellerOrders(): Promise<SellerOrderCard[]> {
  const ctx = await getSellerContext();
  if (!ctx.toko) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pesanan")
    .select(
      "id, kode, pembeli_id, total_harga, status_pesanan, created_at, updated_at, detail_pesanan(menu_id, nama_menu, jumlah, harga_satuan, subtotal, catatan)",
    )
    .eq("toko_id", ctx.toko.id)
    .not("status_pesanan", "in", '("menunggu_pembayaran","kedaluwarsa")')
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const rows = data as unknown as RawPesanan[];
  const buyerIds = Array.from(new Set(rows.map((r) => r.pembeli_id)));

  const profileMap = new Map<string, { nama: string; no_telp: string | null }>();
  if (buyerIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, nama, no_telp")
      .in("id", buyerIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { nama: p.nama ?? "Pembeli", no_telp: p.no_telp ?? null });
    }
  }

  return rows.map((r) => {
    const buyer = profileMap.get(r.pembeli_id);
    return {
      id: r.id,
      kode: r.kode,
      pembeliId: r.pembeli_id,
      namaPembeli: buyer?.nama || "Pembeli",
      noTelpPembeli: buyer?.no_telp ?? null,
      totalHarga: Number(r.total_harga),
      statusPesanan: r.status_pesanan,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      items: (r.detail_pesanan ?? []).map((d) => ({
        menuId: d.menu_id,
        namaMenu: d.nama_menu,
        jumlah: d.jumlah,
        hargaSatuan: Number(d.harga_satuan),
        subtotal: Number(d.subtotal),
        catatan: d.catatan,
      })),
    };
  });
}

/**
 * Majukan status pesanan oleh penjual:
 * - 'dibayar' -> 'diproses' (Terima Pesanan)
 * - 'diproses' -> 'siap_diambil' (Tandai Siap Diambil)
 * - 'siap_diambil' -> 'selesai' (Selesaikan Pesanan)
 */
export async function ubahStatusPesanan(
  pesananId: string,
  statusBaru: StatusPesanan,
): Promise<OrderActionResult> {
  if (!UUID_RE.test(pesananId)) {
    return { error: "ID pesanan tidak valid." };
  }

  const ctx = await getSellerContext();
  if (!ctx.toko) {
    return { error: "Akun belum terhubung ke stand." };
  }

  const supabase = await createClient();

  // Coba jalankan RPC proses_status_pesanan (dari 005_proses_pesanan_realtime.sql)
  const rpcRes = await supabase.rpc("proses_status_pesanan", {
    p_pesanan_id: pesananId,
    p_status_baru: statusBaru,
  });

  if (rpcRes.error) {
    // Fallback via service_role bila SQL 005 belum dijalankan di Supabase
    const admin = createAdminClient();
    const { data: order } = await admin
      .from("pesanan")
      .select("id, toko_id, status_pesanan")
      .eq("id", pesananId)
      .maybeSingle();

    if (!order || order.toko_id !== ctx.toko.id) {
      return { error: "Pesanan tidak ditemukan di stand Anda." };
    }

    const currentStatus = order.status_pesanan as StatusPesanan;
    if (currentStatus === statusBaru) {
      return { ok: true, statusPesanan: statusBaru };
    }

    const expectedNext = VALID_NEXT[currentStatus];
    if (expectedNext !== statusBaru) {
      return {
        error: `Status pesanan saat ini (${currentStatus}) tidak dapat diubah ke ${statusBaru}.`,
      };
    }

    const { error: updateErr } = await admin
      .from("pesanan")
      .update({
        status_pesanan: statusBaru,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pesananId)
      .eq("toko_id", ctx.toko.id);

    if (updateErr) {
      return { error: "Gagal memperbarui status pesanan. Coba lagi." };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/pesanan");
  revalidatePath("/pesanan");

  return { ok: true, statusPesanan: statusBaru };
}
