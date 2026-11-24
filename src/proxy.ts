import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

// Next.js 16+: file ini bernama proxy.ts dan fungsinya "proxy".
// Next.js 15 ke bawah: ganti nama file jadi middleware.ts dan fungsi jadi "middleware".
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // lewati file statis dan webhook (webhook tidak punya sesi pengguna)
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|manifest.webmanifest|sw.js|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};