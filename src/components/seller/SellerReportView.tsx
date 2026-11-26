"use client";

import { useMemo, useState } from "react";
import { BarChart, CircleCheck, Receipt, Star, Utensils } from "@/components/ui/icons";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { pad2, rupiah } from "@/lib/format";
import type {
  MenuSalesStat,
  PublicReviewItem,
  SalesOrderRecord,
} from "@/types/order";

type PeriodFilter = "hari_ini" | "minggu_ini" | "bulan_ini" | "semua" | "kustom";

const PERIOD_TABS: { value: PeriodFilter; label: string }[] = [
  { value: "hari_ini", label: "Hari Ini" },
  { value: "minggu_ini", label: "7 Hari Terakhir" },
  { value: "bulan_ini", label: "30 Hari Terakhir" },
  { value: "semua", label: "Semua Waktu" },
  { value: "kustom", label: "Kustom Tanggal" },
];

type ChartBucket = {
  key: string;
  label: string;
  pendapatan: number;
  pesanan: number;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatShortDate(d: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(d);
}

export function SellerReportView({
  namaToko,
  noStand,
  initialRating,
  initialOrders,
  initialReviews,
}: {
  namaToko: string;
  noStand: number;
  initialRating: number;
  initialOrders: SalesOrderRecord[];
  initialReviews: PublicReviewItem[];
}) {
  const [period, setPeriod] = useState<PeriodFilter>("bulan_ini");
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );

  // Filter ulasan (berdasarkan bintang & berdasarkan nama menu)
  const [reviewStar, setReviewStar] = useState<number | "semua">("semua");
  const [reviewMenu, setReviewMenu] = useState<string>("semua");

  // Hanya pesanan berstatus 'selesai' yang dihitung sebagai pendapatan penjualan
  // (bila belum ada yang 'selesai', sertakan pesanan aktif 'dibayar'/'diproses'/'siap_diambil' sebagai transaksi berjalan)
  const completedOrders = useMemo(() => {
    const finished = initialOrders.filter((o) => o.statusPesanan === "selesai");
    if (finished.length > 0) return finished;
    return initialOrders.filter((o) =>
      ["dibayar", "diproses", "siap_diambil", "selesai"].includes(o.statusPesanan),
    );
  }, [initialOrders]);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now).getTime();

    return completedOrders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      if (period === "hari_ini") {
        return t >= todayStart;
      }
      if (period === "minggu_ini") {
        return t >= todayStart - 6 * 86_400_000;
      }
      if (period === "bulan_ini") {
        return t >= todayStart - 29 * 86_400_000;
      }
      if (period === "kustom") {
        const fromMs = customFrom ? new Date(`${customFrom}T00:00:00`).getTime() : 0;
        const toMs = customTo
          ? new Date(`${customTo}T23:59:59.999`).getTime()
          : Number.POSITIVE_INFINITY;
        return t >= fromMs && t <= toMs;
      }
      return true;
    });
  }, [completedOrders, period, customFrom, customTo]);

  const stats = useMemo(() => {
    const totalPendapatan = filteredOrders.reduce((acc, o) => acc + o.totalHarga, 0);
    const totalPesanan = filteredOrders.length;

    const menuMap = new Map<string, MenuSalesStat>();
    let totalPorsi = 0;

    for (const o of filteredOrders) {
      for (const item of o.items) {
        totalPorsi += item.jumlah;
        const prev = menuMap.get(item.namaMenu);
        if (prev) {
          prev.porsiTerjual += item.jumlah;
          prev.totalPendapatan += item.subtotal;
        } else {
          menuMap.set(item.namaMenu, {
            menuId: item.menuId,
            namaMenu: item.namaMenu,
            porsiTerjual: item.jumlah,
            totalPendapatan: item.subtotal,
          });
        }
      }
    }

    const menuRanking = [...menuMap.values()].sort(
      (a, b) => b.porsiTerjual - a.porsiTerjual || b.totalPendapatan - a.totalPendapatan,
    );

    return {
      totalPendapatan,
      totalPesanan,
      totalPorsi,
      topMenu: menuRanking[0] ?? null,
      menuRanking,
    };
  }, [filteredOrders]);

  // Data Grafik Tren Penjualan (per blok jam untuk Hari Ini, per hari untuk periode lainnya)
  const chartBuckets = useMemo<ChartBucket[]>(() => {
    if (period === "hari_ini") {
      const hours = [8, 10, 12, 14, 16, 18, 20];
      const buckets: ChartBucket[] = hours.map((h) => ({
        key: String(h),
        label: pad2(h),
        pendapatan: 0,
        pesanan: 0,
      }));

      for (const o of filteredOrders) {
        const h = new Date(o.createdAt).getHours();
        // Cari slot 2-jam terdekat
        let bestIdx = 0;
        let bestDiff = 99;
        hours.forEach((slot, idx) => {
          const diff = Math.abs(h - slot);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestIdx = idx;
          }
        });
        buckets[bestIdx]!.pendapatan += o.totalHarga;
        buckets[bestIdx]!.pesanan += 1;
      }
      return buckets;
    }

    const daysCount = period === "minggu_ini" ? 7 : 7;
    const now = new Date();
    const buckets: ChartBucket[] = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      buckets.push({
        key,
        label: formatShortDate(d),
        pendapatan: 0,
        pesanan: 0,
      });
    }

    const map = new Map(buckets.map((b) => [b.key, b]));
    for (const o of filteredOrders) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      const b = map.get(key);
      if (b) {
        b.pendapatan += o.totalHarga;
        b.pesanan += 1;
      }
    }

    return buckets;
  }, [filteredOrders, period]);

  const maxBucketValue = useMemo(
    () => Math.max(1, ...chartBuckets.map((b) => b.pendapatan)),
    [chartBuckets],
  );

  const peakBucketKey = useMemo(() => {
    let bestKey = "";
    let bestVal = 0;
    for (const b of chartBuckets) {
      if (b.pendapatan > bestVal) {
        bestVal = b.pendapatan;
        bestKey = b.key;
      }
    }
    return bestVal > 0 ? bestKey : "";
  }, [chartBuckets]);

  // Daftar menu yang pernah diulas + rating rata-rata per menu (SR-27 / SR-33)
  const menuReviewStats = useMemo(() => {
    const map = new Map<string, { namaMenu: string; count: number; sum: number }>();
    for (const r of initialReviews) {
      for (const mName of r.menuNames) {
        const prev = map.get(mName);
        if (prev) {
          prev.count += 1;
          prev.sum += r.rating;
        } else {
          map.set(mName, { namaMenu: mName, count: 1, sum: r.rating });
        }
      }
    }
    return [...map.values()]
      .map((x) => ({
        namaMenu: x.namaMenu,
        count: x.count,
        avg: Number((x.sum / x.count).toFixed(1)),
      }))
      .sort((a, b) => b.avg - a.avg || b.count - a.count);
  }, [initialReviews]);

  const filteredReviews = useMemo(() => {
    return initialReviews.filter((r) => {
      if (reviewStar !== "semua" && r.rating !== reviewStar) return false;
      if (reviewMenu !== "semua" && !r.menuNames.includes(reviewMenu)) return false;
      return true;
    });
  }, [initialReviews, reviewStar, reviewMenu]);

  function downloadCsv() {
    const header = ["Kode Pesanan", "Tanggal", "Pembeli", "Menu", "Total Harga (Rp)", "Status"];
    const rows = filteredOrders.map((o) => [
      o.kode,
      new Date(o.createdAt).toLocaleString("id-ID"),
      `"${o.namaPembeli.replace(/"/g, '""')}"`,
      `"${o.items.map((i) => `${i.jumlah}x ${i.namaMenu}`).join("; ").replace(/"/g, '""')}"`,
      String(o.totalHarga),
      o.statusPesanan,
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-penjualan-stand-${pad2(noStand)}-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header & Filter Periode Laporan Penjualan */}
      <section className="rounded-3xl bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-label text-[10px] uppercase tracking-wider text-primary-strong">
              Analitik &amp; Evaluasi · Stand {pad2(noStand)}
            </p>
            <h2 className="mt-0.5 text-2xl font-semibold">
              Laporan Penjualan &amp; Ulasan {namaToko}
            </h2>
            <p className="mt-0.5 text-xs text-on-surface-muted">
              Ringkasan performa pendapatan, menu terlaris, grafik penjualan, dan umpan balik
              pembeli.
            </p>
          </div>

          <button
            type="button"
            onClick={downloadCsv}
            disabled={filteredOrders.length === 0}
            className="rounded-full bg-primary-container px-4 py-2.5 font-label text-xs font-semibold text-primary-strong transition-colors hover:brightness-95 disabled:opacity-50"
          >
            Unduh Laporan Format CSV
          </button>
        </div>

        {/* Pilihan periode */}
        <div
          role="radiogroup"
          aria-label="Filter periode laporan"
          className="mt-4 flex flex-wrap gap-1.5 rounded-2xl bg-surface p-1.5"
        >
          {PERIOD_TABS.map((t) => {
            const active = period === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPeriod(t.value)}
                className={`rounded-full px-4 py-2 font-label text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary-strong text-on-primary"
                    : "text-on-surface-muted hover:bg-surface-variant"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {period === "kustom" && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-surface p-3.5 text-xs">
            <label className="flex items-center gap-2">
              <span className="font-label text-on-surface-muted">Dari:</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-full bg-white px-3 py-1.5 font-label"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="font-label text-on-surface-muted">Sampai:</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-full bg-white px-3 py-1.5 font-label"
              />
            </label>
          </div>
        )}

        {/* 4 Kartu Statistik Utama */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-surface p-4">
            <p className="font-label text-[11px] uppercase tracking-wider text-on-surface-muted">
              Total Pendapatan
            </p>
            <p className="mt-1 font-headline text-2xl font-bold text-primary-strong">
              {rupiah(stats.totalPendapatan)}
            </p>
            <p className="mt-1 text-[11px] text-on-surface-muted">
              Dari {stats.totalPesanan} transaksi ({stats.totalPorsi} porsi)
            </p>
          </div>

          <div className="rounded-2xl bg-surface p-4">
            <p className="font-label text-[11px] uppercase tracking-wider text-on-surface-muted">
              Total Pesanan
            </p>
            <p className="mt-1 font-headline text-2xl font-bold text-on-surface">
              {stats.totalPesanan} Pesanan
            </p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-secondary">
              <CircleCheck className="size-3.5" /> 100% terverifikasi sistem
            </p>
          </div>

          <div className="rounded-2xl bg-surface p-4">
            <p className="font-label text-[11px] uppercase tracking-wider text-on-surface-muted">
              Menu Terlaris
            </p>
            {stats.topMenu ? (
              <>
                <p className="mt-1 truncate font-headline text-lg font-bold text-on-surface">
                  {stats.topMenu.namaMenu}
                </p>
                <p className="mt-1 text-[11px] font-medium text-primary-strong">
                  {stats.topMenu.porsiTerjual} porsi · {rupiah(stats.topMenu.totalPendapatan)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs text-on-surface-muted">Belum ada penjualan</p>
            )}
          </div>

          <div className="rounded-2xl bg-surface p-4">
            <p className="font-label text-[11px] uppercase tracking-wider text-on-surface-muted">
              Rata-Rata Rating
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <Star className="size-5 fill-primary text-primary" />
              <span className="font-headline text-2xl font-bold text-on-surface">
                {initialRating > 0 ? initialRating.toFixed(1) : "0.0"}
              </span>
              <span className="text-xs text-on-surface-muted">/ 5.0</span>
            </div>
            <p className="mt-1 text-[11px] text-on-surface-muted">
              Dari {initialReviews.length} ulasan pembeli
            </p>
          </div>
        </div>
      </section>

      {/* Grafik Tren Penjualan & Peringkat Menu Terlaris */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Grafik Tren Penjualan Visual (UI-08) */}
        <section className="rounded-3xl bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart className="size-5 text-primary-strong" />
              <h3 className="text-lg font-semibold">Grafik Tren Penjualan</h3>
            </div>
            <span className="rounded-full bg-surface px-3 py-1 font-label text-[11px] text-on-surface-muted">
              {period === "hari_ini" ? "24 Jam (Per 2 Jam)" : "7 Hari Terakhir"}
            </span>
          </div>

          <div className="mt-5 rounded-2xl bg-surface p-5">
            <div className="flex h-48 items-end justify-between gap-2.5 pt-6">
              {chartBuckets.map((b) => {
                const heightPct =
                  b.pendapatan > 0
                    ? Math.max(14, Math.round((b.pendapatan / maxBucketValue) * 100))
                    : 8;
                const isPeak = b.key === peakBucketKey;

                return (
                  <div
                    key={b.key}
                    className="group relative flex h-full flex-1 flex-col items-center justify-end"
                  >
                    {isPeak && (
                      <span className="mb-1.5 rounded-full bg-primary-strong px-2 py-0.5 font-label text-[10px] font-bold text-on-primary">
                        Peak
                      </span>
                    )}
                    <div
                      title={`${b.label}: ${rupiah(b.pendapatan)} (${b.pesanan} pesanan)`}
                      style={{ height: `${heightPct}%` }}
                      className={`w-full max-w-12 rounded-t-xl transition-all ${
                        isPeak
                          ? "bg-primary-strong"
                          : b.pendapatan > 0
                            ? "bg-primary/70 group-hover:bg-primary-strong"
                            : "bg-outline/20"
                      }`}
                    />
                    <span className="mt-2 font-label text-[11px] font-medium text-on-surface-muted">
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daftar Transaksi Terakhir */}
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <h4 className="font-headline text-sm font-semibold">
                Daftar Transaksi Periode Ini ({filteredOrders.length})
              </h4>
            </div>
            {filteredOrders.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-surface px-4 py-6 text-center text-xs text-on-surface-muted">
                Belum ada transaksi pada periode tanggal ini.
              </p>
            ) : (
              <ul className="mt-3 max-h-60 divide-y divide-surface overflow-y-auto rounded-2xl bg-surface px-4 py-1 text-xs">
                {filteredOrders.slice(0, 15).map((o) => (
                  <li
                    key={o.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div>
                      <p className="font-semibold text-on-surface">
                        #{o.kode} · {o.namaPembeli}
                      </p>
                      <p className="text-[11px] text-on-surface-muted">
                        {formatDateTime(o.createdAt)} ·{" "}
                        {o.items.map((i) => `${i.jumlah}× ${i.namaMenu}`).join(", ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-label text-sm font-bold text-primary-strong">
                        {rupiah(o.totalHarga)}
                      </p>
                      <span className="font-label text-[10px] text-secondary">
                        {o.statusPesanan === "selesai" ? "Selesai" : o.statusPesanan}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Peringkat Penjualan per Menu */}
        <section className="rounded-3xl bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Utensils className="size-5 text-primary-strong" />
            <h3 className="text-lg font-semibold">Rekap Penjualan per Menu</h3>
          </div>
          <p className="mt-0.5 text-xs text-on-surface-muted">
            Diurutkan berdasarkan menu yang paling diminati pembeli.
          </p>

          {stats.menuRanking.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-surface px-4 py-10 text-center">
              <Receipt className="mx-auto size-7 text-outline" />
              <p className="mt-2 text-xs text-on-surface-muted">
                Belum ada item menu yang terjual pada periode ini.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.menuRanking.map((m, idx) => {
                const share =
                  stats.totalPendapatan > 0
                    ? Math.round((m.totalPendapatan / stats.totalPendapatan) * 100)
                    : 0;
                return (
                  <li key={m.namaMenu} className="rounded-2xl bg-surface p-3.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-headline text-sm font-semibold">
                        <span className="mr-1.5 font-label text-xs font-bold text-primary-strong">
                          #{idx + 1}
                        </span>
                        {m.namaMenu}
                      </p>
                      <span className="font-label text-xs font-bold text-primary-strong">
                        {rupiah(m.totalPendapatan)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-on-surface-muted">
                      <span>{m.porsiTerjual} porsi terjual</span>
                      <span>{share}% dari pendapatan</span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar
                        value={share}
                        label={`Kontribusi ${m.namaMenu}`}
                        color={idx === 0 ? "primary" : "secondary"}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Bagian Rekap Umpan Balik / Rating & Ulasan Pembeli (UI-09 / SR-27 / SR-33) */}
      <section className="rounded-3xl bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-label text-[10px] uppercase tracking-wider text-primary-strong">
              Evaluasi Menu &amp; Layanan
            </p>
            <h3 className="mt-0.5 text-2xl font-semibold">Ulasan &amp; Rating Stand</h3>
            <p className="mt-0.5 text-xs text-on-surface-muted">
              Saring ulasan berdasarkan nilai bintang atau menu tertentu untuk bahan evaluasi toko.
            </p>
          </div>

          {/* Filter Bintang & Menu */}
          <div className="flex flex-wrap items-center gap-2">
            {menuReviewStats.length > 0 && (
              <select
                value={reviewMenu}
                onChange={(e) => setReviewMenu(e.target.value)}
                aria-label="Filter ulasan berdasarkan menu"
                className="rounded-full bg-surface px-3.5 py-2 font-label text-xs font-medium text-on-surface"
              >
                <option value="semua">Semua Menu</option>
                {menuReviewStats.map((m) => (
                  <option key={m.namaMenu} value={m.namaMenu}>
                    {m.namaMenu} ({m.avg} ★)
                  </option>
                ))}
              </select>
            )}

            <div className="flex flex-wrap gap-1 rounded-full bg-surface p-1">
              {(["semua", 5, 4, 3, 2, 1] as const).map((s) => (
                <button
                  key={String(s)}
                  type="button"
                  onClick={() => setReviewStar(s)}
                  className={`rounded-full px-3 py-1.5 font-label text-xs font-medium transition-colors ${
                    reviewStar === s
                      ? "bg-primary-strong text-on-primary"
                      : "text-on-surface-muted hover:bg-surface-variant"
                  }`}
                >
                  {s === "semua" ? "Semua Bintang" : `${s} ★`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ringkasan Skor Bintang & Rating Rata-Rata per Menu */}
        <div className="mt-5 grid gap-4 lg:grid-cols-[18rem_1fr]">
          <div className="rounded-2xl bg-surface p-5 text-center">
            <p className="font-headline text-5xl font-bold text-primary-strong">
              {initialRating > 0 ? initialRating.toFixed(1) : "0.0"}
            </p>
            <div className="mt-2 flex justify-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`size-4 ${
                    i < Math.round(initialRating)
                      ? "fill-primary text-primary"
                      : "text-outline/40"
                  }`}
                />
              ))}
            </div>
            <p className="mt-1.5 font-label text-xs text-on-surface-muted">
              Berdasarkan {initialReviews.length} ulasan pelanggan
            </p>

            <div className="mt-4 space-y-1.5 text-left">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = initialReviews.filter((r) => r.rating === star).length;
                const pct =
                  initialReviews.length > 0
                    ? Math.round((count / initialReviews.length) * 100)
                    : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-7 shrink-0 font-label font-medium text-on-surface-muted">
                      {star} ★
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-primary-strong"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right font-label text-[11px] tabular-nums text-on-surface-muted">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {/* Rating rata-rata per menu */}
            {menuReviewStats.length > 0 && (
              <div className="rounded-2xl bg-surface p-4">
                <p className="font-label text-xs font-semibold text-on-surface-muted">
                  Rating Rata-Rata per Menu
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {menuReviewStats.map((m) => (
                    <button
                      key={m.namaMenu}
                      type="button"
                      onClick={() =>
                        setReviewMenu((prev) => (prev === m.namaMenu ? "semua" : m.namaMenu))
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-label text-xs font-medium transition-colors ${
                        reviewMenu === m.namaMenu
                          ? "bg-primary-strong text-on-primary"
                          : "bg-white text-on-surface hover:bg-surface-variant"
                      }`}
                    >
                      <span>{m.namaMenu}</span>
                      <span className="inline-flex items-center gap-0.5 font-bold text-primary">
                        ★ {m.avg}
                      </span>
                      <span className="text-[10px] opacity-75">({m.count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Daftar Ulasan */}
            {filteredReviews.length === 0 ? (
              <div className="rounded-2xl bg-surface px-4 py-10 text-center text-xs text-on-surface-muted">
                {initialReviews.length === 0
                  ? "Belum ada ulasan yang masuk dari pembeli."
                  : "Tidak ada ulasan yang cocok dengan filter bintang/menu ini."}
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {filteredReviews.map((r) => (
                  <li key={r.id} className="rounded-2xl bg-surface p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-headline text-sm font-semibold">{r.namaPembeli}</p>
                        <p className="font-label text-[10px] text-on-surface-muted">
                          Pesanan #{r.kodePesanan}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-white px-2.5 py-1 font-label text-xs font-bold text-primary-strong">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`size-3 ${
                              i < r.rating ? "fill-primary text-primary" : "text-outline/40"
                            }`}
                          />
                        ))}
                        <span className="ml-1">{r.rating}/5</span>
                      </span>
                    </div>

                    {r.komentar ? (
                      <p className="mt-2.5 text-xs leading-relaxed text-on-surface">
                        &ldquo;{r.komentar}&rdquo;
                      </p>
                    ) : (
                      <p className="mt-2.5 text-xs italic text-on-surface-muted">
                        Rating {r.rating} bintang tanpa komentar tertulis.
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/60 pt-2 text-[11px] text-on-surface-muted">
                      {r.menuNames.length > 0 && (
                        <span className="truncate font-label">
                          Produk: {r.menuNames.join(", ")}
                        </span>
                      )}
                      <span>{formatDateTime(r.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
