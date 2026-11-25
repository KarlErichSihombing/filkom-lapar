"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/buyer/CartProvider";
import { Home, Receipt, ShoppingBag, X } from "@/components/ui/icons";

export function BuyerNav() {
  const pathname = usePathname();
  const cart = useCart();

  const items = [
    {
      label: "Beranda",
      href: "/beranda",
      icon: Home,
      active: pathname.startsWith("/beranda") || pathname.startsWith("/toko"),
      badge: 0,
    },
    {
      label: "Keranjang",
      href: "/keranjang",
      icon: ShoppingBag,
      active: pathname.startsWith("/keranjang") || pathname.startsWith("/checkout"),
      badge: cart.itemCount,
    },
    {
      label: "Pesanan",
      href: "/pesanan",
      icon: Receipt,
      active: pathname.startsWith("/pesanan") || pathname.startsWith("/pembayaran"),
      badge: 0,
    },
  ];

  return (
    <>
      {cart.error && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-error px-4 py-3 text-xs font-medium text-on-primary shadow-lg"
        >
          <span>{cart.error}</span>
          <button
            type="button"
            onClick={cart.dismissError}
            aria-label="Tutup pesan kesalahan"
            className="grid size-6 shrink-0 place-items-center rounded-full bg-white/15 hover:bg-white/25"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-4 z-20 mx-auto flex w-fit gap-1 rounded-full bg-surface p-1.5 shadow-lg shadow-primary/10"
      >
        {items.map(({ label, href, icon: Icon, active, badge }) => (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 font-label text-xs font-medium transition-colors ${
              active
                ? "bg-primary-strong text-on-primary"
                : "text-on-surface-muted hover:bg-surface-variant"
            }`}
          >
            <Icon className="size-5" />
            <span>{label}</span>
            {badge > 0 && (
              <span
                className={`grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                  active
                    ? "bg-white text-primary-strong"
                    : "bg-primary-strong text-on-primary"
                }`}
              >
                {badge}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}
