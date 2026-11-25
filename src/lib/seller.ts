import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SellerContext = {
  userId: string;
  nama: string;
  toko: {
    id: string;
    noStand: number;
    namaToko: string;
    buka: boolean;
    ratingRataRata: number;
  } | null;
};

/** Penjual yang sedang login beserta stand-nya. Bukan penjual -> dialihkan. */
export const getSellerContext = cache(async (): Promise<SellerContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nama, role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "penjual") redirect("/login");

  const { data: toko } = await supabase
    .from("toko")
    .select("id, no_stand, nama_toko, buka, rating_rata_rata")
    .eq("penjual_id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    nama: profile.nama ?? "",
    toko: toko
      ? {
          id: toko.id,
          noStand: toko.no_stand,
          namaToko: toko.nama_toko,
          buka: toko.buka,
          ratingRataRata: Number(toko.rating_rata_rata ?? 0),
        }
      : null,
  };
});