export type Kategori = "makanan" | "minuman" | "camilan";

export const KATEGORI_LABEL: Record<Kategori, string> = {
  makanan: "Makanan",
  minuman: "Minuman",
  camilan: "Camilan",
};

export type MenuItem = {
  id: string;
  namaMenu: string;
  deskripsi: string | null;
  harga: number;
  kategori: Kategori;
  fotoUrl: string | null;
  tersedia: boolean;
};