import type { ReactNode } from "react";
import { BuyerShell } from "@/components/buyer/BuyerShell";
import { getBuyerContext } from "@/lib/buyer";

export default async function PembeliLayout({
  children,
}: {
  children: ReactNode;
}) {
  const ctx = await getBuyerContext();
  return <BuyerShell nama={ctx.nama}>{children}</BuyerShell>;
}
