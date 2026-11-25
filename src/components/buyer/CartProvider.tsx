"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  hapusItem,
  muatKeranjang,
  simpanCatatan,
  ubahJumlah,
} from "@/actions/cart";
import type { CartLine, MenuSnapshot } from "@/types/cart";

type CartCtx = {
  lines: CartLine[];
  /** Total porsi di keranjang */
  itemCount: number;
  standCount: number;
  /** Total harga baris yang valid */
  total: number;
  hasInvalid: boolean;
  qtyOf: (menuId: string) => number;
  add: (snap: MenuSnapshot) => void;
  increment: (menuId: string) => void;
  decrement: (menuId: string) => void;
  remove: (menuId: string) => void;
  setNote: (menuId: string, note: string) => void;
  refresh: () => Promise<void>;
  clear: () => void;
  error: string | null;
  dismissError: () => void;
};

const CartContext = createContext<CartCtx | null>(null);

function applyDelta(
  lines: CartLine[],
  menuId: string,
  delta: number,
  snap?: MenuSnapshot,
): CartLine[] {
  const i = lines.findIndex((l) => l.menuId === menuId);
  if (i === -1) {
    if (delta <= 0 || !snap) return lines;
    return [
      ...lines,
      {
        ...snap,
        jumlah: Math.min(99, delta),
        catatan: "",
        valid: true,
        reason: null,
      },
    ];
  }
  const jumlah = Math.min(99, lines[i].jumlah + delta);
  if (jumlah <= 0) return lines.filter((_, j) => j !== i);
  return lines.map((l, j) => (j === i ? { ...l, jumlah } : l));
}

/**
 * Keranjang disimpan di database, tetapi perubahannya langsung tampil di layar
 * (optimis) dan dikembalikan bila server menolak.
 */
export function CartProvider({
  initialLines,
  children,
}: {
  initialLines: CartLine[];
  children: ReactNode;
}) {
  const [lines, setLines] = useState(initialLines);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLines(await muatKeranjang());
    } catch {
      /* biarkan data yang ada */
    }
  }, []);

  const change = useCallback((menuId: string, delta: number, snap?: MenuSnapshot) => {
    setError(null);
    setLines((prev) => applyDelta(prev, menuId, delta, snap));
    const revert = (message: string) => {
      setLines((prev) => applyDelta(prev, menuId, -delta, snap));
      setError(message);
    };
    ubahJumlah(menuId, delta)
      .then((res) => {
        if (res.error) revert(res.error);
      })
      .catch(() => revert("Koneksi bermasalah. Perubahan keranjang dibatalkan."));
  }, []);

  const remove = useCallback(
    (menuId: string) => {
      setError(null);
      setLines((prev) => prev.filter((l) => l.menuId !== menuId));
      hapusItem(menuId)
        .then((res) => {
          if (res.error) {
            setError(res.error);
            void refresh();
          }
        })
        .catch(() => void refresh());
    },
    [refresh],
  );

  const setNote = useCallback((menuId: string, note: string) => {
    setLines((prev) => prev.map((l) => (l.menuId === menuId ? { ...l, catatan: note } : l)));
    simpanCatatan(menuId, note)
      .then((res) => {
        if (res.error) setError(res.error);
      })
      .catch(() => setError("Koneksi bermasalah. Catatan belum tersimpan."));
  }, []);

  const value = useMemo<CartCtx>(() => {
    const valid = lines.filter((l) => l.valid);
    return {
      lines,
      itemCount: lines.reduce((n, l) => n + l.jumlah, 0),
      standCount: new Set(lines.map((l) => l.tokoId).filter(Boolean)).size,
      total: valid.reduce((n, l) => n + l.jumlah * l.harga, 0),
      hasInvalid: lines.some((l) => !l.valid),
      qtyOf: (menuId) => lines.find((l) => l.menuId === menuId)?.jumlah ?? 0,
      add: (snap) => change(snap.menuId, 1, snap),
      increment: (menuId) => change(menuId, 1),
      decrement: (menuId) => change(menuId, -1),
      remove,
      setNote,
      refresh,
      clear: () => setLines([]),
      error,
      dismissError: () => setError(null),
    };
  }, [lines, error, change, remove, setNote, refresh]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart harus dipakai di dalam CartProvider");
  return ctx;
}