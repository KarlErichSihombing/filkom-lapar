"use server";

import { fetchCartLines } from "@/lib/cart";
import { createClient } from "@/lib/supabase/server";
import type { CartLine } from "@/types/cart";

export type CartResult = { ok?: boolean; error?: string };

/** Pesan dari fungsi database sudah berbahasa Indonesia; selain itu pakai pesan umum. */
function friendly(message: string | undefined, fallback: string) {
  return message && /tidak tersedia|tutup|habis|kosong/i.test(message) ? message : fallback;
}

/** Tambah / kurangi jumlah satu menu (satu panggilan ke database). */
export async function ubahJumlah(menuId: string, delta: number): Promise<CartResult> {
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 99) {
    return { error: "Jumlah tidak valid." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("ubah_keranjang", {
    p_menu_id: menuId,
    p_delta: delta,
  });
  if (error) return { error: friendly(error.message, "Gagal memperbarui keranjang. Coba lagi.") };
  return { ok: true };
}

export async function simpanCatatan(menuId: string, catatan: string): Promise<CartResult> {
  const text = catatan.trim().slice(0, 200);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("keranjang_item")
    .update({ catatan: text || null })
    .eq("menu_id", menuId)
    .select("menu_id");
  if (error || !data || data.length === 0) return { error: "Gagal menyimpan catatan." };
  return { ok: true };
}

export async function hapusItem(menuId: string): Promise<CartResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("keranjang_item").delete().eq("menu_id", menuId);
  if (error) return { error: "Gagal menghapus item. Coba lagi." };
  return { ok: true };
}

/** Data keranjang terbaru (dipakai halaman keranjang dan checkout). */
export async function muatKeranjang(): Promise<CartLine[]> {
  return fetchCartLines();
}

/** Checkout: satu transaksi di database yang membuat pembayaran + pesanan per stand. */
export async function bayarSekarang(): Promise<CartResult & { pembayaranId?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("checkout", { p_metode: "QRIS" });
  if (error || !data) {
    return { error: friendly(error?.message, "Checkout gagal. Coba lagi beberapa saat.") };
  }
  return { ok: true, pembayaranId: String(data) };
}