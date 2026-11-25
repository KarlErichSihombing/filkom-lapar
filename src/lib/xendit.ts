import "server-only";

export type XenditQrResult = {
  qrId: string;
  referenceId: string;
  qrString: string;
  isSimulatedFallback: boolean;
};

type CreateQrParams = {
  pembayaranId: string;
  amount: number;
  expiresAt: string;
};

function basicAuthHeader(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

/**
 * Buat payload EMVCo QRIS simulasi bila XENDIT_SECRET_KEY belum diisi
 * atau ketika akun Xendit belum mengaktifkan channel QRIS.
 */
function buildFallbackQrString(pembayaranId: string, amount: number) {
  const cleanId = pembayaranId.replace(/-/g, "").slice(0, 16).toUpperCase();
  return `00020101021226660014ID.CO.XENDIT.WWW01189360089802559966230215${cleanId}52045812530336054${String(
    Math.round(amount),
  ).length.toString().padStart(2, "0")}${Math.round(amount)}5802ID5912FILKOM LAPAR6006MALANG6304ABCD`;
}

/**
 * Membuat QRIS Dinamis di Xendit (API version 2022-07-31) dengan nominal persis.
 */
export async function createXenditDynamicQr({
  pembayaranId,
  amount,
  expiresAt,
}: CreateQrParams): Promise<XenditQrResult> {
  const secretKey = process.env.XENDIT_SECRET_KEY?.trim();
  const nominal = Math.round(Number(amount));

  if (!secretKey) {
    return {
      qrId: `qr_sim_${pembayaranId.replace(/-/g, "").slice(0, 16)}`,
      referenceId: pembayaranId,
      qrString: buildFallbackQrString(pembayaranId, nominal),
      isSimulatedFallback: true,
    };
  }

  // Xendit mewajibkan expires_at di masa depan (minimal beberapa menit ke depan)
  const expDate = new Date(expiresAt);
  const safeExpiresAt =
    expDate.getTime() > Date.now() + 60_000
      ? expDate.toISOString()
      : new Date(Date.now() + 15 * 60_000).toISOString();

  const res = await fetch("https://api.xendit.co/qr_codes", {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(secretKey),
      "api-version": "2022-07-31",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reference_id: pembayaranId,
      type: "DYNAMIC",
      currency: "IDR",
      amount: nominal,
      expires_at: safeExpiresAt,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.warn("[Xendit] Gagal membuat QR via API, menggunakan fallback simulasi:", res.status, errBody);
    return {
      qrId: `qr_sim_${pembayaranId.replace(/-/g, "").slice(0, 16)}`,
      referenceId: pembayaranId,
      qrString: buildFallbackQrString(pembayaranId, nominal),
      isSimulatedFallback: true,
    };
  }

  const data = (await res.json()) as {
    id: string;
    reference_id?: string;
    qr_string: string;
  };

  return {
    qrId: data.id,
    referenceId: data.reference_id ?? pembayaranId,
    qrString: data.qr_string,
    isSimulatedFallback: false,
  };
}

/**
 * Memicu simulasi pembayaran QRIS di Xendit Test Mode:
 * POST https://api.xendit.co/qr_codes/{qr_id}/payments/simulate
 * Xendit akan otomatis menembak webhook ke URL webhook yang terdaftar.
 */
export async function triggerXenditQrSimulate(qrId: string, amount: number): Promise<{
  calledXendit: boolean;
  xenditOk: boolean;
  message?: string;
}> {
  const secretKey = process.env.XENDIT_SECRET_KEY?.trim();
  if (!secretKey || qrId.startsWith("qr_sim_")) {
    return { calledXendit: false, xenditOk: true };
  }

  try {
    const res = await fetch(
      `https://api.xendit.co/qr_codes/${encodeURIComponent(qrId)}/payments/simulate`,
      {
        method: "POST",
        headers: {
          Authorization: basicAuthHeader(secretKey),
          "api-version": "2022-07-31",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: Math.round(Number(amount)) }),
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        calledXendit: true,
        xenditOk: false,
        message: text || `HTTP ${res.status}`,
      };
    }

    return { calledXendit: true, xenditOk: true };
  } catch (err) {
    return {
      calledXendit: true,
      xenditOk: false,
      message: err instanceof Error ? err.message : "Gagal menghubungi Xendit",
    };
  }
}
