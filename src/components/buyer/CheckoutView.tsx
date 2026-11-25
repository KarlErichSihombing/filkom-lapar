"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { bayarSekarang } from "@/actions/cart";
import { useCart } from "@/components/buyer/CartProvider";
import { groupLines } from "@/components/buyer/CartView";
import { Button } from "@/components/ui/Button";
import { QrCode } from "@/components/ui/icons";
import { pad2, rupiah } from "@/lib/format";

export function CheckoutView() {
  const cart = useCart();
  const router = useRouter();
  const { refresh } = cart;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (cart.lines.length === 0 && !busy) {
    return (
      <section className="rounded-3xl bg-surface px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Belum ada yang dipesan</h1>
        <p className="mt-1 text-sm text-on-surface-muted">
          Tambahkan menu ke keranjang sebelum checkout.
        </p>
        <Link
          href="/beranda"
          className="mt-6 inline-flex rounded-full bg-primary-strong px-6 py-3 font-label text-sm font-medium text-on-primary"
        >
          Lihat menu kantin
        </Link>
      </section>
    );
  }

  const groups = groupLines(cart.lines);

  async function pay() {
    setError(null);
    setBusy(true);
    const res = await bayarSekarang();
    if (res.ok && res.pembayaranId) {
      cart.clear();
      router.push(`/pembayaran/${res.pembayaranId}`);
      return; // tetap busy sampai halaman berpindah
    }
    setError(res.error ?? "Checkout gagal. Coba lagi.");
    setBusy(false);
    void refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-start">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Checkout</h1>

        {groups.map((g) => (
          <section key={g.key} className="rounded-3xl bg-white p-5">
            <h2 className="font-headline text-lg font-semibold">
              {g.noStand !== null && (
                <span className="mr-2 font-label text-[11px] uppercase tracking-wider text-primary-strong">
                  Stand {pad2(g.noStand)}
                </span>
              )}
              {g.namaToko}
            </h2>
            <ul className="mt-3 divide-y divide-surface text-sm">
              {g.lines.map((l) => (
                <li key={l.menuId} className="flex justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className={l.valid ? "" : "text-on-surface-muted line-through"}>
                      {l.jumlah} × {l.namaMenu}
                    </p>
                    {l.catatan && (
                      <p className="text-xs text-on-surface-muted">Catatan: {l.catatan}</p>
                    )}
                    {!l.valid && <p className="text-xs font-medium text-error">{l.reason}</p>}
                  </div>
                  {l.valid && (
                    <span className="shrink-0 font-label">{rupiah(l.harga * l.jumlah)}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="rounded-3xl bg-white p-5">
          <h2 className="font-headline text-lg font-semibold">Metode pembayaran</h2>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-3 rounded-2xl bg-primary-container p-4 ring-2 ring-primary-strong">
              <input type="radio" name="metode" defaultChecked className="size-4 accent-primary-strong" />
              <QrCode className="size-6 text-primary-strong" />
              <span>
                <span className="block font-semibold">QRIS</span>
                <span className="block text-xs text-on-surface-muted">
                  Bayar lewat e-wallet atau m-banking apa pun
                </span>
              </span>
            </label>
            {["Virtual account", "E-wallet langsung"].map((m) => (
              <div
                key={m}
                aria-disabled="true"
                className="flex items-center gap-3 rounded-2xl bg-surface p-4 text-on-surface-muted opacity-70"
              >
                <input type="radio" disabled className="size-4" />
                <span className="font-medium">{m}</span>
                <span className="ml-auto rounded-full bg-white px-2.5 py-0.5 font-label text-[10px]">
                  Segera hadir
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="rounded-3xl bg-white p-5 lg:sticky lg:top-28">
        <h2 className="text-lg font-semibold">Total pembayaran</h2>
        <p className="mt-2 font-headline text-4xl font-bold text-primary-strong">
          {rupiah(cart.total)}
        </p>
        <p className="mt-2 text-xs text-on-surface-muted">
          {cart.standCount > 1
            ? `Dibayar sekali untuk ${cart.standCount} stand. Setiap stand menerima pesanannya sendiri.`
            : "Tagihan berlaku selama 15 menit setelah checkout."}
        </p>

        {cart.hasInvalid && (
          <p role="alert" className="mt-4 rounded-2xl bg-error/10 px-4 py-3 text-xs text-error">
            Ada menu yang tidak tersedia.{" "}
            <Link href="/keranjang" className="font-semibold underline">
              Perbarui keranjang
            </Link>{" "}
            sebelum membayar.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-2xl bg-error/10 px-4 py-3 text-xs text-error">
            {error}
          </p>
        )}

        <Button
          className="mt-5 w-full py-3.5"
          onClick={pay}
          disabled={busy || cart.hasInvalid || cart.lines.length === 0}
        >
          {busy ? "Memproses..." : `Bayar ${rupiah(cart.total)}`}
        </Button>
        <Link
          href="/keranjang"
          className="mt-2 block text-center font-label text-xs font-medium text-primary-strong"
        >
          Kembali ke keranjang
        </Link>
      </aside>
    </div>
  );
}