import type { MenuItem } from "@/types/menu";

/** Satu stand di daftar beranda pembeli, lengkap dengan ringkasan menunya. */
export type StandCard = {
  id: string;
  noStand: number;
  namaToko: string;
  buka: boolean;
  rating: number;
  fotoUrl: string | null;
  menu: {
    id: string;
    namaMenu: string;
    fotoUrl: string | null;
    tersedia: boolean;
  }[];
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
