/** Satu stand di daftar beranda pembeli, lengkap dengan ringkasan menunya. */
export type StandCard = {
  id: string;
  noStand: number;
  namaToko: string;
  buka: boolean;
  rating: number;
  menu: {
    id: string;
    namaMenu: string;
    fotoUrl: string | null;
    tersedia: boolean;
  }[];
};