import { Clock, Gauge, ShoppingBag, Timer, Utensils } from "@/components/ui/icons";

/* Teks dan angka di file ini masih contoh (dummy). Ganti atau ambil dari database nanti. */

export function TopBar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-full bg-white/70 px-4 py-2 text-xs">
      <p className="flex items-center gap-2">
        <span className="grid size-6 place-items-center rounded-full bg-primary-strong text-on-primary">
          <Utensils className="size-3.5" />
        </span>
        <span className="font-label font-medium uppercase">
          Kantin Gedung F · Lantai 1
        </span>
        <span className="hidden text-on-surface-muted sm:inline">
          Pesan praktis, lewati antrean kuliah siang
        </span>
      </p>
      <p className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1 font-label text-secondary">
          <span className="size-1.5 rounded-full bg-secondary-soft" />8 stand
          sedang buka
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-primary-container px-3 py-1 font-label text-primary-strong">
          <Clock className="size-3.5" />
          Fast-pickup 10 menit
        </span>
      </p>
    </div>
  );
}

const picks = [
  { badge: "Favorit", name: "Geprek Mas Bro", price: "Rp 15.000", rating: "4.9", emoji: "🍗" },
  { badge: "Stand 03", name: "Katsu Don & Mie", price: "Rp 18.000", rating: "4.8", emoji: "🍜" },
  { badge: "Dingin", name: "Es Kopi Susu Gedung F", price: "Rp 10.000", rating: "5.0", emoji: "🧋" },
];

export function HeroPanel() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-surface p-6 sm:p-10">
      <span
        aria-hidden
        className="absolute right-8 top-4 font-headline text-7xl font-bold text-primary/10"
      >
        UB
      </span>

      <p className="relative inline-flex rounded-full bg-white px-3 py-1.5 font-label text-xs font-medium">
        Eksklusif sivitas akademik FILKOM UB
      </p>

      <h1 className="relative mt-6 font-headline text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-6xl">
        Makan siang
        <em className="block text-primary-strong">tanpa antri</em>
        di kantin FILKOM.
      </h1>

      <p className="relative mt-5 max-w-md text-sm text-on-surface-muted">
        Sistem pemesanan makanan mandiri untuk mahasiswa, dosen, dan staf FILKOM
        Universitas Brawijaya. Ambil pesanan langsung di counter stand tanpa
        buang waktu istirahat 30 menitmu.
      </p>

      {/* Ganti emoji dengan foto menu bila sudah ada (taruh di /public/menu/) */}
      <ul className="relative mt-8 hidden grid-cols-3 gap-3 sm:grid">
        {picks.map((p) => (
          <li key={p.name} className="rounded-2xl bg-white p-2">
            <div className="relative grid aspect-[4/3] place-items-center rounded-xl bg-gradient-to-br from-primary-container to-surface-variant text-4xl">
              <span aria-hidden>{p.emoji}</span>
              <span className="absolute right-1.5 top-1.5 rounded-full bg-primary-strong px-2 py-0.5 font-label text-[10px] text-on-primary">
                {p.badge}
              </span>
            </div>
            <p className="mt-2 truncate text-sm font-semibold">{p.name}</p>
            <p className="flex items-center justify-between font-label text-xs text-on-surface-muted">
              <span>{p.price}</span>
              <span>★ {p.rating}</span>
            </p>
          </li>
        ))}
      </ul>

      <div className="relative mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2" aria-hidden>
            <span className="grid size-9 place-items-center rounded-full border-2 border-surface bg-primary-strong font-label text-xs text-on-primary">IF</span>
            <span className="grid size-9 place-items-center rounded-full border-2 border-surface bg-secondary-soft font-label text-xs text-on-primary">TI</span>
            <span className="grid size-9 place-items-center rounded-full border-2 border-surface bg-tertiary-strong font-label text-xs text-on-primary">SI</span>
          </div>
          <p className="text-xs">
            <strong className="block font-label">1.840+ mahasiswa</strong>
            <span className="text-on-surface-muted">Aktif menggunakan FILKOM Lapar</span>
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-2 font-label text-xs font-medium text-secondary">
          Xendit instant QRIS ready
        </span>
      </div>
    </section>
  );
}

const features = [
  {
    icon: <Timer className="size-5" />,
    tone: "bg-primary-container text-primary-strong",
    title: "10 detik pembatalan",
    text: "Perlindungan pesanan tanpa repot. Kesempatan batalkan dalam 10 detik sebelum juru masak memproses pesananmu.",
  },
  {
    icon: <ShoppingBag className="size-5" />,
    tone: "bg-secondary-container text-secondary",
    title: "Multi-vendor cart",
    text: "Beli geprek di Stand 1 dan es teh di Stand 4 dalam satu tagihan QRIS terpusat tanpa berkali-kali transfer.",
  },
  {
    icon: <Gauge className="size-5" />,
    tone: "bg-tertiary-container text-tertiary-strong",
    title: "Live display counter",
    text: "Pantau status pesanan langsung dari layar ponselmu saat masih berada di ruang kuliah.",
  },
];

export function FeatureStrip() {
  return (
    <ul className="grid gap-3 md:grid-cols-3">
      {features.map((f) => (
        <li key={f.title} className="flex gap-3 rounded-3xl bg-surface p-4">
          <span className={`grid size-10 shrink-0 place-items-center rounded-full ${f.tone}`}>
            {f.icon}
          </span>
          <div>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-1 text-xs text-on-surface-muted">{f.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* Jadikan <Link> bila halamannya sudah ada. */
const mahasiswa = ["Daftar tenant kantin", "Jadwal operasional", "Riwayat transaksi QRIS", "Pusat bantuan & komplain"];
const tenant = ["Portal merchant stand", "Ketentuan higienis kantin", "Pengelola kantin FILKOM", "Lapor kendala aplikasi"];

export function SiteFooter() {
  return (
    <footer className="mt-10 bg-neutral/10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="flex items-center gap-2 font-headline text-lg font-semibold text-primary-strong">
            FILKOM Lapar
            <span className="rounded-full bg-secondary-container px-2 py-0.5 font-label text-[10px] font-medium text-secondary">
              Kantin kampus
            </span>
          </p>
          <p className="mt-3 max-w-xs text-xs text-on-surface-muted">
            Layanan pesan makanan dan minuman mandiri di Kantin Fakultas Ilmu
            Komputer, Universitas Brawijaya. Pesan lebih cepat tanpa antre
            panjang di sela jadwal kuliah.
          </p>
          <p className="mt-4 text-xs font-medium">
            Kantin Lantai 1, Gedung F FILKOM UB, Jl. Veteran Malang
          </p>
        </div>

        <div>
          <h4 className="font-label text-xs font-semibold uppercase tracking-wider">
            Tautan mahasiswa
          </h4>
          <ul className="mt-3 space-y-2 text-xs text-on-surface-muted">
            {mahasiswa.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-label text-xs font-semibold uppercase tracking-wider">
            Kemitraan tenant
          </h4>
          <ul className="mt-3 space-y-2 text-xs text-on-surface-muted">
            {tenant.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-outline/20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-[11px] text-on-surface-muted sm:px-6">
          <p>
            © 2026 FILKOM Lapar · Fakultas Ilmu Komputer
            Universitas Brawijaya. Dilindungi hak cipta.
          </p>
          <p className="flex gap-4 font-medium">
            <span>Kebijakan privasi</span>
            <span>Syarat ketentuan</span>
            <span>Standar kantin halal</span>
          </p>
        </div>
      </div>
    </footer>
  );
}