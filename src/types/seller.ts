/** Satu baris di tabel admin: satu stand beserta penjualnya. */
export type SellerRow = {
  tokoId: string;
  penjualId: string;
  noStand: number;
  namaToko: string;
  namaPenjual: string;
  email: string;
  aktif: boolean;
};