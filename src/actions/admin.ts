"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminState = { error?: string; ok?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOT_ALLOWED: AdminState = { error: "Tidak diizinkan." };

function parseStand(raw: FormDataEntryValue | null) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 && n < 1000 ? n : null;
}

/** Tambah penjual: akun login + peran penjual + stand. */
export async function createSeller(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  if (!(await getAdminUser())) return NOT_ALLOWED;

  const nama = String(formData.get("nama") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const namaToko = String(formData.get("nama_toko") ?? "").trim();
  const noStand = parseStand(formData.get("no_stand"));

  if (!nama) return { error: "Nama penjual wajib diisi." };
  if (!EMAIL_RE.test(email)) return { error: "Format email belum benar." };
  if (password.length < 8) return { error: "Kata sandi minimal 8 karakter." };
  if (!namaToko) return { error: "Nama stand wajib diisi." };
  if (noStand === null) return { error: "Nomor stand harus angka 1 sampai 999." };

  const admin = createAdminClient();

  const { data: taken } = await admin
    .from("toko")
    .select("id")
    .eq("no_stand", noStand)
    .maybeSingle();
  if (taken) return { error: `Nomor stand ${noStand} sudah dipakai.` };

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nama },
  });
  if (createErr || !created.user) {
    return {
      error: /already|registered|exists/i.test(createErr?.message ?? "")
        ? "Email ini sudah terdaftar."
        : "Gagal membuat akun penjual.",
    };
  }
  const userId = created.user.id;

  // Trigger database membuat profil sebagai 'pembeli'; naikkan jadi 'penjual'.
  const { error: roleErr } = await admin
    .from("profiles")
    .update({ role: "penjual" })
    .eq("id", userId);
  if (roleErr) {
    await admin.auth.admin.deleteUser(userId);
    return { error: "Gagal mengatur peran penjual." };
  }

  const { error: tokoErr } = await admin
    .from("toko")
    .insert({ no_stand: noStand, nama_toko: namaToko, penjual_id: userId });
  if (tokoErr) {
    await admin.auth.admin.deleteUser(userId); // batalkan: jangan tinggalkan akun tanpa stand
    return { error: "Gagal membuat stand. Coba lagi." };
  }

  revalidatePath("/admin");
  return { ok: true };
}

/** Ubah data penjual dan stand; status nonaktif juga memblokir login. */
export async function updateSeller(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  if (!(await getAdminUser())) return NOT_ALLOWED;

  const tokoId = String(formData.get("toko_id") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  const namaToko = String(formData.get("nama_toko") ?? "").trim();
  const noStand = parseStand(formData.get("no_stand"));
  const aktif = formData.get("aktif") !== "false";
  const password = String(formData.get("password") ?? "");

  if (!nama) return { error: "Nama penjual wajib diisi." };
  if (!namaToko) return { error: "Nama stand wajib diisi." };
  if (noStand === null) return { error: "Nomor stand harus angka 1 sampai 999." };
  if (password && password.length < 8) {
    return { error: "Kata sandi baru minimal 8 karakter." };
  }

  const admin = createAdminClient();

  const { data: toko } = await admin
    .from("toko")
    .select("id, penjual_id, aktif")
    .eq("id", tokoId)
    .single();
  if (!toko) return { error: "Stand tidak ditemukan." };

  const { data: clash } = await admin
    .from("toko")
    .select("id")
    .eq("no_stand", noStand)
    .neq("id", tokoId)
    .maybeSingle();
  if (clash) return { error: `Nomor stand ${noStand} sudah dipakai.` };

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ nama })
    .eq("id", toko.penjual_id);
  const { error: tokoErr } = await admin
    .from("toko")
    .update({ nama_toko: namaToko, no_stand: noStand, aktif })
    .eq("id", tokoId);
  if (profileErr || tokoErr) return { error: "Gagal menyimpan perubahan." };

  const authUpdate: { password?: string; ban_duration?: string } = {};
  if (password) authUpdate.password = password;
  if (aktif !== toko.aktif) authUpdate.ban_duration = aktif ? "none" : "876000h";

  if (Object.keys(authUpdate).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(
      toko.penjual_id,
      authUpdate,
    );
    if (error) {
      return {
        error:
          "Data tersimpan, tetapi pembaruan kata sandi atau status login gagal.",
      };
    }
  }

  revalidatePath("/admin");
  return { ok: true };
}

/** Hapus permanen: akun login, profil, dan stand (cascade di database). */
export async function deleteSeller(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  if (!(await getAdminUser())) return NOT_ALLOWED;

  const tokoId = String(formData.get("toko_id") ?? "");
  const admin = createAdminClient();

  const { data: toko } = await admin
    .from("toko")
    .select("penjual_id")
    .eq("id", tokoId)
    .single();
  if (!toko) return { error: "Stand tidak ditemukan." };

  const { error } = await admin.auth.admin.deleteUser(toko.penjual_id);
  if (error) return { error: "Gagal menghapus akun penjual." };

  revalidatePath("/admin");
  return { ok: true };
}