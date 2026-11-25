"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { setStandFoto } from "@/actions/menu";
import { ImageIcon } from "@/components/ui/icons";
import { uploadStandPhoto } from "@/lib/photo-upload";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;

export function StandPhotoEditor({
  tokoId,
  initialUrl,
}: {
  tokoId: string;
  initialUrl: string | null;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function save(next: string | null) {
    const res = await setStandFoto(tokoId, next);
    if (res.error) throw new Error(res.error);
    setUrl(next);
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar (JPG, PNG, atau WebP).");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError("Ukuran foto terlalu besar (maksimal 10 MB).");
      return;
    }

    setBusy(true);
    try {
      await save(await uploadStandPhoto(tokoId, file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan foto stand.");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setBusy(true);
    setError(null);
    try {
      await save(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus foto stand.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-28 shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onPick}
        className="sr-only"
        aria-label="Pilih foto stand"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={url ? "Ganti foto stand" : "Tambah foto stand"}
        className="group relative grid size-28 place-items-center overflow-hidden rounded-2xl bg-surface text-outline disabled:opacity-70"
      >
        {url ? (
          <Image src={url} alt="Foto stand" fill sizes="112px" className="object-cover" />
        ) : (
          <ImageIcon className="size-8" />
        )}
        <span className="absolute inset-x-0 bottom-0 bg-inverted/70 py-1 text-center font-label text-[11px] text-on-primary">
          {busy ? "Menyimpan..." : url ? "Ganti foto" : "Tambah foto"}
        </span>
      </button>

      {url && !busy && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-1.5 w-full rounded-full py-1 font-label text-[11px] font-medium text-error transition-colors hover:bg-error/10"
        >
          Hapus foto
        </button>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-[11px] leading-snug text-error">
          {error}
        </p>
      )}
    </div>
  );
}
