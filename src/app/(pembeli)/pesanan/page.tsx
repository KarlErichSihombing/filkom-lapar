import Link from "next/link";
import { ArrowRight, Receipt } from "@/components/ui/icons";
import { pad2, rupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  STATUS_PESANAN_BADGE,
  STATUS_PESANAN_LABEL,
  type StatusPesanan,
} from "@/types/order";

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
  pembayaran_id: string;
  total_harga: number | string;
  status_pesanan: StatusPesanan;
  alasan_pembatalan: string | null;
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

export default async function PesananPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pesanan")
    .select(
      "id, kode, toko_id, pembayaran_id, total_harga, status_pesanan, alasan_pembatalan, created_at, toko(id, nama_toko, no_stand), detail_pesanan(menu_id, nama_menu, jumlah, harga_satuan, subtotal, catatan)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p role="alert" className="rounded-3xl bg-white p-6 text-sm text-error">
        Gagal memuat daftar pesanan: {error.message}. Pastikan SQL Tahap 3 sudah dijalankan di
        Supabase.
      </p>
    );
  }

  const orders = (data ?? []) as unknown as PesananRow[];

  if (orders.length === 0) {
    return (
      <section className="rounded-3xl bg-surface px-6 py-16 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-white text-primary-strong">
          <Receipt className="size-6" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold">Belum ada pesanan</h1>
        <p className="mt-1 text-sm text-on-surface-muted">
          Pesanan yang sudah kamu checkout akan tercatat di halaman ini.
        </p>
        <Link
          href="/beranda"
          className="mt-6 inline-flex rounded-full bg-primary-strong px-6 py-3 font-label text-sm font-medium text-on-primary"
        >
          Mulai pesan makan
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-semibold">Pesanan Saya</h1>
        <p className="font-label text-xs text-on-surface-muted">
          Total {orders.length} pesanan tercatat
        </p>
      </div>

      <ul className="space-y-4">
        {orders.map((p) => {
          const toko = one(p.toko);
          const status = p.status_pesanan;

          return (
            <li key={p.id} className="rounded-3xl bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-label text-xs font-semibold text-primary-strong">
                    #{p.kode}
                    {toko?.no_stand !== undefined && ` · Stand ${pad2(toko.no_stand)}`}
                  </p>
                  <h2 className="mt-0.5 font-headline text-xl font-semibold">
                    {toko?.nama_toko ?? "Stand Kantin"}
                  </h2>
                  <p className="mt-0.5 text-xs text-on-surface-muted">
                    {formatDateTime(p.created_at)}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3.5 py-1.5 font-label text-xs font-medium ${
                    STATUS_PESANAN_BADGE[status] ?? "bg-surface text-on-surface-muted"
                  }`}
                >
                  {STATUS_PESANAN_LABEL[status] ?? status}
                </span>
              </div>

              <ul className="mt-4 divide-y divide-surface text-sm">
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

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-surface pt-4">
                <div>
                  <span className="text-xs text-on-surface-muted">Total pesanan stand</span>
                  <p className="font-headline text-xl font-bold text-primary-strong">
                    {rupiah(Number(p.total_harga))}
                  </p>
                </div>

                <Link
                  href={`/pembayaran/${p.pembayaran_id}`}
                  className="inline-flex items-center gap-2 rounded-full bg-primary-container px-4 py-2.5 font-label text-xs font-semibold text-primary-strong transition-colors hover:brightness-95"
                >
                  {status === "menunggu_pembayaran" ? "Lihat tagihan" : "Detail pembayaran"}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
