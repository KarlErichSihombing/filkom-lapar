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
    `flex-1 rounded-full py-2.5 text-center font-label text-sm font-medium transition-colors ${
      isActive
        ? "bg-primary-strong text-on-primary"
        : "text-on-surface-muted hover:bg-surface-variant"
    }`;

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-xl shadow-primary/10 sm:p-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-label text-[11px] font-medium uppercase tracking-wider text-primary-strong">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-3xl font-semibold">{title}</h2>
        </div>
        <span className="grid size-11 place-items-center rounded-full bg-primary-container text-primary-strong">
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
          Daftar akun
        </Link>
      </nav>

      <div className="mt-6">{children}</div>
    </section>
  );
}