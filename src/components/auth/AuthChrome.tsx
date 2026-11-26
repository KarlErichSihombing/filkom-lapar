import {
  Clock,
  Gauge,
  MapPin,
  QrCode,
  ShoppingBag,
  Star,
  Timer,
  Utensils,
} from "@/components/ui/icons";

export function TopBar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-full bg-surface/90 px-4 py-2.5 text-xs">
      <p className="flex flex-wrap items-center gap-2.5">
        <span className="grid size-6 place-items-center rounded-full bg-primary-strong text-on-primary">
          <Utensils className="size-3.5" />
        </span>
        <span className="font-label text-[11px] font-bold uppercase tracking-wide text-on-surface">
          Kantin GKM · Lantai 1
        </span>
        <span aria-hidden className="hidden text-outline/50 sm:inline">
          |
        </span>
        <span className="hidden text-xs text-on-surface-muted sm:inline">
          Pesan praktis, lewati antrean kuliah siang
        </span>
      </p>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1 font-label text-[11px] font-semibold text-secondary">
          <span className="size-2 rounded-full bg-secondary-soft" />8 Stand Sedang Buka
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-primary-container px-3 py-1 font-label text-[11px] font-semibold text-primary-strong">
          <Clock className="size-3.5" />
          Fast-Pickup 10 Menit
        </span>
      </div>
    </div>
  );
}

const picks = [
  {
    badge: "Favorit",
    badgeClass: "bg-primary-strong text-on-primary",
    name: "Geprek Mas Bro",
    price: "Rp 15.000",
    rating: "4.9",
    image:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=480&q=80",
  },
  {
    badge: "Stand 03",
    badgeClass: "bg-secondary text-on-primary",
    name: "Katsu Don & Mie",
    price: "Rp 18.000",
    rating: "4.8",
    image:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=480&q=80",
  },
  {
    badge: "Dingin",
    badgeClass: "bg-secondary-soft text-on-primary",
    name: "Es Kopi Susu GKM",
    price: "Rp 10.000",
    rating: "5.0",
    image:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=480&q=80",
  },
];

export function HeroPanel() {
  return (
    <section className="relative flex h-full flex-col justify-between overflow-hidden rounded-[2rem] bg-surface p-6 sm:p-9">
      <span
        aria-hidden
        className="pointer-events-none absolute right-8 top-5 select-none font-headline text-6xl font-extrabold tracking-tight text-on-surface/[0.06]"
      >
        UB
      </span>

      <div>
        <p className="relative inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 font-label text-xs font-semibold text-on-surface shadow-sm">
          <svg
            viewBox="0 0 24 24"
            className="size-4 text-primary-strong"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
          Eksklusif Sivitas Akademika FILKOM UB
        </p>

        <h1 className="relative mt-6 font-headline text-4xl font-extrabold uppercase leading-[1.02] tracking-tight text-on-surface sm:text-[3.35rem]">
          Makan Siang
          <em className="block font-extrabold italic text-primary-strong">
            Tanpa Antri
          </em>
          di Kantin FILKOM.
        </h1>

        <p className="relative mt-5 max-w-lg text-sm leading-relaxed text-on-surface-muted">
          Sistem pemesanan makanan mandiri untuk mahasiswa, dosen, dan staf FILKOM
          Universitas Brawijaya. Ambil pesanan langsung di counter stand tanpa
          buang waktu istirahat 30 menitmu.
        </p>

        <ul className="relative mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {picks.map((p) => (
            <li
              key={p.name}
              className="rounded-2xl bg-white p-2.5 shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-variant">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt={p.name}
                  className="size-full object-cover"
                  loading="lazy"
                />
                <span
                  className={`absolute right-2 top-2 rounded-full px-2.5 py-0.5 font-label text-[10px] font-semibold shadow-sm ${p.badgeClass}`}
                >
                  {p.badge}
                </span>
              </div>
              <p className="mt-2.5 truncate font-headline text-sm font-bold text-on-surface">
                {p.name}
              </p>
              <p className="mt-1 flex items-center justify-between font-label text-xs">
                <span className="font-semibold text-primary-strong">{p.price}</span>
                <span className="inline-flex items-center gap-0.5 font-medium text-on-surface-muted">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  {p.rating}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-8 flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2" aria-hidden>
            <span className="grid size-9 place-items-center rounded-full border-2 border-surface bg-primary-strong font-label text-xs font-bold text-on-primary">
              IF
            </span>
            <span className="grid size-9 place-items-center rounded-full border-2 border-surface bg-secondary font-label text-xs font-bold text-on-primary">
              TI
            </span>
            <span className="grid size-9 place-items-center rounded-full border-2 border-surface bg-tertiary-strong font-label text-xs font-bold text-on-primary">
              SI
            </span>
          </div>
          <p className="text-xs leading-tight">
            <strong className="block font-headline text-sm font-bold text-on-surface">
              1.840+ Mahasiswa
            </strong>
            <span className="text-on-surface-muted">Aktif menggunakan FILKOM Lapar</span>
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-label text-xs font-semibold text-on-surface shadow-sm">
          <QrCode className="size-3.5 text-secondary" />
          Xendit Instant QRIS Ready
        </span>
      </div>
    </section>
  );
}

