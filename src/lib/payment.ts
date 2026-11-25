import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createXenditDynamicQr } from "@/lib/xendit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Pastikan baris pembayaran memiliki QRIS dinamis (external_id, xendit_qr_id, token_payment).
 * Bila sudah ada, langsung kembalikan data yang tersimpan.
 */
export async function ensurePembayaranQr(pembayaranId: string): Promise<{
  qrString: string | null;
  qrId: string | null;
  externalId: string | null;
}> {
  if (!UUID_RE.test(pembayaranId)) {
    return { qrString: null, qrId: null, externalId: null };
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("pembayaran")
    .select("id, total_bayar, status_pembayaran, external_id, xendit_qr_id, token_payment, expires_at")
    .eq("id", pembayaranId)
    .maybeSingle();

  if (error || !row) {
    return { qrString: null, qrId: null, externalId: null };
  }

  if (row.token_payment) {
    return {
      qrString: row.token_payment,
      qrId: row.xendit_qr_id,
      externalId: row.external_id ?? row.id,
    };
  }

  if (row.status_pembayaran !== "menunggu") {
    return {
      qrString: row.token_payment,
      qrId: row.xendit_qr_id,
      externalId: row.external_id ?? row.id,
    };
  }

  const qr = await createXenditDynamicQr({
    pembayaranId: row.id,
    amount: Number(row.total_bayar),
    expiresAt: row.expires_at,
  });

  await admin
    .from("pembayaran")
    .update({
      external_id: qr.referenceId,
      xendit_qr_id: qr.qrId,
      token_payment: qr.qrString,
    })
    .eq("id", row.id);

  return {
    qrString: qr.qrString,
    qrId: qr.qrId,
    externalId: qr.referenceId,
  };
}

/**
 * Konfirmasi pembayaran menjadi 'berhasil' dan ubah semua pesanan terkait menjadi 'dibayar'.
 * Memakai fungsi RPC konfirmasi_pembayaran() bila sudah dijalankan di Supabase,
 * dengan fallback update langsung via service_role.
 */
export async function confirmPaymentInDb(pembayaranId: string): Promise<{
  ok: boolean;
  paidAt?: string;
  error?: string;
}> {
  if (!UUID_RE.test(pembayaranId)) {
    return { ok: false, error: "ID pembayaran tidak valid." };
  }

  const admin = createAdminClient();

  // Coba panggil RPC atomik dari 004_pembayaran_xendit.sql terlebih dahulu
  const rpcRes = await admin.rpc("konfirmasi_pembayaran", {
    p_pembayaran_id: pembayaranId,
  });

  if (rpcRes.error) {
    // Fallback bila SQL 004 belum sempat dijalankan di Supabase SQL Editor
    const nowIso = new Date().toISOString();
    const { data: current } = await admin
      .from("pembayaran")
      .select("id, status_pembayaran, waktu_bayar")
      .eq("id", pembayaranId)
      .maybeSingle();

    if (!current) {
      return { ok: false, error: "Data pembayaran tidak ditemukan." };
    }

    const paidAt = current.waktu_bayar ?? nowIso;

    if (current.status_pembayaran === "menunggu") {
      const { error: payErr } = await admin
        .from("pembayaran")
        .update({ status_pembayaran: "berhasil", waktu_bayar: paidAt })
        .eq("id", pembayaranId);

      if (payErr) {
        return { ok: false, error: "Gagal memperbarui status pembayaran." };
      }

      await admin
        .from("pesanan")
        .update({ status_pesanan: "dibayar", updated_at: nowIso })
        .eq("pembayaran_id", pembayaranId)
        .eq("status_pesanan", "menunggu_pembayaran");
    }

    return { ok: true, paidAt };
  }

  const { data: updated } = await admin
    .from("pembayaran")
    .select("waktu_bayar, status_pembayaran")
    .eq("id", pembayaranId)
    .maybeSingle();

  if (!updated || updated.status_pembayaran !== "berhasil") {
    return { ok: false, error: "Pembayaran sudah tidak berstatus menunggu." };
  }

  return { ok: true, paidAt: updated.waktu_bayar ?? new Date().toISOString() };
}
