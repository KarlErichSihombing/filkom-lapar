"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Receipt, ShoppingBag } from "@/components/ui/icons";

const items = [
  { label: "Beranda", href: "/beranda", icon: Home },
  { label: "Keranjang", href: null, icon: ShoppingBag },
  { label: "Pesanan", href: null, icon: Receipt },
];

export function BuyerNav() {
  const pathname = usePathname();
  const onHome = pathname.startsWith("/beranda") || pathname.startsWith("/toko");

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-4 z-20 mx-auto flex w-fit gap-1 rounded-full bg-surface p-1.5 shadow-lg shadow-primary/10"
    >
      {items.map(({ label, href, icon: Icon }) => {
        const base =
          "flex items-center gap-2 rounded-full px-4 py-2.5 font-label text-xs font-medium";
        if (!href) {
          return (
            <span
              key={label}
              aria-disabled="true"
              title="Segera hadir"
              className={`${base} text-on-surface-muted opacity-60`}
            >
              <Icon className="size-5" />
              <span className="hidden sm:inline">{label}</span>
            </span>
          );
        }
        return (
          <Link
            key={label}
            href={href}
            aria-current={onHome ? "page" : undefined}
            className={`${base} ${
              onHome ? "bg-primary-strong text-on-primary" : "text-on-surface-muted"
            }`}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}