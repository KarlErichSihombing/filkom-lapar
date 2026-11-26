"use client";

import { useState, useTransition } from "react";
import { kirimUlasan } from "@/actions/review";
import { Button } from "@/components/ui/Button";
import { CircleCheck, Star } from "@/components/ui/icons";
import type { UlasanSummary } from "@/types/order";

const RATING_LABELS: Record<number, string> = {
  1: "1/5 · Kurang Memuaskan",
  2: "2/5 · Cukup",
  3: "3/5 · Lumayan",
  4: "4/5 · Puas",
  5: "5/5 · Sangat Puas",
};

const QUICK_TAGS = ["Rasa Pas", "Pengemasan Rapi", "Tepat Waktu", "Porsi Pas"];

export function OrderReviewBox({
  pesananId,
  namaToko,
  ulasan,
  onSubmitted,
}: {
  pesananId: string;
  namaToko: string;
  ulasan: UlasanSummary | null;
  onSubmitted: (ulasan: UlasanSummary) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [komentar, setKomentar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (ulasan) {
    return (
      <div className="mt-4 rounded-2xl bg-secondary-container/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-label text-xs font-semibold text-secondary">
            <CircleCheck className="size-4" />
            Ulasan Anda Terkirim
          </span>
          <span
            aria-label={`Rating ${ulasan.rating} dari 5 bintang`}
            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-label text-xs font-bold text-primary-strong"
          >
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`size-3.5 ${
                  i < ulasan.rating ? "fill-primary text-primary" : "text-outline/40"
                }`}
              />
            ))}
            <span className="ml-1">{ulasan.rating}/5</span>
          </span>
        </div>
        {ulasan.komentar && (
          <p className="mt-2 text-xs text-on-surface">&ldquo;{ulasan.komentar}&rdquo;</p>
        )}
      </div>
    );
  }

  function addQuickTag(tag: string) {
    setKomentar((prev) => {
      if (prev.toLowerCase().includes(tag.toLowerCase())) return prev;
      const sep = prev.trim().length > 0 ? ", " : "";
      return `${prev.trim()}${sep}${tag}`.slice(0, 500);
    });
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await kirimUlasan(pesananId, rating, komentar);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.ulasan) {
        onSubmitted(res.ulasan);
      }
    });
  }

  if (!open) {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-3.5">
        <div>
          <p className="font-headline text-xs font-semibold">
            Bagaimana makanan &amp; pelayanan di {namaToko}?
          </p>
          <p className="text-[11px] text-on-surface-muted">
            Beri rating bintang &amp; ulasan untuk membantu pembeli lain.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Star className="size-3.5" /> Beri Ulasan
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-headline text-sm font-semibold">
          Beri Bintang untuk Pesanan di {namaToko}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-label text-xs text-on-surface-muted hover:underline"
        >
          Tutup
        </button>
      </div>

      {/* Pilihan 1-5 Bintang */}
      <div className="mt-3 flex flex-col items-center rounded-2xl bg-white p-4">
        <div
          role="radiogroup"
          aria-label="Pilih rating bintang 1 sampai 5"
          className="flex items-center gap-2"
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const active = star <= rating;
            return (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} bintang`}
                onClick={() => setRating(star)}
                className="rounded-full p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`size-7 ${
                    active ? "fill-primary text-primary" : "text-outline/40"
                  }`}
                />
              </button>
            );
          })}
        </div>
        <span className="mt-2 rounded-full bg-primary-container px-3 py-0.5 font-label text-xs font-semibold text-primary-strong">
          {RATING_LABELS[rating]}
        </span>

        {/* Chip tag cepat sesuai sketsa UI-04 */}
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addQuickTag(tag)}
              className="rounded-full bg-surface px-3 py-1 font-label text-[11px] font-medium text-on-surface-muted transition-colors hover:bg-surface-variant"
            >
              + {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-baseline justify-between">
          <label
            htmlFor={`ulasan-${pesananId}`}
            className="font-label text-xs font-medium text-on-surface-muted"
          >
            Tulis Ulasan (opsional)
          </label>
          <span className="font-label text-[11px] text-on-surface-muted">
            {komentar.length}/500
          </span>
        </div>
        <textarea
          id={`ulasan-${pesananId}`}
          rows={3}
          maxLength={500}
          value={komentar}
          onChange={(e) => setKomentar(e.target.value)}
          placeholder="Tulis ulasan Anda mengenai rasa menu dan pelayanan stand..."
          className="w-full rounded-2xl bg-white px-4 py-3 text-xs text-on-surface placeholder:text-outline"
        />
      </div>

      {error && (
        <p role="alert" className="mt-2.5 rounded-xl bg-error/10 px-3 py-2 text-xs text-error">
          {error}
        </p>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          variant="outlined"
          size="sm"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Batal
        </Button>
        <Button type="button" size="sm" onClick={handleSubmit} disabled={pending}>
          {pending ? "Mengirim..." : "Kirim Ulasan"}
        </Button>
      </div>
    </div>
  );
}
