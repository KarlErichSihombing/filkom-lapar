"use server";

import { revalidatePath } from "next/cache";
import { getSellerContext } from "@/lib/seller";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  PublicReviewItem,
  SalesOrderRecord,
  StatusPesanan,
  UlasanSummary,
} from "@/types/order";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Daftar kata terlarang sesuai Acceptance Criteria Modul 1 (SR-25 / SR-31)
const FORBIDDEN_WORDS = ["anjing", "bangsat", "goblog", "goblok", "tolol", "tai", "babi"];

export type ReviewActionResult = {
  ok?: boolean;
  error?: string;
  ulasan?: UlasanSummary;
};

function maskName(fullName: string | null | undefined) {
  const clean = (fullName ?? "").trim();
  if (!clean) return "Pembeli FILKOM";
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[1]![0]?.toUpperCase() ?? ""}.`;
}

/**
 * Kirim rating (1-5 bintang) & ulasan (maks 500 karakter) untuk pesanan berstatus 'selesai'.
 * Satu pesanan hanya dapat diulas satu kali. Otomatis memperbarui rating_rata_rata stand.
 */
export async function kirimUlasan(
  pesananId: string,
  rating: number,
  komentar: string,
): Promise<ReviewActionResult> {
  if (!UUID_RE.test(pesananId)) {
    return { error: "ID pesanan tidak valid." };
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Pilih rating bintang antara 1 sampai 5 terlebih dahulu." };
  }

  const trimmed = komentar.trim();
  if (trimmed.length > 500) {
    return { error: "Ulasan maksimal 500 karakter." };
  }

  const lower = trimmed.toLowerCase();
  if (FORBIDDEN_WORDS.some((w) => new RegExp(`\\b${w}\\b`, "i").test(lower))) {
    return {
      error:
        "Ulasan memuat kata yang tidak pantas. Mohon gunakan bahasa yang sopan dan konstruktif.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi berakhir. Silakan login kembali." };

  // 1) Panggil fungsi RPC tambah_ulasan di Postgres
  const rpcRes = await supabase.rpc("tambah_ulasan", {
    p_pesanan_id: pesananId,
    p_rating: rating,
    p_komentar: trimmed,
  });

  if (rpcRes.error) {
    const msg = rpcRes.error.message ?? "";
    if (/sudah pernah diulas|Selesai|berhak|tidak ditemukan|bintang/i.test(msg)) {
      return { error: msg };
    }
    return {
      error:
        "Gagal menyimpan ulasan. Pastikan SQL 007_ulasan_dan_laporan.sql sudah dijalankan di Supabase.",
    };
  }

  const admin = createAdminClient();
  const { data: saved } = await admin
    .from("ulasan")
    .select("id, pesanan_id, toko_id, rating, komentar, created_at")
    .eq("pesanan_id", pesananId)
    .maybeSingle();

  revalidatePath("/pesanan");
  if (saved?.toko_id) {
    revalidatePath(`/toko/${saved.toko_id}`);
  }
  revalidatePath("/beranda");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/laporan");

  return {
    ok: true,
    ulasan: {
      id: String(saved?.id ?? pesananId),
      pesananId,
      rating,
      komentar: trimmed || null,
      createdAt: String(saved?.created_at ?? new Date().toISOString()),
    },
  };
}

/**
 * Ambil seluruh ulasan publik untuk suatu stand (ditampilkan pada halaman /toko/[tokoId]).
 */
export async function fetchTokoReviews(tokoId: string): Promise<PublicReviewItem[]> {
  if (!UUID_RE.test(tokoId)) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ulasan")
    .select(
      "id, pesanan_id, pembeli_id, rating, komentar, created_at, pesanan(kode, detail_pesanan(nama_menu))",
    )
    .eq("toko_id", tokoId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  type RawRow = {
    id: string;
    pesanan_id: string;
    pembeli_id: string;
    rating: number;
    komentar: string | null;
    created_at: string;
    pesanan:
      | { kode: string; detail_pesanan: { nama_menu: string }[] }
      | { kode: string; detail_pesanan: { nama_menu: string }[] }[]
      | null;
  };

  const rows = data as unknown as RawRow[];
  const buyerIds = Array.from(new Set(rows.map((r) => r.pembeli_id)));
  const nameMap = new Map<string, string>();

  if (buyerIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, nama")
      .in("id", buyerIds);
    for (const p of profiles ?? []) {
      nameMap.set(p.id, maskName(p.nama));
    }
  }

  return rows.map((r) => {
    const p = Array.isArray(r.pesanan) ? r.pesanan[0] : r.pesanan;
    const menuNames = Array.from(
      new Set((p?.detail_pesanan ?? []).map((d) => d.nama_menu)),
    );
    return {
      id: r.id,
      pesananId: r.pesanan_id,
      kodePesanan: p?.kode ?? "FK",
      namaPembeli: nameMap.get(r.pembeli_id) ?? "Pembeli FILKOM",
      rating: Number(r.rating),
      komentar: r.komentar,
      createdAt: r.created_at,
      menuNames,
    };
  });
}

/**
 * Ambil data lengkap laporan penjualan & ulasan untuk penjual yang sedang login.
 */
export async function fetchSellerReportData(): Promise<{
  ratingRataRata: number;
  orders: SalesOrderRecord[];
  reviews: PublicReviewItem[];
}> {
  const ctx = await getSellerContext();
  if (!ctx.toko) {
    return { ratingRataRata: 0, orders: [], reviews: [] };
  }

  const admin = createAdminClient();
  const [ordersRes, reviews] = await Promise.all([
    admin
      .from("pesanan")
      .select(
        "id, kode, pembeli_id, total_harga, status_pesanan, created_at, detail_pesanan(menu_id, nama_menu, jumlah, harga_satuan, subtotal, catatan)",
      )
      .eq("toko_id", ctx.toko.id)
      .not("status_pesanan", "in", '("menunggu_pembayaran","kedaluwarsa")')
      .order("created_at", { ascending: false }),
    fetchTokoReviews(ctx.toko.id),
  ]);

  type RawDetail = {
    menu_id: string;
    nama_menu: string;
    jumlah: number;
    harga_satuan: number | string;
    subtotal: number | string;
    catatan: string | null;
  };
  type RawOrder = {
    id: string;
    kode: string;
    pembeli_id: string;
    total_harga: number | string;
    status_pesanan: StatusPesanan;
    created_at: string;
    detail_pesanan: RawDetail[];
  };

  const rawOrders = (ordersRes.data ?? []) as unknown as RawOrder[];
  const buyerIds = Array.from(new Set(rawOrders.map((o) => o.pembeli_id)));
  const buyerMap = new Map<string, string>();

  if (buyerIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, nama")
      .in("id", buyerIds);
    for (const p of profiles ?? []) {
      buyerMap.set(p.id, p.nama ?? "Pembeli");
    }
  }

  const orders: SalesOrderRecord[] = rawOrders.map((r) => ({
    id: r.id,
    kode: r.kode,
    namaPembeli: buyerMap.get(r.pembeli_id) ?? "Pembeli",
    totalHarga: Number(r.total_harga),
    statusPesanan: r.status_pesanan,
    createdAt: r.created_at,
    items: (r.detail_pesanan ?? []).map((d) => ({
      menuId: d.menu_id,
      namaMenu: d.nama_menu,
      jumlah: d.jumlah,
      hargaSatuan: Number(d.harga_satuan),
      subtotal: Number(d.subtotal),
      catatan: d.catatan,
    })),
  }));

  const avgRating =
    reviews.length > 0
      ? Number(
          (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(2),
        )
      : ctx.toko.ratingRataRata;

  return {
    ratingRataRata: avgRating,
    orders,
    reviews,
  };
}
