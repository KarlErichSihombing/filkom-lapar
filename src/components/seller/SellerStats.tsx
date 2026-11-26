import Link from "next/link";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  BarChart,
  CircleCheck,
  CircleX,
  ShoppingBag,
  Star,
  Store,
  Utensils,
} from "@/components/ui/icons";
import { rupiah } from "@/lib/format";

type Props = {
  total: number;
  available: number;
  unavailable: number;
  rating: number;
  reviewCount?: number;
  totalTerjual?: number;
  saldoAktif?: number;
  activeOrders?: number;
};

/** Kartu ringkasan performa stand di Dashboard Penjual (100% dari data real database). */
export function SellerStats({
  total,
  available,
  unavailable,
  rating,
  reviewCount = 0,
  totalTerjual = 0,
  saldoAktif = 0,
  activeOrders = 0,
}: Props) {
  const ratio = total === 0 ? 0 : (available / total) * 100;

  const card = "flex flex-col justify-between rounded-3xl bg-white p-5 shadow-xs";
  const label = "font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-muted";
  const icon = "grid size-11 shrink-0 place-items-center rounded-2xl";

  return (
    <div className="space-y-3">
      {/* Banner peringatan pesanan aktif bila ada pesanan yang menunggu diproses */}
      {activeOrders > 0 && (
        <Link
          href="/dashboard/pesanan"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary-strong px-5 py-3.5 text-on-primary shadow-md transition-transform hover:scale-[1.005]"
        >
          <span className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-white/15">
              <ShoppingBag className="size-5" />
            </span>
            <span>
              <strong className="block font-headline text-sm font-bold">
                Ada {activeOrders} Pesanan Aktif Menunggu Diproses!
              </strong>
              <span className="block text-xs text-white/85">
                Klik di sini untuk membuka antrean dapur dan memperbarui status pesanan pembeli.
              </span>
            </span>
          </span>
          <span className="rounded-full bg-white px-4 py-1.5 font-label text-xs font-bold text-primary-strong">
            Buka Pesanan Masuk →
          </span>
        </Link>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <li className={card}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={label}>Katalog &amp; Penjualan</p>
              <p className="mt-1 font-headline text-3xl font-extrabold text-on-surface">
                {total} Menu
              </p>
            </div>
            <span className={`${icon} bg-primary-container text-primary-strong`}>
              <Utensils className="size-5" />
            </span>
          </div>
          <p className="mt-3 flex items-center justify-between border-t border-surface pt-2.5 text-xs text-on-surface-muted">
            <span>Total porsi terjual</span>
            <strong className="font-label text-primary-strong">{totalTerjual} Porsi</strong>
          </p>
        </li>

        <li className={card}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className={label}>Stok Siap Dijual</p>
              <p className="mt-1 font-headline text-3xl font-extrabold text-secondary">
                {available} Tersedia
              </p>
            </div>
            <span className={`${icon} bg-secondary-container text-secondary`}>
              <CircleCheck className="size-5" />
            </span>
          </div>
          <div className="mt-3 space-y-1.5">
            <ProgressBar
              value={ratio}
              label="Persentase menu tersedia"
              color="secondary"
            />
            <div className="flex items-center justify-between text-[11px] text-on-surface-muted">
              <span>{Math.round(ratio)}% siap dipesan</span>
              <span className="inline-flex items-center gap-1 text-error">
                <CircleX className="size-3" /> {unavailable} habis
              </span>
            </div>
          </div>
        </li>

        <li className={card}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={label}>Saldo Aktif Stand</p>
              <p className="mt-1 font-headline text-2xl font-extrabold text-primary-strong sm:text-3xl">
                {rupiah(saldoAktif)}
              </p>
            </div>
            <span className={`${icon} bg-secondary-container text-secondary`}>
              <Store className="size-5" />
            </span>
          </div>
          <Link
            href="/dashboard/pesanan"
            className="mt-3 flex items-center justify-between border-t border-surface pt-2.5 font-label text-xs font-semibold text-primary-strong hover:underline"
          >
            <span>Lihat mutasi &amp; antrean</span>
            <span>→</span>
          </Link>
        </li>

        <li className={card}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={label}>Rating &amp; Ulasan Stand</p>
              {rating > 0 ? (
                <div className="mt-1 flex items-baseline gap-1.5">
                  <p className="font-headline text-3xl font-extrabold text-on-surface">
                    {rating.toFixed(1)}
                  </p>
                  <span className="text-xs text-on-surface-muted">/ 5.0</span>
                </div>
              ) : (
                <p className="mt-2 font-headline text-lg font-bold text-on-surface-muted">
                  Belum ada
                </p>
              )}
            </div>
            <span className={`${icon} bg-tertiary-container text-tertiary-strong`}>
              <Star className="size-5 fill-amber-400 text-amber-400" />
            </span>
          </div>
          <Link
            href="/dashboard/laporan"
            className="mt-3 flex items-center justify-between border-t border-surface pt-2.5 font-label text-xs font-semibold text-tertiary-strong hover:underline"
          >
            <span className="inline-flex items-center gap-1">
              <BarChart className="size-3.5" /> {reviewCount} ulasan &amp; grafik
            </span>
            <span>→</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
