import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Klien dengan hak penuh (melewati RLS). HANYA dipakai di server,
 * dan hanya SETELAH memastikan pemanggilnya admin (lihat lib/admin.ts).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}