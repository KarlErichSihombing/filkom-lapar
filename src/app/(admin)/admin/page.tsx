import { SellerManager } from "@/components/admin/SellerManager";
import { StatCards } from "@/components/admin/StatCards";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SellerRow } from "@/types/seller";

type TokoRow = {
  id: string;
  no_stand: number;
  nama_toko: string;
  aktif: boolean;
  penjual_id: string;
  profiles: { nama: string } | { nama: string }[] | null;
};

export default async function AdminPage() {
  await requireAdmin(); // data dibaca dengan hak penuh, jadi cek admin dulu

  const admin = createAdminClient();
  const [tokoRes, usersRes] = await Promise.all([
    admin
      .from("toko")
      .select("id, no_stand, nama_toko, aktif, penjual_id, profiles(nama)")
      .order("no_stand", { ascending: true }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (tokoRes.error || usersRes.error) {
    return (
      <p role="alert" className="rounded-3xl bg-white p-6 text-sm text-error">
        Gagal memuat data stand:{" "}
        {tokoRes.error?.message ?? usersRes.error?.message}. Pastikan tabel
        toko sudah dibuat di Supabase dan SUPABASE_SERVICE_ROLE_KEY sudah
        diisi.
      </p>
    );
  }

  const emailById = new Map(
    usersRes.data.users.map((u) => [u.id, u.email ?? ""]),
  );

  const rows: SellerRow[] = ((tokoRes.data ?? []) as unknown as TokoRow[]).map(
    (r) => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return {
        tokoId: r.id,
        penjualId: r.penjual_id,
        noStand: r.no_stand,
        namaToko: r.nama_toko,
        namaPenjual: profile?.nama ?? "",
        email: emailById.get(r.penjual_id) ?? "",
        aktif: r.aktif,
      };
    },
  );

  const active = rows.filter((r) => r.aktif).length;

  return (
    <SellerManager
      rows={rows}
      stats={
        <StatCards
          total={rows.length}
          active={active}
          inactive={rows.length - active}
        />
      }
    />
  );
}