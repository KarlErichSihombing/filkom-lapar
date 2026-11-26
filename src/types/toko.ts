import type { Kategori, MenuItem } from "@/types/menu";

export type StandMenuCard = {
  id: string;
  namaMenu: string;
  deskripsi: string | null;
  harga: number;
  kategori: Kategori;
  fotoUrl: string | null;
  tersedia: boolean;
  terjual: number;
};

export type StandReviewItem = {
  id: string;
  namaPembeli: string;
  rating: number;
  komentar: string | null;
  createdAt: string;
};

/** Satu stand di daftar beranda pembeli, lengkap dengan seluruh menu aktif dan ulasannya. */
export type StandCard = {
  id: string;
  noStand: number;
  namaToko: string;
  buka: boolean;
  rating: number;
  reviewCount: number;
  fotoUrl: string | null;
  menu: StandMenuCard[];
  reviews: StandReviewItem[];
};

/** Rekomendasi Best Seller berdasarkan data transaksi real di database. */
export type BestSellerItem = {
  menuId: string;
  namaMenu: string;
  deskripsi: string | null;
  harga: number;
  kategori: Kategori;
  fotoUrl: string | null;
  tersedia: boolean;
  terjual: number;
  tokoId: string;
  namaToko: string;
  noStand: number;
  buka: boolean;
  rating: number;
  menuTersediaStand: number;
};

/** Stand beserta katalog menu lengkap (dipakai hook realtime katalog). */
export type StandCatalog = {
  id: string;
  noStand: number;
  namaToko: string;
  buka: boolean;
  rating: number;
  fotoUrl: string | null;
  menu: MenuItem[];
};
