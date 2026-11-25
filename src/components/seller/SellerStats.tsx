import { ProgressBar } from "@/components/ui/ProgressBar";
import { CircleCheck, CircleX, Star, Utensils } from "@/components/ui/icons";

type Props = {
  total: number;
  available: number;
  unavailable: number;
  rating: number;
};

/** Semua angka dihitung dari tabel menu dan toko, bukan data contoh. */
export function SellerStats({ total, available, unavailable, rating }: Props) {
  const ratio = total === 0 ? 0 : (available / total) * 100;

  const card = "flex items-start justify-between rounded-3xl bg-white p-5";
  const label = "font-label text-[11px] uppercase tracking-wider text-on-surface-muted";
  const icon = "grid size-11 place-items-center rounded-2xl";

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <li className={card}>
        <div>
          <p className={label}>Total menu</p>
          <p className="mt-1 font-headline text-3xl font-semibold">{total} Menu</p>
        </div>
        <span className={`${icon} bg-primary-container text-primary-strong`}>
          <Utensils className="size-5" />
        </span>
      </li>

      <li className={card}>
        <div className="min-w-0 flex-1 pr-3">
          <p className={label}>Menu tersedia</p>
          <p className="mt-1 font-headline text-3xl font-semibold text-secondary">
            {available} Menu
          </p>
          <div className="mt-3">
            <ProgressBar value={ratio} label="Persentase menu tersedia" color="secondary" />
          </div>
        </div>
        <span className={`${icon} bg-secondary-container text-secondary`}>
          <CircleCheck className="size-5" />
        </span>
      </li>

      <li className={card}>
        <div>
          <p className={label}>Menu habis</p>
          <p className="mt-1 font-headline text-3xl font-semibold text-on-surface-muted">
            {unavailable} Menu
          </p>
        </div>
        <span className={`${icon} bg-surface-variant text-on-surface-muted`}>
          <CircleX className="size-5" />
        </span>
      </li>

      <li className={card}>
        <div>
          <p className={label}>Rating stand</p>
          {rating > 0 ? (
            <p className="mt-1 font-headline text-3xl font-semibold">
              {rating.toFixed(1)}
              <span className="text-sm font-normal text-on-surface-muted"> /5.0</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-on-surface-muted">Belum ada ulasan</p>
          )}
        </div>
        <span className={`${icon} bg-tertiary-container text-tertiary-strong`}>
          <Star className="size-5" />
        </span>
      </li>
    </ul>
  );
}