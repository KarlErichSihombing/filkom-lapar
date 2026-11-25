-- =====================================================================
-- Tahap 5: Proses Pesanan Real-Time (Penjual: Terima -> Siap Diambil -> Selesai)
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

-- 1) Pastikan REPLICA IDENTITY FULL pada tabel pesanan dan pembayaran
-- agar Supabase Realtime selalu mengirim seluruh kolom pada event UPDATE dengan filter.
alter table public.pesanan replica identity full;
alter table public.pembayaran replica identity full;

-- 2) Izinkan penjual melihat nama & no_telp pembeli yang memesan di stand-nya
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'penjual baca profil pembeli pesanan'
  ) then
    create policy "penjual baca profil pembeli pesanan" on public.profiles
      for select to authenticated
      using (
        exists (
          select 1
          from public.pesanan p
          join public.toko t on t.id = p.toko_id
          where p.pembeli_id = profiles.id
            and t.penjual_id = (select auth.uid())
        )
      );
  end if;
end;
$$;

-- 3) Fungsi atomik bagi penjual untuk memajukan status pesanan:
--    'dibayar' -> 'diproses' -> 'siap_diambil' -> 'selesai'
create or replace function public.proses_status_pesanan(
  p_pesanan_id uuid,
  p_status_baru text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_status_lama varchar(30);
  v_penjual_id uuid;
begin
  if v_user is null then
    raise exception 'Belum login.';
  end if;

  select p.status_pesanan, t.penjual_id
    into v_status_lama, v_penjual_id
  from public.pesanan p
  join public.toko t on t.id = p.toko_id
  where p.id = p_pesanan_id
  for update of p;

  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;

  if v_penjual_id <> v_user then
    raise exception 'Anda tidak berhak memproses pesanan stand lain.';
  end if;

  if v_status_lama = p_status_baru then
    return true;
  end if;

  if not (
    (v_status_lama = 'dibayar' and p_status_baru = 'diproses') or
    (v_status_lama = 'diproses' and p_status_baru = 'siap_diambil') or
    (v_status_lama = 'siap_diambil' and p_status_baru = 'selesai')
  ) then
    raise exception 'Perubahan status dari "%" ke "%" tidak valid.', v_status_lama, p_status_baru;
  end if;

  update public.pesanan
  set status_pesanan = p_status_baru,
      updated_at = now()
  where id = p_pesanan_id;

  return true;
end;
$$;

revoke execute on function public.proses_status_pesanan(uuid, text) from public, anon;
grant execute on function public.proses_status_pesanan(uuid, text) to authenticated, service_role;

-- 4) Pastikan tabel pesanan & pembayaran terdaftar di publikasi supabase_realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pesanan'
  ) then
    alter publication supabase_realtime add table public.pesanan;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pembayaran'
  ) then
    alter publication supabase_realtime add table public.pembayaran;
  end if;
end;
$$;