const features = [
  {
    icon: <Timer className="size-5" />,
    tone: "bg-primary-container text-primary-strong",
    title: "10 Detik Pembatalan",
    text: "Perlindungan pesanan tanpa repot. Kesempatan batalkan dalam 10 detik sebelum juru masak memproses kupon Anda.",
  },
  {
    icon: <ShoppingBag className="size-5" />,
    tone: "bg-secondary-container text-secondary",
    title: "Multi-Vendor Cart",
    text: "Beli geprek di Stand 1 dan es teh di Stand 4 dalam satu tagihan QRIS terpusat tanpa berkali-kali transfer.",
  },
  {
    icon: <Gauge className="size-5" />,
    tone: "bg-tertiary-container text-tertiary-strong",
    title: "Live Display Counter",
    text: "Pantau status nomor antrean langsung dari layar ponsel Anda saat masih berada di ruang kuliah.",
  },
];

export function FeatureStrip() {
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {features.map((f) => (
        <li key={f.title} className="flex gap-3.5 rounded-3xl bg-surface p-5">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-full ${f.tone}`}
          >
            {f.icon}
          </span>
          <div>
            <h3 className="font-headline text-base font-bold text-on-surface">
              {f.title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-muted">
              {f.text}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

const mahasiswa = [
  "Daftar Tenant Kantin",
  "Jadwal Operasional",
  "Riwayat Transaksi QRIS",
  "Pusat Bantuan & Komplain",
];
const tenant = [
  "Portal Merchant Stand",
  "Ketentuan Higienis Kantin",
  "Pengelola Kantin FILKOM",
  "Lapor Kendala Aplikasi",
];

export function SiteFooter() {
  return (
    <footer className="mt-10 bg-neutral/10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="flex items-center gap-2 font-headline text-lg font-bold text-primary-strong">
            FILKOM Lapar
            <span className="rounded-full bg-secondary-container px-2.5 py-0.5 font-label text-[10px] font-semibold text-secondary">
              Kantin Kampus
            </span>
          </p>
          <p className="mt-3 max-w-sm text-xs leading-relaxed text-on-surface-muted">
            Layanan pesan makanan dan minuman mandiri di Kantin Fakultas Ilmu
            Komputer, Universitas Brawijaya. Pesan lebih cepat tanpa antre
            panjang di sela jadwal kuliah.
          </p>
          <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-on-surface">
            <MapPin className="size-4 text-primary-strong" />
            Kantin Lantai 1, GKM FILKOM UB, Jl. Veteran Malang
          </p>
        </div>

        <div>
          <h4 className="font-label text-xs font-bold uppercase tracking-wider text-on-surface">
            Tautan Mahasiswa
          </h4>
          <ul className="mt-3 space-y-2.5 text-xs text-on-surface-muted">
            {mahasiswa.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-label text-xs font-bold uppercase tracking-wider text-on-surface">
            Kemitraan Tenant
          </h4>
          <ul className="mt-3 space-y-2.5 text-xs text-on-surface-muted">
            {tenant.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-outline/15">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-[11px] text-on-surface-muted sm:px-6">
          <p>
            © 2025 FILKOM Lapar · Fakultas Ilmu Komputer Universitas Brawijaya.
            Dilindungi Hak Cipta.
          </p>
          <p className="flex flex-wrap gap-5 font-medium">
            <span>Kebijakan Privasi</span>
            <span>Syarat Ketentuan</span>
            <span>Standar Kantin Halal</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
