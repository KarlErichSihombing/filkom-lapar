"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImageIcon } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;

/** Perkecil gambar (maks. 900px) dan ubah ke WebP agar unggahan ringan. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pengolahan gambar.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Gagal memproses gambar."))),
      "image/webp",
      0.82,
    ),
  );
}

type Props = { tokoId: string; initialUrl?: string | null };

export function PhotoField({ tokoId, initialUrl = null }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      const blob = await compress(file);
      const ext = blob.type === "image/webp" ? "webp" : "png";
      const path = `${tokoId}/${crypto.randomUUID()}.${ext}`;

      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("menu-foto")
        .upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
      if (upErr) throw new Error("Gagal mengunggah foto. Coba lagi.");

      setUrl(supabase.storage.from("menu-foto").getPublicUrl(path).data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah foto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-on-surface-muted">
        Foto menu (opsional)
      </p>
      <input type="hidden" name="foto_url" value={url ?? ""} />
      <div className="flex items-center gap-4">
        <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-variant/60 text-outline">
          {url ? (
            <Image src={url} alt="Pratinjau foto menu" fill sizes="96px" className="object-cover" />
          ) : (
            <ImageIcon className="size-8" />
          )}
        </div>
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPick}
            className="sr-only"
            aria-label="Pilih foto menu"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-full bg-primary-container px-4 py-2 font-label text-xs font-medium text-primary-strong transition-colors hover:brightness-95 disabled:opacity-50"
            >
              {busy ? "Mengunggah..." : url ? "Ganti foto" : "Pilih foto"}
            </button>
            {url && !busy && (
              <button
                type="button"
                onClick={() => setUrl(null)}
                className="rounded-full px-4 py-2 font-label text-xs font-medium text-error transition-colors hover:bg-error/10"
              >
                Hapus foto
              </button>
            )}
          </div>
          <p className="text-[11px] text-on-surface-muted">
            JPG, PNG, atau WebP. Otomatis diperkecil sebelum diunggah.
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}