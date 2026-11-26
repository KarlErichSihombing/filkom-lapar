"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { kirimUlasanToko } from "@/actions/review";
import { useCart } from "@/components/buyer/CartProvider";
import { QtyStepper } from "@/components/buyer/QtyStepper";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  CircleCheck,
  Clock,
  ImageIcon,
  MapPin,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  Star,
  Store,
  Utensils,
} from "@/components/ui/icons";
import { pad2, rupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { KATEGORI_LABEL, type Kategori } from "@/types/menu";
import type {
  BestSellerItem,
  StandCard,
  StandMenuCard,
  StandReviewItem,
} from "@/types/toko";

const photoCols: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
};

type QuickFilter = "semua" | "hemat" | "rating" | "buka";

type LiveMenuRow = {
  id: string;
  toko_id: string;
  nama_menu: string;
  deskripsi: string | null;
  harga: number | string;
  kategori: Kategori;
  foto_url: string | null;
  tersedia: boolean;
  deleted_at: string | null;
};

type LiveTokoRow = {
  id: string;
  nama_toko?: string;
  buka?: boolean;
  foto_url?: string | null;
  rating_rata_rata?: number | null;
};

function StarRow({ rating, size = "size-3.5" }: { rating: number; size?: string }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`${size} ${
            i < rounded ? "fill-amber-400 text-amber-400" : "text-outline/30"
          }`}
        />
      ))}
    </span>
  );
}

const QUICK_REVIEW_TAGS = [
  "Rasa Enak & Pas",
  "Pelayanan Ramah",
  "Harga Terjangkau",
  "Penyajian Cepat",
  "Porsi Pas",
];

