"use server";

import { revalidatePath } from "next/cache";
import { getSellerContext } from "@/lib/seller";
import { createClient } from "@/lib/supabase/server";

export type MenuState = { error?: string; ok?: boolean };

const KATEGORI = ["makanan", "minuman", "camilan"];
const NO_STAND: MenuState = { error: "Akun ini belum terhubung ke stand. Hubungi admin." };

type MenuInput = {
  nama_menu: string;
  deskripsi: string | null;
  harga: number;
  kategori: string;
  foto_url: string | null;
};
type Parsed = { error: string } | { data: MenuInput };

function fotoPrefix(tokoId: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-foto/${tokoId}/`;
}

function parseMenu(formData: FormData, tokoId: string): Parsed {
  const nama = String(formData.get("nama_menu") ?? "").trim();
  const deskripsi = String(formData.get("deskripsi") ?? "").trim();
  const harga = Number(formData.get("harga"));
  const kategori = String(formData.get("kategori") ?? "");
  const foto = String(formData.get("foto_url") ?? "").trim();

  if (!nama) return { error: "Nama menu wajib diisi." };
  if (nama.length > 100) return { error: "Nama menu maksimal 100 karakter." };
  if (deskripsi.length > 300) return { error: "Deskripsi maksimal 300 karakter." };
  if (!Number.isInteger(harga) || harga < 1 || harga > 10_000_000) {
    return { error: "Harga harus angka bulat antara Rp 1 dan Rp 10.000.000." };
  }
  if (!KATEGORI.includes(kategori)) return { error: "Pilih kategori menu." };
  // Hanya foto di folder stand sendiri yang diterima
  if (foto && !foto.startsWith(fotoPrefix(tokoId))) {
    return { error: "Foto tidak valid. Unggah ulang fotonya." };
  }

  return {
    data: {
      nama_menu: nama,
      deskripsi: deskripsi || null,
      harga,
      kategori,
      foto_url: foto || null,
    },
  };
}

/** Hapus berkas foto lama dari Storage (upaya terbaik, kegagalan diabaikan). */
async function removeFoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  url: string | null,
  tokoId: string,
) {
  if (!url) return;
  const prefix = fotoPrefix(tokoId);
  if (!url.startsWith(prefix)) return;
  await supabase.storage
    .from("menu-foto")
    .remove([`${tokoId}/${url.slice(prefix.length)}`]);
}

export async function createMenu(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  const ctx = await getSellerContext();
  if (!ctx.toko) return NO_STAND;

  const parsed = parseMenu(formData, ctx.toko.id);
  if ("error" in parsed) return parsed;

  const supabase = await createClient();
  const { error } = await supabase
    .from("menu")
    .insert({ toko_id: ctx.toko.id, ...parsed.data });
  if (error) return { error: "Gagal menyimpan menu. Coba lagi." };

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateMenu(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  const ctx = await getSellerContext();
  if (!ctx.toko) return NO_STAND;

  const menuId = String(formData.get("menu_id") ?? "");
  const parsed = parseMenu(formData, ctx.toko.id);
  if ("error" in parsed) return parsed;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("menu")
    .select("foto_url")
    .eq("id", menuId)
    .eq("toko_id", ctx.toko.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!existing) return { error: "Menu tidak ditemukan." };

  const { error } = await supabase
    .from("menu")
    .update(parsed.data)
    .eq("id", menuId)
    .eq("toko_id", ctx.toko.id);
  if (error) return { error: "Gagal menyimpan perubahan. Coba lagi." };

  if (existing.foto_url && existing.foto_url !== parsed.data.foto_url) {
    await removeFoto(supabase, existing.foto_url, ctx.toko.id);
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Toggle Tersedia / Habis. Hanya SATU panggilan ke database: kepemilikan menu
 * dijaga oleh RLS (menu milik stand lain tidak akan terubah -> 0 baris).
 * Tidak memakai revalidatePath: layar sudah menampilkan perubahannya sendiri.
 */
export async function toggleStok(
  menuId: string,
  tersedia: boolean,
): Promise<MenuState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu")
    .update({ tersedia })
    .eq("id", menuId)
    .is("deleted_at", null)
    .select("id");
  if (error || !data || data.length === 0) {
    return { error: "Gagal mengubah stok. Muat ulang halaman lalu coba lagi." };
  }
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Hapus = disembunyikan (soft delete) supaya riwayat pesanan tetap utuh. */
export async function deleteMenu(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  const ctx = await getSellerContext();
  if (!ctx.toko) return NO_STAND;

  const menuId = String(formData.get("menu_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", menuId)
    .eq("toko_id", ctx.toko.id);
  if (error) return { error: "Gagal menghapus menu. Coba lagi." };

  revalidatePath("/dashboard");
  return { ok: true };
}

/** Toggle "Stand menerima pesanan" (buka / tutup). Satu panggilan; dijaga RLS. */
export async function setStandBuka(
  tokoId: string,
  buka: boolean,
): Promise<MenuState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("toko")
    .update({ buka })
    .eq("id", tokoId)
    .select("id");
  if (error || !data || data.length === 0) {
    return { error: "Gagal mengubah status stand. Muat ulang halaman lalu coba lagi." };
  }
  return { ok: true };
}

/** Simpan (atau hapus, bila null) foto stand. Berkas lama dibersihkan dari Storage. */
export async function setStandFoto(
  tokoId: string,
  fotoUrl: string | null,
): Promise<MenuState> {
  if (fotoUrl && !fotoUrl.startsWith(fotoPrefix(tokoId))) {
    return { error: "Foto tidak valid. Unggah ulang fotonya." };
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("toko")
    .select("foto_url")
    .eq("id", tokoId)
    .maybeSingle();

  // Kepemilikan dijaga RLS: bukan stand sendiri -> 0 baris
  const { data, error } = await supabase
    .from("toko")
    .update({ foto_url: fotoUrl })
    .eq("id", tokoId)
    .select("id");
  if (error || !data || data.length === 0) {
    return { error: "Gagal menyimpan foto stand. Coba lagi." };
  }

  if (before?.foto_url && before.foto_url !== fotoUrl) {
    await removeFoto(supabase, before.foto_url, tokoId);
  }
  return { ok: true };
}
