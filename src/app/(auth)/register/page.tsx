"use client";

import { useActionState } from "react";
import { register, type AuthState } from "@/actions/auth";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";
import { ArrowRight, AtSign } from "@/components/ui/icons";

const initial: AuthState = {};

export default function RegisterPage() {
  const [state, action, pending] = useActionState(register, initial);

  return (
    <AuthCard active="register" eyebrow="Portal daftar" title="Buat akun">
      <p className="-mt-2 mb-4 text-xs text-on-surface-muted">
        Pendaftaran khusus pembeli. Akun penjual dibuat oleh admin kantin.
      </p>

      <form action={action} className="space-y-4">
        <Field label="Nama lengkap" name="nama" autoComplete="name" required />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nama@student.ub.ac.id"
          icon={<AtSign className="size-5" />}
          required
        />
        <Field
          label="Nomor telepon (opsional)"
          name="no_telp"
          type="tel"
          autoComplete="tel"
        />
        <PasswordField
          label="Kata sandi"
          name="password"
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          minLength={8}
          required
        />
        <PasswordField
          label="Konfirmasi kata sandi"
          name="konfirmasi"
          autoComplete="new-password"
          placeholder="Ulangi kata sandi"
          minLength={8}
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
              Daftar ke FILKOM Lapar <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
    </AuthCard>
  );
}