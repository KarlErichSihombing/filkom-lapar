import type { ReactNode } from "react";
import { SellerShell } from "@/components/seller/SellerShell";
import { StandStatusProvider } from "@/components/seller/StandStatus";
import { getSellerContext } from "@/lib/seller";

export default async function PenjualLayout({
  children,
}: {
  children: ReactNode;
}) {
  const ctx = await getSellerContext();
  return (
    <StandStatusProvider initial={ctx.toko?.buka ?? true}>
      <SellerShell ctx={ctx}>{children}</SellerShell>
    </StandStatusProvider>
  );
}
