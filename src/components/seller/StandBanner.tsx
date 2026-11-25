import { StandPhotoEditor } from "@/components/seller/StandPhotoEditor";
import { TokoToggle } from "@/components/seller/TokoToggle";
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
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <StandPhotoEditor tokoId={tokoId} initialUrl={fotoUrl} />
        <div>
          <p className="flex items-center gap-2 font-label text-[10px] uppercase tracking-wider">
            <span className="rounded-full bg-primary-container px-2 py-0.5 font-medium text-primary-strong">
              Kantin Gedung F
            </span>
            <span className="text-on-surface-muted">· Stand No. {pad2(noStand)}</span>
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight">{namaToko}</h1>
          <p className="mt-1 text-sm text-on-surface-muted">
            Kelola foto stand, status buka/tutup, dan ketersediaan menu secara real-time.
          </p>
        </div>
      </div>
      <TokoToggle tokoId={tokoId} buka={buka} />
    </section>
  );
}
