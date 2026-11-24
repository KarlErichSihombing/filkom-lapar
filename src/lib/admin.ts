import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminUser = { id: string; nama: string; email: string };

/** Mengembalikan admin yang sedang login, atau null bila bukan admin. */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, nama")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return null;

  return { id: user.id, nama: profile.nama ?? "", email: user.email ?? "" };
}

/** Untuk halaman/layout: bukan admin -> dialihkan. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) redirect("/login");
  return admin;
}