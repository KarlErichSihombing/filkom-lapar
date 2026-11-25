// Supabase Edge Function: xendit-webhook
// Opsional: gunakan ini bila ingin mendaftarkan URL webhook Xendit langsung ke Supabase
// (mis. https://<project-ref>.supabase.co/functions/v1/xendit-webhook)
// sehingga tetap bisa menerima webhook dari Xendit meski frontend berjalan di localhost.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const expectedToken =
    Deno.env.get("CALLBACK_TOKEN") || Deno.env.get("XENDIT_WEBHOOK_TOKEN");
  if (expectedToken) {
    const incoming = req.headers.get("x-callback-token");
    if (!incoming || incoming !== expectedToken) {
      return new Response(JSON.stringify({ error: "Invalid callback token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawStatus = String(
    body?.data?.status ??
      body?.status ??
      (body?.event === "qr.payment" ? "SUCCEEDED" : ""),
  ).toUpperCase();

  if (!["SUCCEEDED", "COMPLETED", "PAID", "SETTLED"].includes(rawStatus)) {
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const refId =
    body?.data?.reference_id ??
    body?.data?.external_id ??
    body?.qr_code?.external_id ??
    body?.reference_id ??
    body?.external_id ??
    null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let pembayaranId: string | null = refId;
  if (pembayaranId) {
    const { data } = await supabase
      .from("pembayaran")
      .select("id")
      .or(`id.eq.${pembayaranId},external_id.eq.${pembayaranId}`)
      .maybeSingle();
    pembayaranId = data?.id ?? null;
  }

  if (!pembayaranId) {
    return new Response(
      JSON.stringify({ ok: true, testWebhook: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  await supabase.rpc("konfirmasi_pembayaran", {
    p_pembayaran_id: pembayaranId,
  });

  return new Response(
    JSON.stringify({ ok: true, pembayaranId }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
