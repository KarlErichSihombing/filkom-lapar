import Link from "next/link";
import type { ReactNode } from "react";
import { Utensils } from "@/components/ui/icons";

type Props = {
  active: "login" | "register";
  eyebrow: string;
  title: string;
  children: ReactNode;
};

export function AuthCard({ active, eyebrow, title, children }: Props) {
  const tab = (isActive: boolean) =>
    `flex-1 rounded-full py-2.5 text-center font-label text-sm font-semibold transition-colors ${
      isActive
        ? "bg-primary-strong text-on-primary shadow-sm"
        : "text-on-surface-muted hover:bg-surface-variant"
    }`;

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-xl shadow-primary/10 sm:p-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-wider text-on-surface-muted">
            {eyebrow}
          </p>
          <h2 className="mt-1 font-headline text-3xl font-bold text-on-surface">
            {title}
          </h2>
        </div>
        <span className="grid size-11 place-items-center rounded-full bg-surface text-primary-strong">
          <Utensils className="size-5" />
        </span>
      </div>

      <nav
        aria-label="Masuk atau daftar"
        className="mt-5 flex gap-1 rounded-full bg-surface p-1"
      >
        <Link
          href="/login"
          aria-current={active === "login" ? "page" : undefined}
          className={tab(active === "login")}
        >
          Masuk
        </Link>
        <Link
          href="/register"
          aria-current={active === "register" ? "page" : undefined}
          className={tab(active === "register")}
        >
          Daftar Akun
        </Link>
      </nav>

      <div className="mt-5">{children}</div>
    </section>
  );
}
