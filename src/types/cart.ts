export type CartLine = {
  menuId: string;
  tokoId: string | null;
  namaMenu: string;
  harga: number;
  fotoUrl: string | null;
  jumlah: number;
  catatan: string;
  namaToko: string;
  noStand: number | null;
  /** Menu masih ada, tersedia, dan standnya buka. */
  valid: boolean;
  reason: string | null;
};

export type MenuSnapshot = Pick<
  CartLine,
  "menuId" | "tokoId" | "namaMenu" | "harga" | "fotoUrl" | "namaToko" | "noStand"
>;