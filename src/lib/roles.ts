export type Role = "pembeli" | "penjual" | "admin";

/** Halaman awal tiap peran setelah login. */
export function homeForRole(role: string | null | undefined) {
  if (role === "admin") return "/admin";
  if (role === "penjual") return "/dashboard";
  return "/beranda";
}