import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, QrCode, Receipt } from "@/components/ui/icons";
import { pad2, rupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  STATUS_PEMBAYARAN_LABEL,
  STATUS_PESANAN_BADGE,
  STATUS_PESANAN_LABEL,
  type StatusPembayaran,
  type StatusPesanan,
} from "@/types/order";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TokoRel = { id: string; nama_toko: string; no_stand: number };
type DetailRow = {
  menu_id: string;
  nama_menu: string;
  jumlah: number;
  harga_satuan: number | string;
  subtotal: number | string;
  catatan: string | null;
};
type PesananRow = {
  id: string;
  kode: string;
  toko_id: string;
  total_harga: number | string;
  status_pesanan: StatusPesanan;
  created_at: string;
  toko: TokoRel | TokoRel[] | null;
  detail_pesanan: DetailRow[];
};

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function PembayaranPage({
  params,
}: {
  params: Promise<{ pembayaranId: string }>;
}) {
  const { pembayaranId } = await params;
  if (!UUID_RE.test(pembayaranId)) notFound();

  const supabase = await createClient();

  const [payRes, orderRes] = await Promise.all([
    supabase
      .from("pembayaran")
      .select(
        "id, total_bayar, metode_pembayaran, status_pembayaran, expires_at, waktu_bayar, created_at",
      )
      .eq("id", pembayaranId)
      .maybeSingle(),
    supabase
      .from("pesanan")
      .select(
        "id, kode, toko_id, total_harga, status_pesanan, created_at, toko(id, nama_toko, no_stand), detail_pesanan(menu_id, nama_menu, jumlah, harga_satuan, subtotal, catatan)",
      )
      .eq("pembayaran_id", pembayaranId)
      .order("kode", { ascending: true }),
  ]);

  if (!payRes.data) notFound();

  const pembayaran = payRes.data;
  const statusBayar = (pembayaran.status_pembayaran as StatusPembayaran) ?? "menunggu";
  const pesananList = (orderRes.data ?? []) as unknown as PesananRow[];

  return (
    <>
      <Link
        href="/pesanan"
        className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 font-label text-xs font-medium text-on-surface-muted transition-colors hover:bg-surface-variant"
      >
        <ArrowLeft className="size-4" /> Daftar pesanan
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-start">
        <div className="space-y-4">
          <section className="rounded-3xl bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-label text-[11px] font-medium uppercase tracking-wider text-primary-strong">
                  Tagihan Pembayaran · {pembayaran.metode_pembayaran}
                </p>
                <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
                  {STATUS_PEMBAYARAN_LABEL[statusBayar] ?? statusBayar}
                </h1>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-on-surface-muted">
                  <Clock className="size-3.5" />
                  Batas bayar: {formatDateTime(pembayaran.expires_at)}
                </p>
              </div>
              <span className="rounded-full bg-primary-container px-3.5 py-1.5 font-label text-xs font-semibold text-primary-strong">
                {pesananList.length} Pesanan Stand
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3 rounded-2xl bg-surface p-4">
              <span className="text-sm text-on-surface-muted">Total Tagihan</span>
              <span className="font-headline text-3xl font-bold text-primary-strong">
                {rupiah(Number(pembayaran.total_bayar))}
              </span>
            </div>
          </section>

          <div className="space-y-3">
            <h2 className="font-headline text-lg font-semibold">
              Rincian Pesanan per Stand ({pesananList.length})
            </h2>
            {pesananList.map((p) => {
              const toko = one(p.toko);
              const status = p.status_pesanan;
              return (
                <section key={p.id} className="rounded-3xl bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-label text-xs font-semibold text-primary-strong">
                        #{p.kode}
                        {toko?.no_stand !== undefined && ` · Stand ${pad2(toko.no_stand)}`}
                      </p>
                      <h3 className="font-headline text-lg font-semibold">
                        {toko?.nama_toko ?? "Stand Kantin"}
                      </h3>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 font-label text-xs font-medium ${
                        STATUS_PESANAN_BADGE[status] ?? "bg-surface text-on-surface-muted"
                      }`}
                    >
                      {STATUS_PESANAN_LABEL[status] ?? status}
                    </span>
                  </div>

                  <ul className="mt-3 divide-y divide-surface text-sm">
                    {p.detail_pesanan.map((d) => (
                      <li key={d.menu_id} className="flex justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {d.jumlah} × {d.nama_menu}
                          </p>
                          {d.catatan && (
                            <p className="mt-0.5 text-xs text-on-surface-muted">
                              Catatan: {d.catatan}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 font-label">{rupiah(Number(d.subtotal))}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex items-baseline justify-between border-t border-surface pt-3 text-sm">
                    <span className="text-on-surface-muted">Subtotal stand</span>
                    <span className="font-label font-semibold text-primary-strong">
                      {rupiah(Number(p.total_harga))}
                    </span>
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        <aside className="rounded-3xl bg-white p-5 lg:sticky lg:top-28">
          <div className="flex items-center gap-2.5">
            <QrCode className="size-5 text-primary-strong" />
            <h2 className="text-lg font-semibold">Instruksi QRIS</h2>
          </div>

          <div className="mt-4 grid aspect-square place-items-center rounded-2xl bg-surface p-6 text-center">
            <div>
              <QrCode className="mx-auto size-16 text-primary-strong/70" />
              <p className="mt-3 font-headline text-sm font-semibold">
                Pesanan tercatat sebagai Menunggu Pembayaran
              </p>
              <p className="mt-1 text-xs text-on-surface-muted">
                Pembuatan QR dinamis Xendit & simulasi webhook akan diaktifkan pada Tahap 4.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            <Link
              href="/pesanan"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-strong px-6 py-3.5 font-label text-sm font-medium text-on-primary transition-colors hover:brightness-110"
            >
              <Receipt className="size-4" /> Lihat daftar pesanan
            </Link>
            <Link
              href="/beranda"
              className="block text-center font-label text-xs font-medium text-primary-strong"
            >
              Pesan menu lainnya
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
