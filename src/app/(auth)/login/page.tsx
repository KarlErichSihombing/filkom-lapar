"use client";

import { useActionState } from "react";
import { login, type AuthState } from "@/actions/auth";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";
import { ArrowRight, AtSign } from "@/components/ui/icons";

const initial: AuthState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <AuthCard active="login" eyebrow="Portal masuk" title="Selamat datang">
      <form action={action} className="space-y-4">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nama@student.ub.ac.id"
          icon={<AtSign className="size-5" />}
          required
        />
        <PasswordField
          label="Kata sandi"
          name="password"
          autoComplete="current-password"
          placeholder="Kata sandi"
          required
        />

        {state.error && (
          <p role="alert" className="text-sm text-error">
            {state.error}
          </p>
        )}

        <Button type="submit" className="w-full py-3.5" disabled={pending}>
          {pending ? (
            "Memproses..."
          ) : (
            <>
              Masuk ke FILKOM Lapar <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3 text-[11px] uppercase tracking-wider text-outline">
        <span className="h-px flex-1 bg-surface-variant" />
        Atau masuk cepat
        <span className="h-px flex-1 bg-surface-variant" />
      </div>
      <div className="mt-4 space-y-2">
        <Button variant="secondary" className="w-full" disabled>
          Akun email kampus (segera hadir)
        </Button>
        <Button variant="secondary" className="w-full" disabled>
          Single sign-on SIAM (segera hadir)
        </Button>
      </div>

      <p className="mt-6 text-center text-xs text-on-surface-muted">
        Mengalami kendala akun? Hubungi helpdesk BEM atau pengelola kantin di
        Gedung F1.02.
      </p>
    </AuthCard>
  );
}