function KantinMenuRow({
  stand,
  menus,
  onReviewAdded,
}: {
  stand: StandCard;
  menus: StandMenuCard[];
  onReviewAdded: (tokoId: string, review: StandReviewItem, newAvg: number) => void;
}) {
  const cart = useCart();
  const scrollRef = useRef<HTMLUListElement>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [komentarInput, setKomentarInput] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [reviewPending, startReviewTransition] = useTransition();

  function scrollByDir(dir: -1 | 1) {
    scrollRef.current?.scrollBy({ left: dir * 310, behavior: "smooth" });
  }

  function addTag(tag: string) {
    setKomentarInput((prev) => {
      if (prev.toLowerCase().includes(tag.toLowerCase())) return prev;
      const sep = prev.trim().length > 0 ? ", " : "";
      return `${prev.trim()}${sep}${tag}`.slice(0, 500);
    });
  }

  function submitReview() {
    setReviewError(null);
    setReviewSuccess(null);
    startReviewTransition(async () => {
      const res = await kirimUlasanToko(stand.id, ratingInput, komentarInput);
      if (res.error) {
        setReviewError(res.error);
        return;
      }
      if (res.publicReview) {
        onReviewAdded(
          stand.id,
          {
            id: res.publicReview.id,
            namaPembeli: res.publicReview.namaPembeli,
            rating: res.publicReview.rating,
            komentar: res.publicReview.komentar,
            createdAt: res.publicReview.createdAt,
          },
          res.newAvgRating ?? stand.rating,
        );
      }
      setKomentarInput("");
      setRatingInput(5);
      setShowReviewForm(false);
      setReviewSuccess("Ulasan Anda berhasil ditambahkan!");
    });
  }

  const availableCount = stand.menu.filter((m) => m.tersedia).length;
  const displayedReviews = showAllReviews ? stand.reviews : stand.reviews.slice(0, 3);

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface pb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-full bg-primary-container px-3 py-1 font-label text-xs font-bold text-primary-strong">
            Stand {pad2(stand.noStand)}
          </span>
          <Link
            href={`/toko/${stand.id}`}
            className="font-headline text-xl font-bold text-on-surface hover:text-primary-strong"
          >
            {stand.namaToko}
          </Link>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-label text-[11px] font-semibold ${
              stand.buka
                ? "bg-secondary-container text-secondary"
                : "bg-inverted text-on-primary"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                stand.buka ? "bg-secondary-soft" : "bg-neutral"
              }`}
            />
            {stand.buka ? "Buka" : "Tutup"}
          </span>

          {/* Bintang Rating & Jumlah Ulasan Kantin */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 font-label text-xs font-semibold text-on-surface">
            <StarRow rating={stand.rating} size="size-3.5" />
            <span>
              {stand.rating > 0 ? stand.rating.toFixed(1) : "0.0"}
            </span>
            <span className="font-normal text-on-surface-muted">
              ({stand.reviewCount} ulasan)
            </span>
          </span>

          <span className="font-label text-xs text-on-surface-muted">
            · {availableCount} menu siap
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowReviewForm((v) => !v);
              setReviewSuccess(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-3.5 py-2 font-label text-xs font-semibold text-primary-strong transition-colors hover:brightness-95"
          >
            <Star className="size-3.5 fill-primary text-primary" />
            {showReviewForm ? "Tutup Form" : "Beri Rating & Ulasan"}
          </button>

          {menus.length > 2 && (
            <div className="hidden items-center gap-1 sm:flex">
              <button
                type="button"
                onClick={() => scrollByDir(-1)}
                aria-label={`Geser menu ${stand.namaToko} ke kiri`}
                className="grid size-8 place-items-center rounded-full bg-surface text-on-surface-muted transition-colors hover:bg-surface-variant"
              >
                <ArrowLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollByDir(1)}
                aria-label={`Geser menu ${stand.namaToko} ke kanan`}
                className="grid size-8 place-items-center rounded-full bg-surface text-on-surface-muted transition-colors hover:bg-surface-variant"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          )}

          <Link
            href={`/toko/${stand.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 font-label text-xs font-semibold text-primary-strong transition-colors hover:bg-primary-container"
          >
            Lihat Selengkapnya
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* Baris menu per kantin yang bisa digeser kanan-kiri */}
      <ul
        ref={scrollRef}
        className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
      >
        {menus.map((m) => {
          const qty = cart.qtyOf(m.id);
          const canOrder = stand.buka && m.tersedia;

          return (
            <li
              key={m.id}
              className="flex w-64 shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-surface/60 p-3 ring-1 ring-surface-variant/70 transition-shadow hover:shadow-md sm:w-72"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white text-outline">
                {m.fotoUrl ? (
                  <Image
                    src={m.fotoUrl}
                    alt={m.namaMenu}
                    fill
                    sizes="288px"
                    className={`object-cover ${m.tersedia ? "" : "grayscale"}`}
                  />
                ) : (
                  <div className="grid size-full place-items-center">
                    <ImageIcon className="size-9" />
                  </div>
                )}

                <span
                  className={`absolute right-2 top-2 rounded-full px-2.5 py-0.5 font-label text-[10px] font-semibold shadow-sm ${
                    m.tersedia
                      ? "bg-secondary-container text-secondary"
                      : "bg-error text-on-primary"
                  }`}
                >
                  {m.tersedia ? "Tersedia" : "Habis"}
                </span>

                <span className="absolute bottom-2 left-2 max-w-[85%] truncate rounded-full bg-white/95 px-2.5 py-0.5 font-label text-[10px] font-semibold text-on-surface shadow-sm">
                  Stand {pad2(stand.noStand)} · {stand.namaToko}
                </span>
              </div>

              <div className="mt-3 flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h4
                    className={`line-clamp-1 font-headline text-base font-bold ${
                      m.tersedia ? "text-on-surface" : "text-on-surface-muted"
                    }`}
                  >
                    {m.namaMenu}
                  </h4>
                  {m.terjual > 0 && (
                    <span className="shrink-0 rounded-full bg-primary-container px-2 py-0.5 font-label text-[10px] font-semibold text-primary-strong">
                      {m.terjual}× terjual
                    </span>
                  )}
                </div>

                <p className="mt-1 line-clamp-2 text-xs text-on-surface-muted">
                  {m.deskripsi || `${KATEGORI_LABEL[m.kategori]} di ${stand.namaToko}`}
                </p>

                <div className="mt-auto flex items-end justify-between gap-2 pt-3.5">
                  <div>
                    <span className="block font-label text-[10px] text-on-surface-muted">
                      Harga Satuan
                    </span>
                    <span className="font-headline text-lg font-extrabold text-primary-strong">
                      {rupiah(m.harga)}
                    </span>
                  </div>

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
                          tokoId: stand.id,
                          namaMenu: m.namaMenu,
                          harga: m.harga,
                          fotoUrl: m.fotoUrl,
                          namaToko: stand.namaToko,
                          noStand: stand.noStand,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary-strong px-4 py-2 font-label text-xs font-semibold text-on-primary shadow-sm transition-colors hover:brightness-110 disabled:pointer-events-none disabled:bg-surface-variant disabled:text-on-surface-muted"
                    >
                      <span>Tambah</span>
                      <ShoppingBag className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Form Tambah Rating & Ulasan Langsung di Dashboard Pembeli */}
      {showReviewForm && (
        <div className="mt-4 rounded-2xl bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-headline text-sm font-bold text-on-surface">
              Beri Rating &amp; Ulasan untuk {stand.namaToko}
            </p>
            <div
              role="radiogroup"
              aria-label={`Pilih bintang untuk ${stand.namaToko}`}
              className="flex items-center gap-1 rounded-full bg-white px-3 py-1"
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingInput(star)}
                  aria-label={`${star} bintang`}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={`size-5 ${
                      star <= ratingInput
                        ? "fill-amber-400 text-amber-400"
                        : "text-outline/35"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-1.5 font-label text-xs font-bold text-primary-strong">
                {ratingInput}/5
              </span>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {QUICK_REVIEW_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="rounded-full bg-white px-2.5 py-1 font-label text-[11px] font-medium text-on-surface-muted hover:bg-surface-variant"
              >
                + {tag}
              </button>
            ))}
          </div>

          <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              maxLength={500}
              value={komentarInput}
              onChange={(e) => setKomentarInput(e.target.value)}
              placeholder={`Tulis pengalaman makan atau pelayanan di ${stand.namaToko}...`}
              className="min-w-0 flex-1 rounded-full bg-white px-4 py-2.5 text-xs text-on-surface placeholder:text-outline"
            />
            <Button
              type="button"
              size="sm"
              onClick={submitReview}
              disabled={reviewPending}
            >
              {reviewPending ? "Mengirim..." : "Kirim Ulasan"}
            </Button>
          </div>

          {reviewError && (
            <p role="alert" className="mt-2 text-xs font-medium text-error">
              {reviewError}
            </p>
          )}
        </div>
      )}

      {reviewSuccess && (
        <p
          role="status"
          className="mt-3 flex items-center gap-2 rounded-2xl bg-secondary-container px-4 py-2.5 text-xs font-medium text-secondary"
        >
          <CircleCheck className="size-4 shrink-0" />
          <span>{reviewSuccess}</span>
        </p>
      )}

      {/* Daftar Ulasan Pembeli untuk Kantin Ini */}
      <div className="mt-4 rounded-2xl bg-surface/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StarRow rating={stand.rating} size="size-4" />
            <span className="font-headline text-sm font-bold text-on-surface">
              Ulasan Pembeli ({stand.reviewCount})
            </span>
            {stand.rating > 0 && (
              <span className="rounded-full bg-white px-2.5 py-0.5 font-label text-xs font-bold text-primary-strong">
                Rata-rata {stand.rating.toFixed(1)} / 5.0
              </span>
            )}
          </div>

          {stand.reviews.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllReviews((v) => !v)}
              className="font-label text-xs font-semibold text-primary-strong hover:underline"
            >
              {showAllReviews
                ? "Sembunyikan sebagian"
                : `Lihat semua ${stand.reviews.length} ulasan`}
            </button>
          )}
        </div>

        {stand.reviews.length === 0 ? (
          <p className="mt-2 text-xs text-on-surface-muted">
            Belum ada ulasan untuk {stand.namaToko}. Klik{" "}
            <button
              type="button"
              onClick={() => setShowReviewForm(true)}
              className="font-semibold text-primary-strong underline"
            >
              Beri Rating &amp; Ulasan
            </button>{" "}
            untuk menjadi pengulas pertama!
          </p>
        ) : (
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-3">
            {displayedReviews.map((rev) => (
              <li
                key={rev.id}
                className="flex flex-col justify-between rounded-xl bg-white p-3 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-headline text-xs font-bold text-on-surface">
                      {rev.namaPembeli}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-0.5 font-label text-[11px] font-bold text-primary-strong">
                      <StarRow rating={rev.rating} size="size-3" />
                      <span className="ml-0.5">{rev.rating}/5</span>
                    </span>
                  </div>
                  {rev.komentar ? (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-on-surface-muted">
                      &ldquo;{rev.komentar}&rdquo;
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[11px] italic text-on-surface-muted">
                      Memberi rating {rev.rating} bintang.
                    </p>
                  )}
                </div>
                <span className="mt-2 block text-right font-label text-[10px] text-outline">
                  {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
                    new Date(rev.createdAt),
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function TokoList({
  stands: initialStands,
  initialBestSeller = null,
}: {
  stands: StandCard[];
  initialBestSeller?: BestSellerItem | null;
}) {
  const cart = useCart();
  const [stands, setStands] = useState(initialStands);
  const [query, setQuery] = useState("");
  const [kategori, setKategori] = useState<"semua" | Kategori>("semua");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("semua");
  const menuSectionRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("beranda-katalog")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            if (id) {
              setStands((prev) =>
                prev.map((s) => ({ ...s, menu: s.menu.filter((m) => m.id !== id) })),
              );
            }
            return;
          }
          const row = payload.new as unknown as LiveMenuRow;
          setStands((prev) =>
            prev.map((s) => {
              if (row.deleted_at) {
                return { ...s, menu: s.menu.filter((m) => m.id !== row.id) };
              }
              if (s.id !== row.toko_id) return s;
              const existing = s.menu.find((m) => m.id === row.id);
              const item: StandMenuCard = {
                id: row.id,
                namaMenu: row.nama_menu,
                deskripsi: row.deskripsi ?? existing?.deskripsi ?? null,
                harga: Number(row.harga ?? existing?.harga ?? 0),
                kategori: row.kategori ?? existing?.kategori ?? "makanan",
                fotoUrl: row.foto_url,
                tersedia: row.tersedia,
                terjual: existing?.terjual ?? 0,
              };
              return existing
                ? { ...s, menu: s.menu.map((m) => (m.id === item.id ? item : m)) }
                : { ...s, menu: [...s.menu, item] };
            }),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "toko" },
        (payload) => {
          const row = payload.new as unknown as LiveTokoRow;
          setStands((prev) =>
            prev
              .map((s) =>
                s.id === row.id
                  ? {
                      ...s,
                      buka: row.buka ?? s.buka,
                      fotoUrl: row.foto_url === undefined ? s.fotoUrl : row.foto_url,
                      namaToko: row.nama_toko ?? s.namaToko,
                      rating:
                        row.rating_rata_rata === undefined
                          ? s.rating
                          : Number(row.rating_rata_rata ?? 0),
                    }
                  : s,
              )
              .sort((a, b) => Number(b.buka) - Number(a.buka) || a.noStand - b.noStand),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Hitung Best Seller real secara reaktif dari data stands
  const bestSeller = useMemo<BestSellerItem | null>(() => {
    const candidates: BestSellerItem[] = [];
    for (const s of stands) {
      const menuTersediaStand = s.menu.filter((m) => m.tersedia).length;
      for (const m of s.menu) {
        candidates.push({
          menuId: m.id,
          namaMenu: m.namaMenu,
          deskripsi: m.deskripsi,
          harga: m.harga,
          kategori: m.kategori,
          fotoUrl: m.fotoUrl,
          tersedia: m.tersedia,
          terjual: m.terjual,
          tokoId: s.id,
          namaToko: s.namaToko,
          noStand: s.noStand,
          buka: s.buka,
          rating: s.rating,
          menuTersediaStand,
        });
      }
    }
    if (candidates.length === 0) return initialBestSeller;
    candidates.sort(
      (a, b) =>
        Number(b.buka && b.tersedia) - Number(a.buka && a.tersedia) ||
        b.terjual - a.terjual ||
        b.rating - a.rating ||
        Number(Boolean(b.fotoUrl)) - Number(Boolean(a.fotoUrl)),
    );
    return candidates[0] ?? initialBestSeller;
  }, [stands, initialBestSeller]);

  // Jumlah menu real per kategori
  const categoryCounts = useMemo(() => {
    let semua = 0;
    let makanan = 0;
    let minuman = 0;
    let camilan = 0;
    for (const s of stands) {
      for (const m of s.menu) {
        semua += 1;
        if (m.kategori === "makanan") makanan += 1;
        else if (m.kategori === "minuman") minuman += 1;
        else if (m.kategori === "camilan") camilan += 1;
      }
    }
    return { semua, makanan, minuman, camilan };
  }, [stands]);

  const openStandCount = useMemo(
    () => stands.filter((s) => s.buka).length,
    [stands],
  );

  // Filter daftar stand untuk bagian "Pilih Langsung dari Stand Favorit"
  const visibleStands = useMemo(
    () =>
      stands.filter((s) => {
        if (quickFilter === "buka" && !s.buka) return false;
        if (quickFilter === "rating" && s.rating < 4.5) return false;
        if (!q) return true;
        return (
          s.namaToko.toLowerCase().includes(q) ||
          `stand ${pad2(s.noStand)}`.includes(q) ||
          s.menu.some((m) => m.namaMenu.toLowerCase().includes(q))
        );
      }),
    [stands, q, quickFilter],
  );

  // Filter baris kantin & daftar menu per kantin
  const kantinMenuRows = useMemo(() => {
    return stands
      .filter((s) => {
        if (quickFilter === "buka" && !s.buka) return false;
        if (quickFilter === "rating" && s.rating < 4.5) return false;
        return true;
      })
      .map((s) => {
        const standMatchesQuery =
          !q ||
          s.namaToko.toLowerCase().includes(q) ||
          `stand ${pad2(s.noStand)}`.includes(q);

        const filteredMenus = s.menu.filter((m) => {
          if (kategori !== "semua" && m.kategori !== kategori) return false;
          if (quickFilter === "hemat" && m.harga > 15_000) return false;
          if (!q) return true;
          return standMatchesQuery || m.namaMenu.toLowerCase().includes(q);
        });

        return { stand: s, menus: filteredMenus };
      })
      .filter((row) => row.menus.length > 0);
  }, [stands, kategori, quickFilter, q]);

  const totalFilteredMenus = useMemo(
    () => kantinMenuRows.reduce((acc, r) => acc + r.menus.length, 0),
    [kantinMenuRows],
  );

  function handleReviewAdded(
    tokoId: string,
    review: StandReviewItem,
    newAvg: number,
  ) {
    setStands((prev) =>
      prev.map((s) => {
        if (s.id !== tokoId) return s;
        const nextReviews = [review, ...s.reviews];
        const nextCount = s.reviewCount + 1;
        const sum = nextReviews.reduce((acc, r) => acc + r.rating, 0);
        const avg =
          newAvg > 0 ? newAvg : Number((sum / Math.max(1, nextReviews.length)).toFixed(1));
        return {
          ...s,
          rating: avg,
          reviewCount: nextCount,
          reviews: nextReviews,
        };
      }),
    );
  }

  return (
    <div className="space-y-8">
      {/* Strip status hijau Kantin GKM */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-secondary px-4 py-2.5 font-label text-[11px] font-medium text-on-primary shadow-sm">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-secondary-container" />
          <strong>KANTIN GKM FILKOM UB</strong>
          <span className="opacity-85">
            · {openStandCount} dari {stands.length} Stand Sedang Buka
          </span>
        </span>
        <span className="hidden opacity-90 md:inline">
          ⚡ Pesanan Mandiri via QRIS Xendit · Bebas Antri Pas Jam Ganti Kuliah
        </span>
        <span className="flex items-center gap-1.5 opacity-90">
          <Clock className="size-3.5" />
          Status Real-Time &amp; Notifikasi Aktif
        </span>
      </div>

      {/* [01] HERO BANNER + KARTU BEST SELLER REAL */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#b33a00] via-[#d94b12] to-[#f05a22] p-6 text-on-primary shadow-xl shadow-primary/15 sm:p-9">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 font-label text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm">
              <span className="size-2 rounded-full bg-secondary-container" />
              [01] Smart Canteen GKM FILKOM UB
            </span>

            <h1 className="mt-5 font-headline text-4xl font-extrabold uppercase leading-[1.05] tracking-tight sm:text-5xl">
              Cita Rasa Kantin,
              <span className="mt-1.5 block">
                <span className="inline-block rounded-xl bg-[#65a30d] px-3.5 py-1 text-white shadow-sm">
                  Bebas Antri!
                </span>
              </span>
            </h1>

            <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/90">
              Pesan duluan saat dosen tutup slide kuliah. Makanan siap hangat di meja
              stand Kantin GKM waktu bel berbunyi.
            </p>

            {/* Kolom Pencarian Menu / Stand */}
            <div className="mt-6 flex items-center gap-2 rounded-full bg-white p-1.5 pl-4 shadow-lg">
              <Search className="size-4 shrink-0 text-outline" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Cari menu atau stand di Kantin GKM"
                placeholder="Cari nasi ayam, geprek pedas, mie, kopi susu..."
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-on-surface placeholder:text-outline focus:outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  menuSectionRef.current?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-5 py-2.5 font-label text-xs font-semibold text-on-primary transition-colors hover:brightness-110"
              >
                Cari Menu
                <ArrowRight className="size-3.5" />
              </button>
            </div>

            {/* Filter Cepat Favorit Mahasiswa (Data Real) */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-label text-[11px] font-semibold text-white/85">
                Filter Cepat:
              </span>
              {(
                [
                  { id: "semua", label: "Semua Menu" },
                  { id: "hemat", label: "< Rp 15.000" },
                  { id: "rating", label: "★ Rating 4.5+" },
                  { id: "buka", label: "⚡ Stand Buka" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    setQuickFilter((prev) => (prev === f.id ? "semua" : f.id))
                  }
                  className={`rounded-full px-3 py-1 font-label text-[11px] font-semibold transition-colors ${
                    quickFilter === f.id
                      ? "bg-white text-primary-strong shadow-sm"
                      : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kartu Rekomendasi Best Seller (100% Data Real Database) */}
          {bestSeller ? (
            <div className="rounded-3xl bg-white p-3.5 text-on-surface shadow-2xl">
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-surface">
                {bestSeller.fotoUrl ? (
                  <Image
                    src={bestSeller.fotoUrl}
                    alt={bestSeller.namaMenu}
                    fill
                    sizes="(min-width:1024px) 420px, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-outline">
                    <Utensils className="size-12" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-label text-[10px] font-bold uppercase tracking-wider text-on-primary shadow-sm">
                  <span className="size-1.5 rounded-full bg-secondary-container" />
                  {bestSeller.terjual > 0
                    ? `Best Seller · ${bestSeller.terjual} Porsi Terjual`
                    : "Rekomendasi Menu Kantin GKM"}
                </span>

                <Link
                  href={`/toko/${bestSeller.tokoId}`}
                  className="absolute right-3 top-3 rounded-full bg-black/55 px-3 py-1 font-label text-[11px] font-semibold text-white backdrop-blur-sm hover:bg-black/75"
                >
                  Stand {pad2(bestSeller.noStand)} →
                </Link>

                <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3 text-white">
                  <div className="min-w-0">
                    <p className="font-label text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      Stand {pad2(bestSeller.noStand)} · {bestSeller.namaToko}
                    </p>
                    <h2 className="truncate font-headline text-xl font-bold leading-snug">
                      {bestSeller.namaMenu}
                    </h2>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block font-label text-[10px] text-white/80">
                      Harga
                    </span>
                    <span className="font-headline text-xl font-extrabold text-white">
                      {rupiah(bestSeller.harga)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-surface px-2 py-2.5">
                  <span className="block font-label text-[9px] uppercase tracking-wider text-on-surface-muted">
                    Status Stand
                  </span>
                  <strong
                    className={`mt-0.5 block font-headline text-xs font-bold ${
                      bestSeller.buka ? "text-secondary" : "text-error"
                    }`}
                  >
                    {bestSeller.buka ? "Sedang Buka" : "Tutup"}
                  </strong>
                </div>

                <div className="rounded-2xl bg-surface px-2 py-2.5">
                  <span className="block font-label text-[9px] uppercase tracking-wider text-on-surface-muted">
                    Total Terjual
                  </span>
                  <strong className="mt-0.5 block font-headline text-xs font-bold text-primary-strong">
                    {bestSeller.terjual} Porsi
                  </strong>
                </div>

                <div className="rounded-2xl bg-surface px-2 py-2.5">
                  <span className="block font-label text-[9px] uppercase tracking-wider text-on-surface-muted">
                    Rating Stand
                  </span>
                  <strong className="mt-0.5 block font-headline text-xs font-bold text-on-surface">
                    {bestSeller.rating > 0 ? `${bestSeller.rating.toFixed(1)} ★` : "Baru ★"}
                  </strong>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <Link
                  href={`/toko/${bestSeller.tokoId}`}
                  className="rounded-full bg-surface px-4 py-2 font-label text-xs font-semibold text-on-surface hover:bg-surface-variant"
                >
                  Lihat Stand
                </Link>
                {cart.qtyOf(bestSeller.menuId) > 0 ? (
                  <QtyStepper
                    qty={cart.qtyOf(bestSeller.menuId)}
                    label={bestSeller.namaMenu}
                    onMinus={() => cart.decrement(bestSeller.menuId)}
                    onPlus={() => cart.increment(bestSeller.menuId)}
                    plusDisabled={!bestSeller.buka || !bestSeller.tersedia}
                  />
                ) : (
                  <button
                    type="button"
                    disabled={!bestSeller.buka || !bestSeller.tersedia}
                    onClick={() =>
                      cart.add({
                        menuId: bestSeller.menuId,
                        tokoId: bestSeller.tokoId,
                        namaMenu: bestSeller.namaMenu,
                        harga: bestSeller.harga,
                        fotoUrl: bestSeller.fotoUrl,
                        namaToko: bestSeller.namaToko,
                        noStand: bestSeller.noStand,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary-strong px-4 py-2 font-label text-xs font-semibold text-on-primary transition-colors hover:brightness-110 disabled:opacity-50"
                  >
                    <Plus className="size-3.5" />
                    Pesan Best Seller
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-white/10 p-6 text-center backdrop-blur-sm">
              <Utensils className="mx-auto size-10 text-white/80" />
              <p className="mt-2 font-headline text-base font-semibold">
                Belum Ada Menu Terdaftar
              </p>
              <p className="mt-1 text-xs text-white/80">
                Rekomendasi Best Seller akan muncul otomatis dari menu stand yang paling
                banyak dipesan.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* [02] KATEGORI PILIHAN (Data Real) */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-label text-xs text-on-surface-muted">
            <strong className="uppercase tracking-wider text-on-surface">
              [02] Kategori Pilihan
            </strong>{" "}
            / Klik untuk menyaring santapan
          </p>
          {(kategori !== "semua" || quickFilter !== "semua" || q) && (
            <button
              type="button"
              onClick={() => {
                setKategori("semua");
                setQuickFilter("semua");
                setQuery("");
              }}
              className="font-label text-xs font-semibold text-primary-strong hover:underline"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div
          role="radiogroup"
          aria-label="Filter kategori santapan"
          className="flex flex-wrap gap-2"
        >
          {(
            [
              { key: "semua", label: "Semua Menu", count: categoryCounts.semua },
              { key: "makanan", label: "Makanan", count: categoryCounts.makanan },
              { key: "minuman", label: "Minuman", count: categoryCounts.minuman },
              { key: "camilan", label: "Camilan", count: categoryCounts.camilan },
            ] as const
          ).map((item) => {
            const active = kategori === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setKategori(item.key)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-label text-xs font-semibold transition-all ${
                  active
                    ? "bg-primary-strong text-on-primary shadow-sm"
                    : "bg-white text-on-surface hover:bg-surface"
                }`}
              >
                <Utensils className="size-3.5" />
                <span>{item.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                    active
                      ? "bg-white/20 text-on-primary"
                      : "bg-surface text-primary-strong"
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* TENANT KANTIN AKTIF GKM FILKOM — Pilih Langsung dari Stand Favorit */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="flex items-center gap-1.5 font-label text-[11px] font-bold uppercase tracking-wider text-primary-strong">
              <Store className="size-3.5" />
              Tenant Kantin Aktif GKM FILKOM
            </p>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
              Pilih Langsung dari Stand Favorit
            </h2>
          </div>
          <p className="font-label text-xs text-on-surface-muted">
            Semua tenant mendukung pembayaran QRIS Xendit
          </p>
        </div>

        {/* Bar Ringkasan Keranjang Gelap (sesuai mockup) bila ada item di keranjang */}
        {cart.itemCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-inverted px-5 py-3.5 text-on-primary shadow-xl">
            <div className="flex items-center gap-3">
              <span className="relative grid size-10 place-items-center rounded-xl bg-primary-strong text-on-primary">
                <ShoppingBag className="size-5" />
                <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-extrabold text-on-surface">
                  {cart.itemCount}
                </span>
              </span>
              <div>
                <p className="flex flex-wrap items-center gap-2 font-label text-xs font-semibold">
                  <span>{cart.itemCount} Porsi terpilih</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-on-primary">
                    {cart.standCount} Stand Kantin
                  </span>
                </p>
                <p className="text-xs text-white/80">
                  Total: <strong className="font-headline text-sm text-white">{rupiah(cart.total)}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/keranjang"
                className="rounded-full bg-white/15 px-4 py-2 font-label text-xs font-semibold text-white transition-colors hover:bg-white/25"
              >
                Detail Pesanan
              </Link>
              <Link
                href="/checkout"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-strong px-4 py-2 font-label text-xs font-semibold text-on-primary transition-colors hover:brightness-110"
              >
                Checkout QRIS
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        )}

        {visibleStands.length === 0 ? (
          <p className="rounded-3xl bg-surface px-5 py-12 text-center text-sm text-on-surface-muted">
            {stands.length === 0
              ? "Belum ada stand yang aktif."
              : "Tidak ada stand yang cocok dengan filter ini."}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visibleStands.map((s) => {
              const photos = s.menu.filter((m) => m.fotoUrl).slice(0, 3);
              const available = s.menu.filter((m) => m.tersedia).length;
              const menuPreview =
                s.menu.length > 0
                  ? s.menu.map((m) => m.namaMenu).join(", ")
                  : "Belum ada menu terdaftar di stand ini.";

              return (
                <li key={s.id}>
                  <Link
                    href={`/toko/${s.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br from-primary-container to-surface-variant">
                      {s.fotoUrl ? (
                        <Image
                          src={s.fotoUrl}
                          alt={s.namaToko}
                          fill
                          sizes="(min-width:1024px) 260px, (min-width:640px) 45vw, 100vw"
                          className={`object-cover ${s.buka ? "" : "grayscale"}`}
                        />
                      ) : photos.length > 0 ? (
                        <div
                          className={`grid size-full gap-0.5 ${photoCols[photos.length]} ${
                            s.buka ? "" : "grayscale"
                          }`}
                        >
                          {photos.map((m) => (
                            <div key={m.id} className="relative">
                              <Image
                                src={m.fotoUrl!}
                                alt=""
                                fill
                                sizes="240px"
                                className="object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid size-full place-items-center text-primary-strong/40">
                          <Store className="size-10" />
                        </div>
                      )}

                      <span
                        className={`absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full px-2.5 py-1 font-label text-[10px] font-bold shadow-sm ${
                          s.buka
                            ? "bg-secondary text-on-primary"
                            : "bg-inverted text-on-primary"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            s.buka ? "bg-secondary-container" : "bg-neutral"
                          }`}
                        />
                        {s.buka ? "Buka" : "Tutup"}
                      </span>

                      <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-0.5 font-label text-[11px] font-bold text-on-surface shadow-sm">
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                        {s.rating > 0 ? s.rating.toFixed(1) : "Baru"}
                        {s.reviewCount > 0 && (
                          <span className="font-normal text-on-surface-muted">
                            ({s.reviewCount})
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-1 flex-col px-1">
                      <p className="font-label text-[10px] font-bold uppercase tracking-wider text-primary-strong">
                        Stand No. {pad2(s.noStand)}
                      </p>
                      <h3 className="mt-0.5 truncate font-headline text-base font-bold text-on-surface group-hover:text-primary-strong">
                        {s.namaToko}
                      </h3>

                      {/* Baris Bintang Rating & Jumlah Ulasan di Kartu Stand */}
                      <div className="mt-1 flex items-center gap-1.5">
                        <StarRow rating={s.rating} size="size-3.5" />
                        <span className="font-label text-xs font-bold text-on-surface">
                          {s.rating > 0 ? s.rating.toFixed(1) : "0.0"}
                        </span>
                        <span className="font-label text-[11px] text-on-surface-muted">
                          ({s.reviewCount} ulasan)
                        </span>
                      </div>

                      <p className="mt-1.5 line-clamp-2 text-xs text-on-surface-muted">
                        {menuPreview}
                      </p>

                      {/* Cuplikan Ulasan Terbaru di Kartu Stand */}
                      {s.reviews[0] ? (
                        <div className="mt-2.5 rounded-xl bg-surface px-2.5 py-2 text-[11px]">
                          <p className="line-clamp-2 italic text-on-surface">
                            &ldquo;
                            {s.reviews[0].komentar ||
                              `Memberi rating ${s.reviews[0].rating} bintang`}
                            &rdquo;
                          </p>
                          <p className="mt-0.5 font-label text-[10px] font-semibold text-primary-strong">
                            — {s.reviews[0].namaPembeli} ({s.reviews[0].rating}★)
                          </p>
                        </div>
                      ) : (
                        <p className="mt-2.5 rounded-xl bg-surface/60 px-2.5 py-1.5 text-[11px] italic text-on-surface-muted">
                          Belum ada ulasan pembeli
                        </p>
                      )}

                      <div className="mt-auto flex items-center justify-between border-t border-surface pt-3 text-[11px] font-medium text-on-surface-muted">
                        <span>Stand #{pad2(s.noStand)}</span>
                        <span className="font-label font-semibold text-primary-strong">
                          {available} Menu Siap
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* [03] DAFTAR MENU PER KANTIN (Baris 1 = Kantin 1, Baris 2 = Kantin 2, geser kanan-kiri + Lihat Selengkapnya) */}
      <section ref={menuSectionRef} className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-label text-[11px] font-bold uppercase tracking-wider text-primary-strong">
              [03] Daftar Menu Per Stand Kantin
            </p>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
              Langsung Pilih &amp; Masukkan Keranjang
            </h2>
          </div>
          <p className="font-label text-xs text-on-surface-muted">
            Menampilkan <strong>{totalFilteredMenus} Menu</strong> dari{" "}
            <strong>{kantinMenuRows.length} Stand</strong> · Geser ke samping per stand
          </p>
        </div>

        {kantinMenuRows.length === 0 ? (
          <p className="rounded-3xl bg-surface px-5 py-12 text-center text-sm text-on-surface-muted">
            Tidak ada menu yang cocok dengan pencarian atau filter kategori ini.
          </p>
        ) : (
          <div className="space-y-5">
            {kantinMenuRows.map(({ stand, menus }) => (
              <KantinMenuRow
                key={stand.id}
                stand={stand}
                menus={menus}
                onReviewAdded={handleReviewAdded}
              />
            ))}
          </div>
        )}
      </section>

      {/* [04] CARA PESAN PRAKTIS */}
      <section className="rounded-[2rem] bg-surface p-6 sm:p-8">
        <p className="font-label text-[11px] font-bold uppercase tracking-wider text-primary-strong">
          [04] Cara Pesan Praktis
        </p>
        <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
          Tanpa Kartu Mahasiswa Antre Berdiri
        </h2>
        <p className="mt-1 text-xs text-on-surface-muted">
          Sistem terhubung langsung secara real-time dengan masing-masing stand Kantin GKM
          FILKOM UB.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5">
            <span className="grid size-8 place-items-center rounded-full bg-primary-strong font-label text-xs font-bold text-on-primary">
              1
            </span>
            <h3 className="mt-3 font-headline text-base font-bold">Pilih Menu</h3>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-muted">
              Bisa campur makanan dan minuman dari beberapa stand kantin sekaligus dalam 1
              keranjang pesanan.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5">
            <span className="grid size-8 place-items-center rounded-full bg-secondary font-label text-xs font-bold text-on-primary">
              2
            </span>
            <h3 className="mt-3 font-headline text-base font-bold">Scan QRIS</h3>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-muted">
              Bayar praktis lewat satu kode QRIS Xendit menggunakan e-wallet atau m-banking
              pilihanmu.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5">
            <span className="grid size-8 place-items-center rounded-full bg-[#65a30d] font-label text-xs font-bold text-white">
              3
            </span>
            <h3 className="mt-3 font-headline text-base font-bold">Ambil di Stand</h3>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-muted">
              Datang ke counter stand di Kantin GKM saat notifikasi pesananmu berubah menjadi
              &ldquo;Siap Diambil&rdquo;.
            </p>
          </div>
        </div>
      </section>

      {/* Footer Kantin GKM */}
      <footer className="rounded-3xl bg-white p-6 text-xs text-on-surface-muted sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-sm">
            <p className="flex items-center gap-2 font-headline text-lg font-bold text-primary-strong">
              FILKOM Lapar
              <span className="rounded-full bg-secondary-container px-2.5 py-0.5 font-label text-[10px] font-semibold text-secondary">
                Kantin GKM
              </span>
            </p>
            <p className="mt-2 leading-relaxed">
              Layanan pesan makanan dan minuman mandiri di Kantin GKM Fakultas Ilmu
              Komputer, Universitas Brawijaya.
            </p>
            <p className="mt-3 flex items-center gap-1.5 font-semibold text-on-surface">
              <MapPin className="size-4 text-primary-strong" />
              Kantin GKM FILKOM UB, Jl. Veteran Malang
            </p>
          </div>

          <div className="flex flex-wrap gap-8">
            <div>
              <h4 className="font-label font-bold uppercase tracking-wider text-on-surface">
                Navigasi Cepat
              </h4>
              <ul className="mt-2.5 space-y-2">
                <li>
                  <Link href="/beranda" className="hover:text-primary-strong">
                    Daftar Stand Kantin
                  </Link>
                </li>
                <li>
                  <Link href="/keranjang" className="hover:text-primary-strong">
                    Keranjang Multi-Stand
                  </Link>
                </li>
                <li>
                  <Link href="/pesanan" className="hover:text-primary-strong">
                    Lacak Pesanan Real-Time
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-label font-bold uppercase tracking-wider text-on-surface">
                Pembayaran &amp; Layanan
              </h4>
              <ul className="mt-2.5 space-y-2">
                <li className="flex items-center gap-1.5">
                  <QrCode className="size-3.5 text-secondary" />
                  QRIS Dinamis Xendit
                </li>
                <li>Perlindungan Batal 10 Detik</li>
                <li>Notifikasi Real-Time Stand</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
