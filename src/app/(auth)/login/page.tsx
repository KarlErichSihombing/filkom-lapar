"use client";

import { useActionState, useState } from "react";
import { login, type AuthState } from "@/actions/auth";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";
import { ArrowRight, AtSign, ShieldCheck, Store } from "@/components/ui/icons";
import type { Role } from "@/lib/roles";

const initial: AuthState = {};

const ROLE_CONFIG: Record<
  Role,
  {
    buttonLabel: string;
    fieldLabel: string;
    placeholder: string;
    badge: string;
    submitText: string;
  }
> = {
  pembeli: {
    buttonLabel: "Mahasiswa / Tamu",
    fieldLabel: "Email Mahasiswa UB / NIM",
    placeholder: "farhan@student.ub.ac.id atau 21515020...",
    badge: "@student.ub.ac.id",
    submitText: "Masuk sebagai Pembeli",
  },
  penjual: {
    buttonLabel: "Penjual Stand",
    fieldLabel: "Email Akun Penjual Stand",
    placeholder: "stand01@filkom.ub.ac.id",
    badge: "Merchant GKM",
    submitText: "Masuk ke Portal Penjual",
  },
  admin: {
    buttonLabel: "Admin Kantin",
    fieldLabel: "Email Pengelola / Admin Kantin",
    placeholder: "admin@filkom.ub.ac.id",
    badge: "Administrator",
    submitText: "Masuk ke Portal Admin",
  },
};

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, initial);
  const [roleTab, setRoleTab] = useState<Role>("pembeli");

  const activeConfig = ROLE_CONFIG[roleTab];

  return (
    <AuthCard active="login" eyebrow="Portal Masuk" title="Selamat Datang">
      {/* Pilihan Peran Akun (Pembeli, Penjual Stand, Admin Kantin) */}
      <div className="mb-4">
        <p className="mb-2 font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-muted">
          Pilih Peran Akun Anda
        </p>
        <div
          role="radiogroup"
          aria-label="Pilih peran akun"
          className="grid grid-cols-3 gap-1.5"
        >
          <button
            type="button"
            role="radio"
            aria-checked={roleTab === "pembeli"}
            onClick={() => setRoleTab("pembeli")}
            className={`flex items-center justify-center gap-1.5 rounded-2xl px-2.5 py-2.5 font-label text-[11px] font-semibold transition-all ${
              roleTab === "pembeli"
                ? "bg-white text-on-surface shadow-sm ring-1 ring-primary-strong/30"
                : "bg-surface text-on-surface-muted hover:bg-surface-variant"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`size-3.5 shrink-0 ${
                roleTab === "pembeli" ? "text-primary-strong" : "text-on-surface-muted"
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="truncate">Pembeli</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={roleTab === "penjual"}
            onClick={() => setRoleTab("penjual")}
            className={`flex items-center justify-center gap-1.5 rounded-2xl px-2.5 py-2.5 font-label text-[11px] font-semibold transition-all ${
              roleTab === "penjual"
                ? "bg-white text-on-surface shadow-sm ring-1 ring-primary-strong/30"
                : "bg-surface text-on-surface-muted hover:bg-surface-variant"
            }`}
          >
            <Store
              className={`size-3.5 shrink-0 ${
                roleTab === "penjual" ? "text-primary-strong" : "text-on-surface-muted"
              }`}
            />
            <span className="truncate">Penjual Stand</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={roleTab === "admin"}
            onClick={() => setRoleTab("admin")}
            className={`flex items-center justify-center gap-1.5 rounded-2xl px-2.5 py-2.5 font-label text-[11px] font-semibold transition-all ${
              roleTab === "admin"
                ? "bg-white text-on-surface shadow-sm ring-1 ring-primary-strong/30"
                : "bg-surface text-on-surface-muted hover:bg-surface-variant"
            }`}
          >
            <ShieldCheck
              className={`size-3.5 shrink-0 ${
                roleTab === "admin" ? "text-primary-strong" : "text-on-surface-muted"
              }`}
            />
            <span className="truncate">Admin</span>
          </button>
        </div>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="expected_role" value={roleTab} />

        <Field
          label={activeConfig.fieldLabel}
          name="email"
          type="email"
          autoComplete="email"
          placeholder={activeConfig.placeholder}
          icon={<AtSign className="size-4" />}
          labelRight={
            <span className="rounded-full bg-secondary-container px-2.5 py-0.5 font-label text-[10px] font-semibold text-secondary">
              {activeConfig.badge}
            </span>
          }
          required
        />

        <PasswordField
          label="Kata Sandi"
          name="password"
          autoComplete="current-password"
          placeholder="Minimal 8 karakter"
          labelRight={
            <span className="cursor-pointer font-label text-[11px] font-semibold text-primary-strong hover:underline">
              Lupa Sandi?
            </span>
          }
          required
        />

        <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
          <label className="flex cursor-pointer items-center gap-2 text-on-surface-muted">
            <input
              type="checkbox"
              defaultChecked
              className="size-4 rounded accent-primary-strong"
            />
            <span>Ingat sesi di perangkat ini</span>
          </label>
          <span className="inline-flex items-center gap-1 font-label text-[11px] text-on-surface-muted">
            <ShieldCheck className="size-3.5 text-secondary" />
            SSL Encrypted
          </span>
        </div>

        {state.error && (
          <p role="alert" className="rounded-xl bg-error/10 px-3 py-2 text-xs font-medium text-error">
            {state.error}
          </p>
        )}

        <Button type="submit" className="w-full py-3.5" disabled={pending}>
          {pending ? (
            "Memproses..."
          ) : (
            <>
              {activeConfig.submitText} <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-5 flex items-center gap-3 font-label text-[10px] font-semibold uppercase tracking-wider text-outline">
        <span className="h-px flex-1 bg-surface-variant" />
        Atau Masuk Cepat
        <span className="h-px flex-1 bg-surface-variant" />
      </div>

      <div className="mt-4 space-y-2.5">
        <button
          type="button"
          disabled
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-surface px-4 py-3 font-label text-xs font-semibold text-on-surface opacity-90 transition-colors hover:bg-surface-variant"
        >
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Akun Email Kampus (@student.ub.ac.id)</span>
        </button>

        <button
          type="button"
          disabled
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-surface px-4 py-3 font-label text-xs font-semibold text-on-surface opacity-90 transition-colors hover:bg-surface-variant"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4 text-tertiary-strong"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="3" x2="21" y1="22" y2="22" />
            <line x1="6" x2="6" y1="18" y2="11" />
            <line x1="10" x2="10" y1="18" y2="11" />
            <line x1="14" x2="14" y1="18" y2="11" />
            <line x1="18" x2="18" y1="18" y2="11" />
            <polygon points="12 2 20 7 4 7" />
          </svg>
          <span>Single Sign-On SIAM FILKOM</span>
        </button>
      </div>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-on-surface-muted">
        Mengalami kendala akun? Hubungi Helpdesk BEM / Pengelola Kantin di
        <br className="hidden sm:inline" /> GKM FILKOM UB.
      </p>
    </AuthCard>
  );
}
