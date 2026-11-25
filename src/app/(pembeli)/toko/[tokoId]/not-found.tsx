import Link from "next/link";

export default function TokoNotFound() {
  return (
    <section className="rounded-3xl bg-surface p-8 text-center">
      <h1 className="text-2xl font-semibold">Stand tidak ditemukan</h1>
      <p className="mt-2 text-sm text-on-surface-muted">
        Stand ini tidak ada atau sedang tidak aktif.
      </p>
      <Link
        href="/beranda"
        className="mt-5 inline-flex rounded-full bg-primary-strong px-6 py-3 font-label text-sm font-medium text-on-primary"
      >
        Kembali ke beranda
      </Link>
    </section>
  );
}