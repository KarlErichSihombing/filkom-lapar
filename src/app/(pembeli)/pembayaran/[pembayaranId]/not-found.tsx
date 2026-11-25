import Link from "next/link";

export default function PembayaranNotFound() {
  return (
    <section className="rounded-3xl bg-surface p-8 text-center">
      <h1 className="text-2xl font-semibold">Data pembayaran tidak ditemukan</h1>
      <p className="mt-2 text-sm text-on-surface-muted">
        Tagihan ini tidak tersedia atau bukan milik akun Anda.
      </p>
      <Link
        href="/pesanan"
        className="mt-5 inline-flex rounded-full bg-primary-strong px-6 py-3 font-label text-sm font-medium text-on-primary"
      >
        Lihat pesanan saya
      </Link>
    </section>
  );
}
