import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { homeForRole } from "@/lib/roles";

const PUBLIC_PATHS = ["/login", "/register"];

/**
 * Menyegarkan sesi Supabase di setiap request dan menjaga akses halaman:
 * - halaman utama (/) selalu diarahkan ke /login
 * - /login dan /register selalu bisa diakses (meski sudah ada sesi di tab lain)
 * - belum login di halaman terproteksi -> /login
 * - tiap peran (pembeli / penjual / admin) hanya boleh di areanya sendiri
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Jangan diganti getSession(): getUser() memverifikasi token ke server Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.includes(path);

  const redirectTo = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    const redirect = NextResponse.redirect(url);
    // bawa cookie sesi yang baru disegarkan
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  // Halaman utama (/) selalu mengarah ke halaman login
  if (path === "/") {
    return redirectTo("/login");
  }

  // Halaman publik (/login, /register) selalu ditampilkan tanpa mental ke dashboard
  if (isPublic) {
    return response;
  }

  if (!user) {
    return redirectTo("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "pembeli";
  const home = homeForRole(role);

  // Setiap peran hanya boleh berada di areanya sendiri
  const inAdmin = path === "/admin" || path.startsWith("/admin/");
  const inDashboard = path === "/dashboard" || path.startsWith("/dashboard/");
  if (role === "admin" && !inAdmin) return redirectTo(home);
  if (role === "penjual" && !inDashboard) return redirectTo(home);
  if (role === "pembeli" && (inAdmin || inDashboard)) return redirectTo(home);

  return response;
}