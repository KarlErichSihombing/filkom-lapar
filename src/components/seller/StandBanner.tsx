import { StandPhotoEditor } from "@/components/seller/StandPhotoEditor";
import { TokoToggle } from "@/components/seller/TokoToggle";
import { MapPin, QrCode } from "@/components/ui/icons";
import { pad2 } from "@/lib/format";

type Props = {
  tokoId: string;
  namaToko: string;
  noStand: number;
  fotoUrl: string | null;
  buka?: boolean;
};

export function StandBanner({ tokoId, namaToko, noStand, fotoUrl, buka }: Props) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex flex-wrap items-center gap-5">
          <StandPhotoEditor tokoId={tokoId} initialUrl={fotoUrl} />

          <div>
            <div className="flex flex-wrap items-center gap-2 font-label text-[10px] font-bold uppercase tracking-wider">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-container px-2.5 py-1 text-primary-strong">
                <MapPin className="size-3" />
                Kantin GKM FILKOM
              </span>
              <span className="rounded-full bg-surface px-2.5 py-1 text-on-surface">
                Stand No. {pad2(noStand)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2.5 py-1 text-secondary">
                <QrCode className="size-3" />
                QRIS Ready
              </span>
            </div>

            <h1 className="mt-2.5 font-headline text-3xl font-extrabold leading-tight text-on-surface sm:text-4xl">
              {namaToko}
            </h1>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-on-surface-muted sm:text-sm">
              Kelola foto stand, status operasional buka/tutup, katalog menu, dan antrean
              pesanan pembeli secara real-time.
            </p>
          </div>
        </div>

        <TokoToggle tokoId={tokoId} buka={buka} />
      </div>
    </section>
  );
}
