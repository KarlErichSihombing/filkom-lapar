"use server";

import { revalidatePath } from "next/cache";
import { confirmPaymentInDb, ensurePembayaranQr } from "@/lib/payment";
import { createClient } from "@/lib/supabase/server";
import { triggerXenditQrSimulate } from "@/lib/xendit";

export type PaymentActionResult = {
  ok?: boolean;
  error?: string;
  paidAt?: string;
  xenditSimulated?: boolean;
  xenditNotice?: string;
};

/**
 * Simulasi pembayaran QRIS untuk keperluan pengujian & demo Tahap 4:
 * 1. Memastikan tagihan adalah milik pembeli yang sedang login.
 * 2. Bila terhubung ke QR Xendit Test Mode, memanggil endpoint simulate Xendit
 *    agar Xendit juga mencatat transaksi & mengirim webhook.
 * 3. Mengonfirmasi status pembayaran menjadi 'berhasil' dan pesanan menjadi 'dibayar'
 *    secara idempoten (sehingga di localhost tanpa tunnel pun status langsung berubah).
 */
export async function simulasiBayar(pembayaranId: string): Promise<PaymentActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi login berakhir. Silakan masuk kembali." };

  const { data: pembayaran, error } = await supabase
    .from("pembayaran")
    .select("id, pembeli_id, total_bayar, status_pembayaran, xendit_qr_id, waktu_bayar")
    .eq("id", pembayaranId)
    .maybeSingle();

  if (error || !pembayaran) {
    return { error: "Tagihan tidak ditemukan." };
  }

  if (pembayaran.status_pembayaran === "berhasil") {
    return { ok: true, paidAt: pembayaran.waktu_bayar ?? new Date().toISOString() };
  }

  if (pembayaran.status_pembayaran !== "menunggu") {
    return { error: `Tagihan tidak dapat dibayar (status: ${pembayaran.status_pembayaran}).` };
  }

  // Pastikan QR sudah dibuat terlebih dahulu
  const qrInfo = await ensurePembayaranQr(pembayaran.id);
  const qrId = qrInfo.qrId ?? pembayaran.xendit_qr_id;

  let xenditSimulated = false;
  let xenditNotice: string | undefined = qrInfo.xenditError;
  if (qrId) {
    const sim = await triggerXenditQrSimulate(qrId, Number(pembayaran.total_bayar));
    xenditSimulated = sim.calledXendit && sim.xenditOk;
    if (sim.calledXendit && !sim.xenditOk && sim.message) {
      xenditNotice = `Simulasi Xendit gagal: ${sim.message}`;
    }
  }

  const confirmed = await confirmPaymentInDb(pembayaran.id);
  if (!confirmed.ok) {
    return { error: confirmed.error ?? "Gagal mengonfirmasi pembayaran." };
  }

  revalidatePath(`/pembayaran/${pembayaran.id}`);
  revalidatePath("/pesanan");
  revalidatePath("/dashboard");

  return {
    ok: true,
    paidAt: confirmed.paidAt,
    xenditSimulated,
    xenditNotice,
  };
}

/** Muat ulang status pembayaran dari database. */
export async function segarkanPembayaran(pembayaranId: string): Promise<PaymentActionResult> {
  revalidatePath(`/pembayaran/${pembayaranId}`);
  revalidatePath("/pesanan");
  return { ok: true };
}
