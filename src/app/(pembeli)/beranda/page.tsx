import { LogoutButton } from "@/components/LogoutButton";
import { createClient } from "@/lib/supabase/server";

// Halaman sementara untuk menguji alur akun. Nanti diganti daftar toko.
export default async function BerandaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("nama, role")
    .eq("id", user!.id)
    .single();

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Beranda pembeli</h1>
      <p className="text-on-surface-muted">
        Halo, {profile?.nama || user?.email} (peran: {profile?.role})
      </p>
      <LogoutButton />
    </main>
  );
}