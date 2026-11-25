"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Search, Star, Store } from "@/components/ui/icons";
import { pad2 } from "@/lib/format";
import type { StandCard } from "@/types/toko";

const photoCols: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
};

/** Menu pertama yang cocok dengan pencarian, bila yang cocok bukan nama stand-nya. */
function menuHint(s: StandCard, q: string) {
  if (!q || s.namaToko.toLowerCase().includes(q)) return null;
  return s.menu.find((m) => m.namaMenu.toLowerCase().includes(q))?.namaMenu ?? null;
}

export function TokoList({ stands }: { stands: StandCard[] }) {
  const [query, setQuery] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const q = query.trim().toLowerCase();

  const visible = useMemo(
    () =>
      stands.filter((s) => {
        if (onlyOpen && !s.buka) return false;
        if (!q) return true;
        return (
          s.namaToko.toLowerCase().includes(q) ||
          `stand ${pad2(s.noStand)}`.includes(q) ||
          s.menu.some((m) => m.namaMenu.toLowerCase().includes(q))
        );
      }),
    [stands, q, onlyOpen],
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-outline" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Cari stand atau menu"
            placeholder="Cari stand atau menu..."
            className="w-full rounded-full bg-surface py-3 pl-11 pr-4 text-sm placeholder:text-outline"
          />
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={onlyOpen}
          onClick={() => setOnlyOpen((v) => !v)}
          className={`rounded-full px-4 py-3 font-label text-xs font-medium transition-colors ${
            onlyOpen
              ? "bg-primary-strong text-on-primary"
              : "bg-surface text-on-surface-muted hover:bg-surface-variant"
          }`}
        >
          Hanya yang buka
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-3xl bg-surface px-5 py-12 text-center text-sm text-on-surface-muted">
          {stands.length === 0
            ? "Belum ada stand yang aktif."
            : "Tidak ada stand atau menu yang cocok dengan pencarian ini."}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => {
            const photos = s.menu.filter((m) => m.fotoUrl).slice(0, 3);
            const available = s.menu.filter((m) => m.tersedia).length;
            const hint = menuHint(s, q);

            return (
              <li key={s.id}>
                <Link
                  href={`/toko/${s.id}`}
                  className="group block overflow-hidden rounded-3xl bg-white transition-shadow hover:shadow-lg hover:shadow-primary/10"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary-container to-surface-variant">
                    {photos.length > 0 ? (
                      <div
                        className={`grid size-full gap-0.5 ${photoCols[photos.length]} ${
                          s.buka ? "" : "grayscale"
                        }`}
                      >
                        {photos.map((m) => (
                          <div key={m.id} className="relative">
                            <Image
                              src={m.fotoUrl!}
                              alt=""
                              fill
                              sizes="(min-width:1024px) 300px, (min-width:640px) 45vw, 100vw"
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid size-full place-items-center text-primary-strong/40">
                        <Store className="size-12" />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 font-label text-xs font-medium">
                      Stand {pad2(s.noStand)}
                    </span>
                    <span
                      className={`absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-3 py-1 font-label text-xs font-medium ${
                        s.buka
                          ? "bg-secondary-container text-secondary"
                          : "bg-inverted text-on-primary"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          s.buka ? "bg-secondary-soft" : "bg-neutral"
                        }`}
                      />
                      {s.buka ? "Buka" : "Tutup"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-semibold">{s.namaToko}</h3>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-muted">
                        <span className="flex items-center gap-1">
                          <Star className="size-3.5 text-primary" />
                          {s.rating > 0 ? s.rating.toFixed(1) : "Belum ada ulasan"}
                        </span>
                        <span>
                          {s.menu.length === 0
                            ? "Belum ada menu"
                            : `${s.menu.length} menu · ${available} tersedia`}
                        </span>
                      </p>
                      {hint && (
                        <p className="mt-1 truncate text-xs font-medium text-primary-strong">
                          Cocok: {hint}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-outline transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}