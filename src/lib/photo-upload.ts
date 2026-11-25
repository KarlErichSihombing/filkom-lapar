import { createClient } from "@/lib/supabase/client";

/** Perkecil gambar dan ubah ke WebP agar unggahan ringan. Hanya untuk browser. */
export async function compressImage(
  file: File,
  maxSide = 1200,
  quality = 0.82,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
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
      quality,
    ),
  );
}

/** Unggah foto stand ke bucket menu-foto, folder milik stand sendiri. Mengembalikan URL publik. */
export async function uploadStandPhoto(tokoId: string, file: File): Promise<string> {
  const blob = await compressImage(file);
  const ext = blob.type === "image/webp" ? "webp" : "png";
  const path = `${tokoId}/stand-${crypto.randomUUID()}.${ext}`;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from("menu-foto")
    .upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
  if (error) throw new Error("Gagal mengunggah foto. Coba lagi.");

  return supabase.storage.from("menu-foto").getPublicUrl(path).data.publicUrl;
}
