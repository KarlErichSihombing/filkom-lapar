"use client";

import { useState } from "react";
import { Field, type FieldProps } from "@/components/ui/Field";
import { Eye, EyeOff, Lock } from "@/components/ui/icons";

type Props = Omit<FieldProps, "type" | "icon" | "trailing">;

/** Kolom kata sandi dengan tombol mata untuk menampilkan/menyembunyikan. */
export function PasswordField(props: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <Field
      {...props}
      type={visible ? "text" : "password"}
      icon={<Lock className="size-5" />}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          aria-pressed={visible}
          className="grid size-9 place-items-center rounded-full text-outline transition-colors hover:bg-surface-variant hover:text-on-surface"
        >
          {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      }
    />
  );
}