"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { kirimUlasanToko } from "@/actions/review";
import { useCart } from "@/components/buyer/CartProvider";
import { QtyStepper } from "@/components/buyer/QtyStepper";
import { Button } from "@/components/ui/Button";
import { ArrowRight, CircleCheck, ImageIcon, Plus, Search, ShoppingBag, Star } from "@/components/ui/icons";
import { pad2, rupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { KATEGORI_LABEL, type Kategori, type MenuItem } from "@/types/menu";
import type { PublicReviewItem } from "@/types/order";

type Props = {
  toko: {
    id: string;
    namaToko: string;
    noStand: number;
    rating: number;
    buka: boolean;
    fotoUrl?: string | null;
  };
  initialMenu: MenuItem[];
  initialReviews?: PublicReviewItem[];
};

type MenuRow = {
  id: string;
  nama_menu: string;
  deskripsi: string | null;
  harga: number | string;
  kategori: Kategori;
  foto_url: string | null;
  tersedia: boolean;
  deleted_at: string | null;
};

const toItem = (r: MenuRow): MenuItem => ({
  id: r.id,
  namaMenu: r.nama_menu,
  deskripsi: r.deskripsi,
  harga: Number(r.harga),
  kategori: r.kategori,
  fotoUrl: r.foto_url,
  tersedia: r.tersedia,
});

const RATING_LABELS: Record<number, string> = {
  1: "1/5 · Kurang Memuaskan",
  2: "2/5 · Cukup",
  3: "3/5 · Lumayan",
  4: "4/5 · Puas",
  5: "5/5 · Sangat Puas",
};

const QUICK_TAGS = [
  "Rasa Enak & Pas",
  "Pelayanan Ramah",
  "Harga Terjangkau",
  "Penyajian Cepat",
  "Porsi Mengenyangkan",
];

export function TokoMenuView({ toko, initialMenu, initialReviews = [] }: Props) {
  const cart = useCart();
  const [menu, setMenu] = useState(initialMenu);
  const [buka, setBuka] = useState(toko.buka);
  const [query, setQuery] = useState("");
  const [kategori, setKategori] = useState<"semua" | Kategori>("semua");
  const [reviews, setReviews] = useState<PublicReviewItem[]>(initialReviews);
  const [liveRating, setLiveRating] = useState<number>(toko.rating);
  const [starFilter, setStarFilter] = useState<number | "semua">("semua");

  // State form ulasan langsung di halaman stand
  const [inputRating, setInputRating] = useState<number>(5);
  const [inputKomentar, setInputKomentar] = useState<string>("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [reviewPending, startReviewTransition] = useTransition();

  function addQuickTag(tag: string) {
    setInputKomentar((prev) => {
      if (prev.toLowerCase().includes(tag.toLowerCase())) return prev;
      const sep = prev.trim().length > 0 ? ", " : "";
      return `${prev.trim()}${sep}${tag}`.slice(0, 500);
    });
  }

  function handleSendReview() {
    setReviewError(null);
    setReviewSuccess(null);
    startReviewTransition(async () => {
      const res = await kirimUlasanToko(toko.id, inputRating, inputKomentar);
      if (res.error) {
        setReviewError(res.error);
        return;
      }
      if (res.publicReview) {
        setReviews((prev) => [res.publicReview!, ...prev]);
      }
      if (typeof res.newAvgRating === "number") {
        setLiveRating(res.newAvgRating);
      }
      setInputKomentar("");
      setInputRating(5);
      setReviewSuccess("Terima kasih! Rating dan ulasan Anda untuk stand ini berhasil disimpan.");
    });
  }

  // Perubahan dari penjual langsung masuk tanpa memuat ulang halaman.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`toko-${toko.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu", filter: `toko_id=eq.${toko.id}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            if (id) setMenu((l) => l.filter((m) => m.id !== id));
            return;
          }
          const row = payload.new as unknown as MenuRow;
          if (row.deleted_at) {
            setMenu((l) => l.filter((m) => m.id !== row.id));
            return;
          }
          const item = toItem(row);
          setMenu((l) =>
            l.some((m) => m.id === item.id)
              ? l.map((m) => (m.id === item.id ? item : m))
              : [...l, item],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "toko", filter: `id=eq.${toko.id}` },
        (payload) => setBuka(Boolean((payload.new as { buka?: boolean }).buka)),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toko.id]);

  const kategoriTersedia = useMemo(
    () => Array.from(new Set(menu.map((m) => m.kategori))),
    [menu],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menu
      .filter((m) => {
        if (kategori !== "semua" && m.kategori !== kategori) return false;
        return !q || m.namaMenu.toLowerCase().includes(q);
      })
      // yang tersedia lebih dulu, lalu urut nama
      .sort(
        (a, b) =>
          Number(b.tersedia) - Number(a.tersedia) ||
          a.namaMenu.localeCompare(b.namaMenu, "id"),
      );
  }, [menu, query, kategori]);

  const available = menu.filter((m) => m.tersedia).length;

  return (
    <>
      <section className="rounded-3xl bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-muted">
              Stand No. {pad2(toko.noStand)}
            </p>
            <h1 className="mt-1 text-3xl font-semibold leading-tight">{toko.namaToko}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-on-surface-muted">
              <span className="flex items-center gap-1">
                <Star className="size-4 fill-primary text-primary" />
                {liveRating > 0 ? `${liveRating.toFixed(1)} (${reviews.length} ulasan)` : "Belum ada ulasan"}
              </span>
              <span>
                {menu.length === 0
                  ? "Belum ada menu"
                  : `${menu.length} menu · ${available} tersedia`}
              </span>
            </p>
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-label text-xs font-medium ${
              buka ? "bg-secondary-container text-secondary" : "bg-inverted text-on-primary"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${buka ? "bg-secondary-soft" : "bg-neutral"}`}
            />
            {buka ? "Buka" : "Tutup"}
          </span>
        </div>

        {!buka && (
          <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-sm text-on-surface-muted">
            Stand ini sedang tutup. Menunya tetap bisa dilihat.
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-outline" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Cari menu"
            placeholder="Cari menu..."
            className="w-full rounded-full bg-surface py-3 pl-11 pr-4 text-sm placeholder:text-outline"
          />
        </div>
        {kategoriTersedia.length > 1 && (
          <div
            role="radiogroup"
            aria-label="Filter kategori"
            className="flex gap-1 rounded-full bg-surface p-1"
          >
            {(["semua", ...kategoriTersedia] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kategori === k}
                onClick={() => setKategori(k)}
                className={`rounded-full px-3.5 py-2 font-label text-xs font-medium transition-colors ${
                  kategori === k
                    ? "bg-primary-strong text-on-primary"
                    : "text-on-surface-muted hover:bg-surface-variant"
                }`}
              >
                {k === "semua" ? "Semua" : KATEGORI_LABEL[k]}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-3xl bg-surface px-5 py-12 text-center text-sm text-on-surface-muted">
          {menu.length === 0
            ? "Stand ini belum menambahkan menu."
            : "Tidak ada menu yang cocok dengan pencarian atau filter ini."}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((m) => {
            const qty = cart.qtyOf(m.id);
            const canOrder = buka && m.tersedia;

            return (
              <li key={m.id} className="flex flex-col overflow-hidden rounded-3xl bg-white">
                <div className="relative grid aspect-[4/3] place-items-center bg-surface text-outline">
                  {m.fotoUrl ? (
                    <Image
                      src={m.fotoUrl}
                      alt={m.namaMenu}
                      fill
                      sizes="(min-width:1024px) 320px, (min-width:640px) 45vw, 100vw"
                      className={`object-cover ${m.tersedia ? "" : "grayscale"}`}
                    />
                  ) : (
                    <ImageIcon className="size-10" />
                  )}
                  {!m.tersedia && (
                    <span className="absolute left-3 top-3 rounded-full bg-error px-3 py-1 font-label text-xs font-medium text-on-primary">
                      Habis
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3
                      className={`font-headline font-semibold leading-snug ${
                        m.tersedia ? "" : "text-on-surface-muted"
                      }`}
                    >
                      {m.namaMenu}
                    </h3>
                    <span className="shrink-0 rounded-full bg-surface px-2.5 py-0.5 font-label text-[10px] text-on-surface-muted">
                      {KATEGORI_LABEL[m.kategori]}
                    </span>
                  </div>
                  {m.deskripsi && (
                    <p className="mt-1.5 line-clamp-2 text-xs text-on-surface-muted">
                      {m.deskripsi}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    <p className="font-label text-base font-medium text-primary-strong">
                      {rupiah(m.harga)}
                    </p>
                    {qty > 0 ? (
                      <QtyStepper
                        qty={qty}
                        label={m.namaMenu}
                        onMinus={() => cart.decrement(m.id)}
                        onPlus={() => cart.increment(m.id)}
                        plusDisabled={!canOrder}
                      />
                    ) : (
                      <button
                        type="button"
                        disabled={!canOrder}
                        onClick={() =>
                          cart.add({
                            menuId: m.id,
                            tokoId: toko.id,
                            namaMenu: m.namaMenu,
                            harga: m.harga,
                            fotoUrl: m.fotoUrl,
                            namaToko: toko.namaToko,
                            noStand: toko.noStand,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary-strong px-4 py-2 font-label text-xs font-medium text-on-primary transition-colors hover:brightness-110 disabled:pointer-events-none disabled:bg-surface-variant disabled:text-on-surface-muted"
                      >
                        <Plus className="size-3.5" />
                        Tambah
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {cart.itemCount > 0 && (
        <div className="sticky bottom-20 z-10 mx-auto max-w-xl">
          <Link
            href="/keranjang"
            className="flex items-center justify-between gap-4 rounded-full bg-primary-strong px-5 py-3.5 text-on-primary shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01]"
          >
            <span className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-white/15">
                <ShoppingBag className="size-4" />
              </span>
              <span className="text-left">
                <span className="block font-label text-xs font-semibold">
                  {cart.itemCount} porsi · {cart.standCount} stand
                </span>
                <span className="block text-[11px] opacity-90">
                  Bisa gabung menu dari stand lain
                </span>
              </span>
            </span>
            <span className="flex items-center gap-2 font-label text-sm font-semibold">
              {rupiah(cart.total)}
              <ArrowRight className="size-4" />
            </span>
          </Link>
        </div>
      )}

      {/* Bagian Ulasan & Rating Pembeli Langsung pada Stand (Tahap 7) */}
      <section className="rounded-3xl bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Rating &amp; Ulasan Stand</h2>
            <p className="mt-0.5 text-xs text-on-surface-muted">
              Berikan penilaian dan ulasan Anda langsung untuk {toko.namaToko}.
            </p>
          </div>
          {reviews.length > 0 && (
            <div className="flex flex-wrap gap-1 rounded-full bg-surface p-1">
              {(["semua", 5, 4, 3, 2, 1] as const).map((s) => (
                <button
                  key={String(s)}
                  type="button"
                  onClick={() => setStarFilter(s)}
                  className={`rounded-full px-3 py-1 font-label text-xs font-medium transition-colors ${
                    starFilter === s
                      ? "bg-primary-strong text-on-primary"
                      : "text-on-surface-muted hover:bg-surface-variant"
                  }`}
                >
                  {s === "semua" ? "Semua" : `${s} ★`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Form Langsung Beri Rating & Ulasan Kantin */}
        <div className="mt-4 rounded-2xl bg-surface p-4 sm:p-5">
          <p className="font-headline text-sm font-semibold">
            Beri Rating &amp; Ulasan untuk {toko.namaToko}
          </p>

          <div className="mt-3 flex flex-col items-center rounded-2xl bg-white p-4">
            <div
              role="radiogroup"
              aria-label="Pilih rating bintang 1 sampai 5"
              className="flex items-center gap-2"
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const active = star <= inputRating;
                return (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={inputRating === star}
                    aria-label={`${star} bintang`}
                    onClick={() => setInputRating(star)}
                    className="rounded-full p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`size-8 ${
                        active ? "fill-primary text-primary" : "text-outline/40"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <span className="mt-2 rounded-full bg-primary-container px-3.5 py-1 font-label text-xs font-semibold text-primary-strong">
              {RATING_LABELS[inputRating]}
            </span>

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
                htmlFor={`ulasan-toko-${toko.id}`}
                className="font-label text-xs font-medium text-on-surface-muted"
              >
                Tulis Ulasan Anda (opsional)
              </label>
              <span className="font-label text-[11px] text-on-surface-muted">
                {inputKomentar.length}/500
              </span>
            </div>
            <textarea
              id={`ulasan-toko-${toko.id}`}
              rows={3}
              maxLength={500}
              value={inputKomentar}
              onChange={(e) => setInputKomentar(e.target.value)}
              placeholder="Bagikan pengalaman Anda mengenai rasa makanan, kebersihan, atau pelayanan di stand ini..."
              className="w-full rounded-2xl bg-white px-4 py-3 text-xs text-on-surface placeholder:text-outline"
            />
          </div>

          {reviewError && (
            <p
              role="alert"
              className="mt-2.5 rounded-xl bg-error/10 px-3.5 py-2.5 text-xs font-medium text-error"
            >
              {reviewError}
            </p>
          )}
          {reviewSuccess && (
            <p
              role="status"
              className="mt-2.5 flex items-center gap-2 rounded-xl bg-secondary-container px-3.5 py-2.5 text-xs font-medium text-secondary"
            >
              <CircleCheck className="size-4 shrink-0" />
              <span>{reviewSuccess}</span>
            </p>
          )}

          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleSendReview}
              disabled={reviewPending}
            >
              <Star className="size-3.5" />
              {reviewPending ? "Mengirim Ulasan..." : "Kirim Rating & Ulasan"}
            </Button>
          </div>
        </div>

        {reviews.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-surface px-4 py-8 text-center text-xs text-on-surface-muted">
            Belum ada ulasan untuk stand ini. Jadilah pembeli pertama yang memberikan ulasan di
            atas!
          </p>
        ) : (
          <>
            <div className="mt-4 grid gap-4 rounded-2xl bg-surface p-4 sm:grid-cols-[10rem_1fr] sm:items-center">
              <div className="text-center">
                <p className="font-headline text-4xl font-bold text-primary-strong">
                  {liveRating.toFixed(1)}
                </p>
                <div className="mt-1 flex justify-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`size-4 ${
                        i < Math.round(liveRating)
                          ? "fill-primary text-primary"
                          : "text-outline/40"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1 font-label text-[11px] text-on-surface-muted">
                  {reviews.length} Ulasan Pelanggan
                </p>
              </div>

              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter((r) => r.rating === star).length;
                  const pct =
                    reviews.length > 0
                      ? Math.round((count / reviews.length) * 100)
                      : 0;
                  return (
                    <div key={star} className="flex items-center gap-2.5 text-xs">
                      <span className="w-8 shrink-0 font-label font-medium text-on-surface-muted">
                        {star} ★
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-primary-strong"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-7 shrink-0 text-right font-label text-[11px] tabular-nums text-on-surface-muted">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {reviews
                .filter((r) => starFilter === "semua" || r.rating === starFilter)
                .map((r) => (
                  <li key={r.id} className="rounded-2xl bg-surface p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-headline text-sm font-semibold">
                        {r.namaPembeli}
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-white px-2.5 py-0.5 font-label text-xs font-bold text-primary-strong">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`size-3 ${
                              i < r.rating ? "fill-primary text-primary" : "text-outline/40"
                            }`}
                          />
                        ))}
                        <span className="ml-1">{r.rating}/5</span>
                      </span>
                    </div>
                    {r.komentar ? (
                      <p className="mt-2 text-xs leading-relaxed text-on-surface">
                        &ldquo;{r.komentar}&rdquo;
                      </p>
                    ) : (
                      <p className="mt-2 text-xs italic text-on-surface-muted">
                        Memberikan rating {r.rating} bintang tanpa komentar tertulis.
                      </p>
                    )}
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-on-surface-muted">
                      {r.menuNames.length > 0 ? (
                        <span className="truncate font-label">
                          Menu: {r.menuNames.join(", ")}
                        </span>
                      ) : (
                        <span className="font-label">Ulasan Stand</span>
                      )}
                      <span>
                        {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
                          new Date(r.createdAt),
                        )}
                      </span>
                    </div>
                  </li>
                ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
