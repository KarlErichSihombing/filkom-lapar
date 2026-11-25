import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Pembeli yang sedang login. Pembatasan peran sudah dijaga proxy.ts. */
export const getBuyerContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nama")
    .eq("id", user.id)
    .single();

  return { userId: user.id, nama: profile?.nama ?? "" };
});