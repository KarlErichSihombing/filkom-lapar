import type { ReactNode } from "react";
import {
  FeatureStrip,
  HeroPanel,
  SiteFooter,
  TopBar,
} from "@/components/auth/AuthChrome";

/** Kerangka halaman login & register: hero di kiri, kartu form di kanan. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-surface/60">
      <div className="mx-auto max-w-6xl space-y-4 px-4 pt-4 sm:px-6">
        <TopBar />
        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr] lg:items-start">
          <div className="order-2 lg:order-1">
            <HeroPanel />
          </div>
          <main className="order-1 lg:order-2">{children}</main>
        </div>
        <FeatureStrip />
      </div>
      <SiteFooter />
    </div>
  );
}