import type { ReactNode } from "react";
import { BuyerShell } from "@/components/buyer/BuyerShell";
import { CartProvider } from "@/components/buyer/CartProvider";
import { getBuyerContext } from "@/lib/buyer";
import { fetchCartLines } from "@/lib/cart";

export default async function PembeliLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [ctx, initialLines] = await Promise.all([
    getBuyerContext(),
    fetchCartLines(),
  ]);

  return (
    <CartProvider initialLines={initialLines}>
      <BuyerShell nama={ctx.nama}>{children}</BuyerShell>
    </CartProvider>
  );
}
