"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/components/buyer/CartProvider";
import { QtyStepper } from "@/components/buyer/QtyStepper";
import { ArrowRight, ImageIcon, ShoppingBag, Trash } from "@/components/ui/icons";
import { pad2, rupiah } from "@/lib/format";
import type { CartLine } from "@/types/cart";

type Group = { key: string; namaToko: string; noStand: number | null; lines: CartLine[] };

export function groupLines(lines: CartLine[]): Group[] {
  const map = new Map<string, Group>();
  for (const l of lines) {
    const key = l.tokoId ?? "tidak-tersedia";
    const g = map.get(key) ?? { key, namaToko: l.namaToko, noStand: l.noStand, lines: [] };
    g.lines.push(l);
    map.set(key, g);
  }
  return [...map.values()];
}

function CartLineRow({ line }: { line: CartLine }) {
  const cart = useCart();
  return (
    <li className={`rounded-2xl bg-surface p-3 ${line.valid ? "" : "ring-1 ring-error/40"}`}>
      <div className="flex gap-3">
        <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-outline">
          {line.fotoUrl ? (
            <Image
              src={line.fotoUrl}
              alt=""
              fill
              sizes="64px"
              className={`object-cover ${line.valid ? "" : "grayscale"}`}
            />
          ) : (
            <ImageIcon className="size-6" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-headline font-semibold leading-snug">{line.namaMenu}</p>
          {line.valid ? (
            <p className="mt-0.5 font-label text-xs text-on-surface-muted">
              {rupiah(line.harga)} per porsi
            </p>
          ) : (
            <p className="mt-1 inline-block rounded-full bg-error px-2.5 py-0.5 font-label text-[11px] font-medium text-on-primary">
              {line.reason}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <QtyStepper
            qty={line.jumlah}
            label={line.namaMenu}
            onMinus={() => cart.decrement(line.menuId)}
            onPlus={() => cart.increment(line.menuId)}
            plusDisabled={!line.valid}
          />
          {line.valid && (
            <p className="font-label text-sm font-medium">{rupiah(line.harga * line.jumlah)}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          defaultValue={line.catatan}
          maxLength={200}
          aria-label={`Catatan untuk ${line.namaMenu}`}
          placeholder="Catatan untuk penjual (opsional), mis. sambal dipisah"
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v !== line.catatan.trim()) cart.setNote(line.menuId, v);
          }}
          className="min-w-0 flex-1 rounded-full bg-white px-4 py-2 text-xs placeholder:text-outline"
        />
        <button
          type="button"
          onClick={() => cart.remove(line.menuId)}
          aria-label={`Hapus ${line.namaMenu} dari keranjang`}
          className="grid size-8 shrink-0 place-items-center rounded-full bg-error/10 text-error transition-colors hover:bg-error/20"
        >
          <Trash className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

export function CartView() {
  const cart = useCart();
  const { refresh } = cart;

  // Ambil data terbaru agar status habis/tutup akurat
  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (cart.lines.length === 0) {
    return (
      <section className="rounded-3xl bg-surface px-6 py-16 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-white text-primary-strong">
          <ShoppingBag className="size-6" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold">Keranjangmu masih kosong</h1>
        <p className="mt-1 text-sm text-on-surface-muted">
          Pilih menu dari satu atau beberapa stand, lalu bayar sekaligus.
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Keranjang</h1>
        {groups.map((g) => (
          <section key={g.key} className="rounded-3xl bg-white p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-headline text-lg font-semibold">
                {g.noStand !== null && (
                  <span className="mr-2 font-label text-[11px] uppercase tracking-wider text-primary-strong">
                    Stand {pad2(g.noStand)}
                  </span>
                )}
                {g.namaToko}
              </h2>
              <p className="shrink-0 font-label text-xs text-on-surface-muted">
                Subtotal{" "}
                {rupiah(g.lines.filter((l) => l.valid).reduce((n, l) => n + l.harga * l.jumlah, 0))}
              </p>
            </div>
            <ul className="mt-3 space-y-3">
              {g.lines.map((l) => (
                <CartLineRow key={l.menuId} line={l} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <aside className="rounded-3xl bg-white p-5 lg:sticky lg:top-28">
        <h2 className="text-lg font-semibold">Ringkasan</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {groups.map((g) => (
            <li key={g.key} className="flex justify-between gap-3 text-on-surface-muted">
              <span className="truncate">{g.namaToko}</span>
              <span className="shrink-0 font-label">
                {rupiah(g.lines.filter((l) => l.valid).reduce((n, l) => n + l.harga * l.jumlah, 0))}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-baseline justify-between border-t border-surface pt-4">
          <span className="text-sm text-on-surface-muted">Total</span>
          <span className="font-headline text-2xl font-bold text-primary-strong">
            {rupiah(cart.total)}
          </span>
        </div>

        {cart.hasInvalid ? (
          <>
            <p role="alert" className="mt-4 rounded-2xl bg-error/10 px-4 py-3 text-xs text-error">
              Ada menu yang tidak tersedia. Hapus menu tersebut untuk melanjutkan.
            </p>
            <span
              aria-disabled="true"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-surface-variant px-6 py-3.5 font-label text-sm font-medium text-on-surface-muted"
            >
              Lanjut ke checkout
            </span>
          </>
        ) : (
          <Link
            href="/checkout"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary-strong px-6 py-3.5 font-label text-sm font-medium text-on-primary transition-colors hover:brightness-110"
          >
            Lanjut ke checkout <ArrowRight className="size-4" />
          </Link>
        )}
        <Link
          href="/beranda"
          className="mt-2 block text-center font-label text-xs font-medium text-primary-strong"
        >
          Tambah menu lain
        </Link>
      </aside>
    </div>
  );
}