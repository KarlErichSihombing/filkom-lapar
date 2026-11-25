export type StatusPembayaran = "menunggu" | "berhasil" | "gagal" | "kedaluwarsa";

export type StatusPesanan =
  | "menunggu_pembayaran"
  | "dibayar"
  | "diproses"
  | "siap_diambil"
  | "selesai"
  | "dibatalkan"
  | "kedaluwarsa";

export const STATUS_PESANAN_LABEL: Record<StatusPesanan, string> = {
  menunggu_pembayaran: "Menunggu Pembayaran",
  dibayar: "Dibayar",
  diproses: "Diproses",
  siap_diambil: "Siap Diambil",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
  kedaluwarsa: "Kedaluwarsa",
};

export const STATUS_PESANAN_BADGE: Record<StatusPesanan, string> = {
  menunggu_pembayaran: "bg-primary-container text-primary-strong",
  dibayar: "bg-tertiary-container text-tertiary-strong",
  diproses: "bg-tertiary-container text-tertiary-strong",
  siap_diambil: "bg-secondary-container text-secondary",
  selesai: "bg-secondary-container text-secondary",
  dibatalkan: "bg-error/10 text-error",
  kedaluwarsa: "bg-surface-variant text-on-surface-muted",
};

export const STATUS_PEMBAYARAN_LABEL: Record<StatusPembayaran, string> = {
  menunggu: "Menunggu Pembayaran",
  berhasil: "Dibayar",
  gagal: "Gagal",
  kedaluwarsa: "Kedaluwarsa",
};

export type DetailPesananItem = {
  menuId: string;
  namaMenu: string;
  jumlah: number;
  hargaSatuan: number;
  subtotal: number;
  catatan: string | null;
};

export type PesananSummary = {
  id: string;
  kode: string;
  tokoId: string;
  namaToko: string;
  noStand: number | null;
  pembayaranId: string;
  totalHarga: number;
  statusPesanan: StatusPesanan;
  alasanPembatalan: string | null;
  createdAt: string;
  items: DetailPesananItem[];
};
