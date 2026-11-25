import { NextResponse, type NextRequest } from "next/server";
import { confirmPaymentInDb } from "@/lib/payment";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type XenditWebhookPayload = {
  event?: string;
  status?: string;
  external_id?: string;
  reference_id?: string;
  qr_id?: string;
  data?: {
    id?: string;
    reference_id?: string;
    external_id?: string;
    qr_id?: string;
    status?: string;
  };
  qr_code?: {
    id?: string;
    external_id?: string;
    reference_id?: string;
  };
};

/**
 * Endpoint Webhook Xendit: POST /api/webhooks/xendit
 * Mendukung payload Xendit QR Code API v2022-07-31 (event: "qr.payment", status: "SUCCEEDED")
 * maupun payload versi lama (status: "COMPLETED", qr_code.external_id).
 */
export async function POST(request: NextRequest) {
  const expectedToken =
    process.env.XENDIT_WEBHOOK_TOKEN?.trim() ||
    process.env.XENDIT_CALLBACK_TOKEN?.trim() ||
    process.env.CALLBACK_TOKEN?.trim();

  if (expectedToken) {
    const incomingToken = request.headers.get("x-callback-token")?.trim();
    if (!incomingToken || incomingToken !== expectedToken) {
      return NextResponse.json(
        { error: "Callback token tidak valid." },
        { status: 401 },
      );
    }
  }

  let body: XenditWebhookPayload;
  try {
    body = (await request.json()) as XenditWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  const rawStatus = (
    body.data?.status ??
    body.status ??
    (body.event === "qr.payment" ? "SUCCEEDED" : "")
  ).toUpperCase();

  const isPaid = ["SUCCEEDED", "COMPLETED", "PAID", "SETTLED"].includes(rawStatus);
  if (!isPaid) {
    // Abaikan event non-paid (tetap balas 200 agar Xendit tidak retry terus)
    return NextResponse.json({ ok: true, ignored: true, status: rawStatus });
  }

  const refId =
    body.data?.reference_id ??
    body.data?.external_id ??
    body.qr_code?.external_id ??
    body.qr_code?.reference_id ??
    body.reference_id ??
    body.external_id ??
    null;

  const qrId = body.data?.qr_id ?? body.qr_code?.id ?? body.qr_id ?? null;

  const admin = createAdminClient();
  let pembayaranId: string | null = refId && UUID_RE.test(refId) ? refId : null;

  if (!pembayaranId && (refId || qrId)) {
    const query = admin.from("pembayaran").select("id");
    const { data: found } = refId
      ? await query.eq("external_id", refId).maybeSingle()
      : await query.eq("xendit_qr_id", qrId!).maybeSingle();
    pembayaranId = found?.id ?? null;
  }

  // Saat menekan tombol "Test and save" di Xendit Dashboard, reference_id adalah dummy data.
  // Balas 200 OK agar pengujian koneksi webhook di Xendit Dashboard berhasil.
  if (!pembayaranId) {
    return NextResponse.json({
      ok: true,
      testWebhook: true,
      message: "Webhook diterima (ID pembayaran dummy / tidak ditemukan di database).",
    });
  }

  const result = await confirmPaymentInDb(pembayaranId);
  return NextResponse.json({
    ok: result.ok,
    pembayaranId,
    paidAt: result.paidAt ?? null,
  });
}
