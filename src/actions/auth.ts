"use server";

import { redirect } from "next/navigation";
import { homeForRole, type Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_LABEL: Record<Role, string> = {
  pembeli: "Mahasiswa / Pembeli",
  penjual: "Penjual Stand",
  admin: "Admin Kantin",
};

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const expectedRole = String(formData.get("expected_role") ?? "").trim() as Role | "";

  if (!email || !password) {
    return { error: "Email dan kata sandi wajib diisi." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    if (error?.code === "user_banned") {
      return { error: "Akun ini dinonaktifkan. Hubungi admin kantin." };
    }
    return { error: "Email atau kata sandi salah." };
  }

  // Peran dibaca dari database dan dicocokkan dengan tab peran yang dipilih pengguna.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const actualRole: Role = (profile?.role as Role | undefined) ?? "pembeli";

  if (
    expectedRole &&
    ["pembeli", "penjual", "admin"].includes(expectedRole) &&
    actualRole !== expectedRole
  ) {
    await supabase.auth.signOut();
    return {
      error: `Akun ini terdaftar sebagai ${ROLE_LABEL[actualRole]}, bukan ${ROLE_LABEL[expectedRole]}. Silakan pilih peran "${ROLE_LABEL[actualRole]}" di atas.`,
    };
  }

  redirect(homeForRole(actualRole));
}

export async function register(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const nama = String(formData.get("nama") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const noTelp = String(formData.get("no_telp") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const konfirmasi = String(formData.get("konfirmasi") ?? "");

  if (!nama) return { error: "Nama wajib diisi." };
  if (!EMAIL_RE.test(email)) return { error: "Format email belum benar." };
  if (password.length < 8) {
    return { error: "Kata sandi minimal 8 karakter." };
  }
  if (password !== konfirmasi) {
    return { error: "Kata sandi dan konfirmasi tidak sama." };
  }

  const supabase = await createClient();
  // Peran TIDAK dikirim dari form: trigger database selalu membuat 'pembeli'.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nama, no_telp: noTelp || null } },
  });

  if (error) {
    return {
      error: /already|registered/i.test(error.message)
        ? "Email ini sudah terdaftar. Silakan masuk."
        : "Pendaftaran gagal. Coba lagi beberapa saat.",
    };
  }

  redirect("/beranda");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}