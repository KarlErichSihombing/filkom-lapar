"use server";

import { revalidatePath } from "next/cache";
import { getSellerContext } from "@/lib/seller";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  BuyerSaldoTokoItem,
  JenisMutasiSaldo,
  MutasiSaldoItem,
  SellerBalanceInfo,
  StatusPesanan,
} from "@/types/order";

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
const CANCEL_WINDOW_SECONDS = 10;

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
  alasanPembatalan: string | null;
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
  alasan_pembatalan: string | null;
  created_at: string;
  updated_at: string;
  detail_pesanan: RawDetail[];
};

/**
 * Ambil seluruh pesanan yang sudah dibayar/diproses/siap/selesai/dibatalkan untuk stand milik penjual.
 */
export async function fetchSellerOrders(): Promise<SellerOrderCard[]> {
  const ctx = await getSellerContext();
  if (!ctx.toko) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pesanan")
    .select(
      "id, kode, pembeli_id, total_harga, status_pesanan, alasan_pembatalan, created_at, updated_at, detail_pesanan(menu_id, nama_menu, jumlah, harga_satuan, subtotal, catatan)",
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
      alasanPembatalan: r.alasan_pembatalan ?? null,
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
 * Ambil saldo toko saat ini beserta daftar riwayat mutasi saldo (pembayaran masuk & potongan pembatalan).
 * Tetap menghitung saldo & mutasi secara akurat dari tabel pesanan meskipun SQL 006 belum dijalankan
 * atau untuk pesanan yang dibuat sebelum SQL 006 dijalankan.
 */
export async function fetchSellerBalanceInfo(): Promise<SellerBalanceInfo> {
  const ctx = await getSellerContext();
  if (!ctx.toko) {
    return { saldoToko: 0, totalMasuk: 0, totalPotongan: 0, mutasi: [] };
  }

  const admin = createAdminClient();
  const [mutasiRes, pesananRes] = await Promise.all([
    admin
      .from("mutasi_saldo")
      .select("id, pesanan_id, jenis, nominal, saldo_sebelum, saldo_sesudah, keterangan, created_at")
      .eq("toko_id", ctx.toko.id)
      .order("created_at", { ascending: true }),
    admin
      .from("pesanan")
      .select("id, kode, total_harga, status_pesanan, alasan_pembatalan, created_at, updated_at")
      .eq("toko_id", ctx.toko.id)
      .not("status_pesanan", "in", '("menunggu_pembayaran","kedaluwarsa")')
      .order("created_at", { ascending: true }),
  ]);

  // Kumpulkan event mutasi dari tabel pesanan agar pesanan yang belum punya baris di mutasi_saldo
  // tetap dihitung dengan akurat.
  type RawEvent = {
    id: string;
    jenis: JenisMutasiSaldo;
    nominal: number;
    keterangan: string;
    createdAt: string;
  };

  const events: RawEvent[] = [];
  const recordedMasukIds = new Set<string>();
  const recordedBatalIds = new Set<string>();

  if (!mutasiRes.error && mutasiRes.data) {
    for (const m of mutasiRes.data) {
      const jenis = m.jenis as JenisMutasiSaldo;
      const pid = (m as { pesanan_id?: string | null }).pesanan_id ?? null;
      if (pid) {
        if (jenis === "pembayaran_masuk") recordedMasukIds.add(pid);
        else recordedBatalIds.add(pid);
      }
      events.push({
        id: String(m.id),
        jenis,
        nominal: Number(m.nominal),
        keterangan: String(m.keterangan),
        createdAt: String(m.created_at),
      });
    }
  }

  for (const p of pesananRes.data ?? []) {
    const pid = String(p.id);
    const kode = String(p.kode);
    const nominal = Number(p.total_harga);
    const status = p.status_pesanan as StatusPesanan;

    if (!recordedMasukIds.has(pid)) {
      events.push({
        id: `masuk-${pid}`,
        jenis: "pembayaran_masuk",
        nominal,
        keterangan: `Pembayaran pesanan #${kode}`,
        createdAt: String(p.created_at),
      });
    }

    if (status === "dibatalkan" && !recordedBatalIds.has(pid)) {
      const alasan = p.alasan_pembatalan ? ` (${p.alasan_pembatalan})` : "";
      events.push({
        id: `batal-${pid}`,
        jenis: "pembatalan_pembeli",
        nominal: -nominal,
        keterangan: `Refund pembatalan pesanan #${kode}${alasan}`,
        createdAt: String(p.updated_at || p.created_at),
      });
    }
  }

  // Urutkan kronologis dari paling awal untuk menghitung saldo_sebelum -> saldo_sesudah secara presisi
  events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let runningSaldo = 0;
  let totalMasuk = 0;
  let totalPotongan = 0;

  const computed: MutasiSaldoItem[] = events.map((ev) => {
    const saldoSebelum = runningSaldo;
    if (ev.nominal >= 0) {
      totalMasuk += ev.nominal;
      runningSaldo += ev.nominal;
    } else {
      totalPotongan += Math.abs(ev.nominal);
      runningSaldo = Math.max(0, runningSaldo + ev.nominal);
    }
    return {
      id: ev.id,
      jenis: ev.jenis,
      nominal: ev.nominal,
      saldoSebelum,
      saldoSesudah: runningSaldo,
      keterangan: ev.keterangan,
      createdAt: ev.createdAt,
    };
  });

  // Tampilkan mutasi terbaru di paling atas
  computed.reverse();

  return {
    saldoToko: runningSaldo,
    totalMasuk,
    totalPotongan,
    mutasi: computed,
  };
}

/**
 * Ambil daftar saldo refund / kredit milik pembeli di masing-masing stand.
 * Otomatis menghitung dari pesanan berstatus 'dibatalkan' bila tabel saldo_pembeli belum terisi.
 */
export async function fetchBuyerSaldoToko(): Promise<BuyerSaldoTokoItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: cancelledOrders } = await supabase
    .from("pesanan")
    .select("toko_id, total_harga, toko(nama_toko, no_stand)")
    .eq("pembeli_id", user.id)
    .eq("status_pesanan", "dibatalkan");

  if (cancelledOrders && cancelledOrders.length > 0) {
    type OrderRow = {
      toko_id: string;
      total_harga: number | string;
      toko:
        | { nama_toko: string; no_stand: number }
        | { nama_toko: string; no_stand: number }[]
        | null;
    };
    const byToko = new Map<string, BuyerSaldoTokoItem>();
    for (const r of cancelledOrders as unknown as OrderRow[]) {
      const t = Array.isArray(r.toko) ? r.toko[0] : r.toko;
      const prev = byToko.get(r.toko_id);
      const add = Number(r.total_harga);
      if (prev) {
        prev.saldo += add;
      } else {
        byToko.set(r.toko_id, {
          tokoId: r.toko_id,
          namaToko: t?.nama_toko ?? "Stand Kantin",
          noStand: t?.no_stand ?? null,
          saldo: add,
        });
      }
    }
    return [...byToko.values()];
  }

  return [];
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

  const rpcRes = await supabase.rpc("proses_status_pesanan", {
    p_pesanan_id: pesananId,
    p_status_baru: statusBaru,
  });

  if (rpcRes.error) {
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

/**
 * Pembatalan pesanan oleh Pembeli (dilindungi Timer 10 Detik di Server).
 * Berhasil bila waktu server <= 10 detik sejak waktu_bayar; ditolak bila > 10 detik.
 */
export async function batalkanPesananPembeli(
  pesananId: string,
  alasan = "Ingin mengubah pesanan",
): Promise<OrderActionResult> {
  if (!UUID_RE.test(pesananId)) {
    return { error: "ID pesanan tidak valid." };
  }

  const reasonText = alasan.trim().slice(0, 200) || "Ingin mengubah pesanan";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi berakhir. Silakan login kembali." };

  // 1) Jalankan RPC batalkan_pesanan_pembeli di Postgres (validasi jam server Postgres)
  const rpcRes = await supabase.rpc("batalkan_pesanan_pembeli", {
    p_pesanan_id: pesananId,
    p_alasan: reasonText,
  });

  if (!rpcRes.error) {
    revalidatePath("/pesanan");
    revalidatePath("/dashboard/pesanan");
    return { ok: true, statusPesanan: "dibatalkan" };
  }

  // Bila error berasal dari aturan bisnis (timer 10 detik habis, sudah diproses, dll.),
  // langsung kembalikan pesan error dari server Postgres tersebut.
  const errMsg = rpcRes.error.message ?? "";
  if (
    /10 detik|diproses|dibatalkan|berhak|tidak ditemukan|belum memiliki/i.test(errMsg)
  ) {
    return { error: errMsg };
  }

  // 2) Fallback di server Next.js bila SQL 006 belum dijalankan di Supabase
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("pesanan")
    .select(
      "id, kode, pembeli_id, toko_id, pembayaran_id, total_harga, status_pesanan, pembayaran(waktu_bayar, nominal_refund)",
    )
    .eq("id", pesananId)
    .maybeSingle();

  if (!row || row.pembeli_id !== user.id) {
    return { error: "Pesanan tidak ditemukan." };
  }

  if (row.status_pesanan === "dibatalkan") {
    return { error: "Pesanan ini sudah dibatalkan." };
  }

  if (row.status_pesanan !== "dibayar") {
    return { error: "Pesanan sudah diproses oleh penjual dan tidak dapat dibatalkan." };
  }

  const bayarRel = Array.isArray(row.pembayaran) ? row.pembayaran[0] : row.pembayaran;
  const waktuBayar = (bayarRel as { waktu_bayar?: string | null } | null)?.waktu_bayar;
  if (!waktuBayar) {
    return { error: "Pesanan belum memiliki waktu konfirmasi pembayaran." };
  }

  const elapsedSec = (Date.now() - new Date(waktuBayar).getTime()) / 1000;
  if (elapsedSec > CANCEL_WINDOW_SECONDS) {
    return {
      error: `Batas waktu pembatalan 10 detik telah habis (lewat ${elapsedSec.toFixed(
        1,
      )} detik). Pesanan tidak dapat dibatalkan.`,
    };
  }

  const nominal = Number(row.total_harga);
  const nowIso = new Date().toISOString();

  const { error: updErr } = await admin
    .from("pesanan")
    .update({
      status_pesanan: "dibatalkan",
      alasan_pembatalan: reasonText,
      updated_at: nowIso,
    })
    .eq("id", row.id);

  if (updErr) {
    return { error: "Gagal membatalkan pesanan." };
  }

  const prevRefund = Number(
    (bayarRel as { nominal_refund?: number | string } | null)?.nominal_refund ?? 0,
  );
  await admin
    .from("pembayaran")
    .update({ nominal_refund: prevRefund + nominal })
    .eq("id", row.pembayaran_id);

  revalidatePath("/pesanan");
  revalidatePath(`/pembayaran/${row.pembayaran_id}`);
  revalidatePath("/dashboard/pesanan");

  return { ok: true, statusPesanan: "dibatalkan" };
}

/**
 * Batalkan seluruh pesanan yang masih berstatus 'dibayar' dalam satu pembayaranId
 * (dipakai pada tombol Batalkan Pesanan di halaman /pembayaran/[pembayaranId]).
 */
export async function batalkanPembayaranPembeli(
  pembayaranId: string,
  alasan = "Ingin mengubah pesanan",
): Promise<OrderActionResult> {
  if (!UUID_RE.test(pembayaranId)) {
    return { error: "ID pembayaran tidak valid." };
  }

  const supabase = await createClient();
  const { data: orders, error } = await supabase
    .from("pesanan")
    .select("id, status_pesanan")
    .eq("pembayaran_id", pembayaranId);

  if (error || !orders || orders.length === 0) {
    return { error: "Pesanan tidak ditemukan." };
  }

  const cancellable = orders.filter((o) => o.status_pesanan === "dibayar");
  if (cancellable.length === 0) {
    // Jika semua sudah dibatalkan atau sudah diproses, panggil untuk order pertama agar pesan error jelas
    return batalkanPesananPembeli(orders[0]!.id, alasan);
  }

  for (const o of cancellable) {
    const res = await batalkanPesananPembeli(o.id, alasan);
    if (res.error) return res;
  }

  revalidatePath(`/pembayaran/${pembayaranId}`);
  revalidatePath("/pesanan");
  return { ok: true, statusPesanan: "dibatalkan" };
}

/**
 * Pembatalan pesanan oleh Penjual (tanpa batas 10 detik, selama status belum 'selesai').
 * Otomatis memotong saldo toko (credit adjustment) dan mencatat riwayat mutasi saldo.
 */
export async function batalkanPesananPenjual(
  pesananId: string,
  alasan = "Stok menu habis",
): Promise<OrderActionResult> {
  if (!UUID_RE.test(pesananId)) {
    return { error: "ID pesanan tidak valid." };
  }

  const ctx = await getSellerContext();
  if (!ctx.toko) {
    return { error: "Akun belum terhubung ke stand." };
  }

  const reasonText = alasan.trim().slice(0, 200) || "Stok menu habis";
  const supabase = await createClient();

  const rpcRes = await supabase.rpc("batalkan_pesanan_penjual", {
    p_pesanan_id: pesananId,
    p_alasan: reasonText,
  });

  if (!rpcRes.error) {
    revalidatePath("/dashboard/pesanan");
    revalidatePath("/pesanan");
    return { ok: true, statusPesanan: "dibatalkan" };
  }

  const errMsg = rpcRes.error.message ?? "";
  if (/tidak dapat dibatalkan|berhak|tidak ditemukan/i.test(errMsg)) {
    return { error: errMsg };
  }

  // Fallback via service_role bila SQL 006 belum dijalankan
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("pesanan")
    .select("id, toko_id, pembayaran_id, total_harga, status_pesanan")
    .eq("id", pesananId)
    .maybeSingle();

  if (!order || order.toko_id !== ctx.toko.id) {
    return { error: "Pesanan tidak ditemukan di stand Anda." };
  }

  if (
    ["selesai", "dibatalkan", "menunggu_pembayaran", "kedaluwarsa"].includes(
      order.status_pesanan,
    )
  ) {
    return { error: `Pesanan berstatus ${order.status_pesanan} tidak dapat dibatalkan.` };
  }

  const { error: updErr } = await admin
    .from("pesanan")
    .update({
      status_pesanan: "dibatalkan",
      alasan_pembatalan: reasonText,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pesananId);

  if (updErr) {
    return { error: "Gagal membatalkan pesanan." };
  }

  revalidatePath("/dashboard/pesanan");
  revalidatePath("/pesanan");
  return { ok: true, statusPesanan: "dibatalkan" };
}
