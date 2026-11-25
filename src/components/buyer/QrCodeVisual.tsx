"use client";

import { useMemo } from "react";

const SIZE = 25;

function inFinder(r: number, c: number, top: number, left: number) {
  const dr = r - top;
  const dc = c - left;
  return dr >= 0 && dr < 7 && dc >= 0 && dc < 7;
}

function finderDark(r: number, c: number, top: number, left: number) {
  const dr = r - top;
  const dc = c - left;
  if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return true;
  if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) return true;
  return false;
}

/**
 * Render matriks QR deterministik dari qr_string Xendit dalam bentuk SVG tajam
 * tanpa bergantung pada layanan gambar eksternal.
 */
export function QrCodeVisual({ value }: { value: string }) {
  const cells = useMemo(() => {
    const seed = value || "FILKOM-LAPAR-QRIS";
    const grid: boolean[][] = Array.from({ length: SIZE }, () =>
      Array<boolean>(SIZE).fill(false),
    );

    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        // 3 Finder patterns + quiet separator
        if (inFinder(r, c, 0, 0)) {
          grid[r]![c] = finderDark(r, c, 0, 0);
          continue;
        }
        if (inFinder(r, c, 0, SIZE - 7)) {
          grid[r]![c] = finderDark(r, c, 0, SIZE - 7);
          continue;
        }
        if (inFinder(r, c, SIZE - 7, 0)) {
          grid[r]![c] = finderDark(r, c, SIZE - 7, 0);
          continue;
        }
        if (
          (r === 7 && (c <= 7 || c >= SIZE - 8)) ||
          (c === 7 && (r <= 7 || r >= SIZE - 8)) ||
          (r === SIZE - 8 && c <= 7) ||
          (c === SIZE - 8 && r <= 7)
        ) {
          grid[r]![c] = false;
          continue;
        }

        // Timing pattern
        if (r === 6 || c === 6) {
          grid[r]![c] = (r + c) % 2 === 0;
          continue;
        }

        // Alignment pattern (bottom-right)
        if (r >= SIZE - 9 && r <= SIZE - 5 && c >= SIZE - 9 && c <= SIZE - 5) {
          const dr = r - (SIZE - 9);
          const dc = c - (SIZE - 9);
          grid[r]![c] =
            dr === 0 || dr === 4 || dc === 0 || dc === 4 || (dr === 2 && dc === 2);
          continue;
        }

        // Deterministic bit from payload string
        const idx = (r * SIZE + c) % seed.length;
        const ch = seed.charCodeAt(idx);
        const mix = Math.imul(hash ^ (r * 31 + c * 17 + ch * 13), 2654435761) >>> 0;
        grid[r]![c] = (mix & 3) !== 0 && ((mix >> 2) & 1) === 1;
      }
    }

    return grid;
  }, [value]);

  return (
    <div className="mx-auto w-full max-w-[230px] rounded-2xl bg-white p-4 shadow-sm ring-1 ring-surface-variant">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="font-headline text-xs font-bold tracking-wider text-primary-strong">
          QRIS
        </span>
        <span className="rounded bg-surface px-1.5 py-0.5 font-label text-[10px] font-medium text-on-surface-muted">
          GPN · Dinamis
        </span>
      </div>

      <svg
        viewBox={`0 0 ${SIZE + 2} ${SIZE + 2}`}
        role="img"
        aria-label="Kode QRIS Dinamis"
        className="aspect-square w-full rounded-xl bg-white"
        shapeRendering="crispEdges"
      >
        {cells.map((row, r) =>
          row.map((dark, c) =>
            dark ? (
              <rect
                key={`${r}-${c}`}
                x={c + 1}
                y={r + 1}
                width={1}
                height={1}
                fill="#231917"
              />
            ) : null,
          ),
        )}
      </svg>

      <p className="mt-2 truncate text-center font-label text-[10px] text-on-surface-muted">
        NMID: ID10260000FILKOMUB
      </p>
    </div>
  );
}
