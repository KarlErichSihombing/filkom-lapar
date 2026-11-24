"use client";

import { useActionState, useEffect } from "react";
import {
  createSeller,
  deleteSeller,
  updateSeller,
  type AdminState,
} from "@/actions/admin";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";
import type { SellerRow } from "@/types/seller";

const initial: AdminState = {};

type Common = { onDone: () => void; onCancel: () => void };
type FormProps = Common &
  ({ mode: "create" } | { mode: "edit"; row: SellerRow });

export function SellerForm(props: FormProps) {
  const row = props.mode === "edit" ? props.row : null;
  const [state, action, pending] = useActionState(
    props.mode === "edit" ? updateSeller : createSeller,
    initial,
  );
  const { onDone, onCancel } = props;

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={action} className="space-y-4">
      {row && <input type="hidden" name="toko_id" value={row.tokoId} />}

      <Field label="Nama penjual" name="nama" defaultValue={row?.namaPenjual} required />

      {row ? (
        <div>
          <Field
            label="Email"
            name="email_tampil"
            defaultValue={row.email}
            disabled
            className="opacity-60"
          />
          <p className="mt-1 text-xs text-on-surface-muted">
            Email tidak bisa diubah.
          </p>
        </div>
      ) : (
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="off"
          placeholder="penjual@filkom.ub.ac.id"
          required
        />
      )}

      <div className="grid grid-cols-[7rem_1fr] gap-3">
        <Field
          label="No. stand"
          name="no_stand"
          type="number"
          min={1}
          max={999}
          defaultValue={row?.noStand}
          required
        />
        <Field
          label="Nama stand kantin"
          name="nama_toko"
          defaultValue={row?.namaToko}
          required
        />
      </div>

      {row && (
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-on-surface-muted">
            Status
          </legend>
          <div className="flex gap-2">
            {(
              [
                ["true", "Aktif"],
                ["false", "Nonaktif"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="aktif"
                  value={value}
                  defaultChecked={(row.aktif ? "true" : "false") === value}
                  className="peer sr-only"
                />
                <span className="block rounded-full bg-surface-variant/60 px-4 py-2 text-sm text-on-surface-muted transition-colors peer-checked:bg-primary-strong peer-checked:text-on-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-strong">
                  {label}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-on-surface-muted">
            Stand nonaktif: penjual tidak bisa masuk ke akunnya.
          </p>
        </fieldset>
      )}

      <PasswordField
        label={row ? "Kata sandi baru (opsional)" : "Kata sandi awal"}
        name="password"
        autoComplete="new-password"
        placeholder={row ? "Kosongkan bila tidak diubah" : "Minimal 8 karakter"}
        minLength={8}
        required={!row}
      />

      {state.error && (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outlined" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : row ? "Simpan perubahan" : "Buat akun penjual"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteSellerForm({
  row,
  onDone,
  onCancel,
}: Common & { row: SellerRow }) {
  const [state, action, pending] = useActionState(deleteSeller, initial);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="toko_id" value={row.tokoId} />
      <p className="text-sm text-on-surface-muted">
        Akun <strong className="text-on-surface">{row.namaPenjual}</strong> (
        {row.email}) dan stand{" "}
        <strong className="text-on-surface">{row.namaToko}</strong> akan dihapus
        permanen beserta seluruh data terkait stand ini. Tindakan ini tidak bisa
        dibatalkan.
      </p>

      {state.error && (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outlined" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Menghapus..." : "Hapus permanen"}
        </Button>
      </div>
    </form>
  );
}