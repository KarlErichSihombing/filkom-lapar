-- =====================================================================
-- Tahap 4: Pembayaran Xendit (QRIS dinamis, webhook, status "Dibayar",
-- dan aktivasi Supabase Realtime untuk tabel pembayaran & pesanan).
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

-- 1) Fungsi atomik konfirmasi pembayaran (dipanggil oleh webhook Xendit / server)
-- Idempoten: jika webhook terkirim lebih dari sekali, waktu_bayar pertama tetap
-- dipertahankan dan pesanan yang sudah lanjut ('diproses', dll.) tidak tertimpa.
create or replace function public.konfirmasi_pembayaran(p_pembayaran_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status varchar(30);
begin
  select status_pembayaran into v_status
  from public.pembayaran
  where id = p_pembayaran_id
  for update;

  if not found then
    return false;
  end if;

  if v_status = 'berhasil' then
    return true;
  end if;

  if v_status <> 'menunggu' then
    return false;
  end if;

  update public.pembayaran
  set status_pembayaran = 'berhasil',
      waktu_bayar = coalesce(waktu_bayar, now())
  where id = p_pembayaran_id;

  update public.pesanan
  set status_pesanan = 'dibayar',
      updated_at = now()
  where pembayaran_id = p_pembayaran_id
    and status_pesanan = 'menunggu_pembayaran';

  return true;
end;
$$;

-- Hanya service_role (server / webhook) yang boleh mengonfirmasi pembayaran
revoke execute on function public.konfirmasi_pembayaran(uuid) from public, anon, authenticated;
grant execute on function public.konfirmasi_pembayaran(uuid) to service_role;

-- 2) Aktifkan Realtime pada tabel pembayaran dan pesanan agar halaman pembeli
-- dan dashboard penjual langsung berubah tanpa perlu refresh halaman.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pembayaran'
  ) then
    alter publication supabase_realtime add table public.pembayaran;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pesanan'
  ) then
    alter publication supabase_realtime add table public.pesanan;
  end if;
end;
$$;
