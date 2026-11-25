"use client";

import { useActionState, useEffect } from "react";
import {
  createMenu,
  deleteMenu,
  updateMenu,
  type MenuState,
} from "@/actions/menu";
import { PhotoField } from "@/components/seller/PhotoField";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { KATEGORI_LABEL, type Kategori, type MenuItem } from "@/types/menu";

const initial: MenuState = {};

type Common = { onDone: () => void; onCancel: () => void };
type FormProps = Common & { tokoId: string } & (
    | { mode: "create" }
    | { mode: "edit"; item: MenuItem }
  );

export function MenuForm(props: FormProps) {
  const item = props.mode === "edit" ? props.item : null;
  const [state, action, pending] = useActionState(
    props.mode === "edit" ? updateMenu : createMenu,
    initial,
  );
  const { onDone, onCancel } = props;

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={action} className="space-y-4">
      {item && <input type="hidden" name="menu_id" value={item.id} />}

      <Field
        label="Nama menu"
        name="nama_menu"
        defaultValue={item?.namaMenu}
        maxLength={100}
        required
      />

      <Field
        label="Harga (Rp)"
        name="harga"
        type="number"
        inputMode="numeric"
        min={1}
        max={10000000}
        step={1}
        defaultValue={item?.harga}
        required
      />

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-on-surface-muted">
          Kategori
        </legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(KATEGORI_LABEL) as Kategori[]).map((k) => (
            <label key={k} className="cursor-pointer">
              <input
                type="radio"
                name="kategori"
                value={k}
                defaultChecked={(item?.kategori ?? "makanan") === k}
                className="peer sr-only"
              />
              <span className="block rounded-full bg-surface-variant/60 px-4 py-2 text-sm text-on-surface-muted transition-colors peer-checked:bg-primary-strong peer-checked:text-on-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-strong">
                {KATEGORI_LABEL[k]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="deskripsi"
          className="mb-1.5 block text-xs font-medium text-on-surface-muted"
        >
          Deskripsi (opsional)
        </label>
        <textarea
          id="deskripsi"
          name="deskripsi"
          rows={3}
          maxLength={300}
          defaultValue={item?.deskripsi ?? ""}
          className="w-full rounded-2xl bg-surface-variant/60 px-4 py-3 text-sm text-on-surface placeholder:text-outline"
          placeholder="Contoh: nasi, ayam geprek, lalapan, sambal"
        />
      </div>

      <PhotoField tokoId={props.tokoId} initialUrl={item?.fotoUrl} />

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
          {pending ? "Menyimpan..." : item ? "Simpan perubahan" : "Tambah menu"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteMenuForm({
  item,
  onDone,
  onCancel,
}: Common & { item: MenuItem }) {
  const [state, action, pending] = useActionState(deleteMenu, initial);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="menu_id" value={item.id} />
      <p className="text-sm text-on-surface-muted">
        Menu <strong className="text-on-surface">{item.namaMenu}</strong> tidak
        akan tampil lagi di aplikasi pembeli. Riwayat pesanan yang sudah ada
        tetap aman.
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
          {pending ? "Menghapus..." : "Hapus menu"}
        </Button>
      </div>
    </form>
  );
}