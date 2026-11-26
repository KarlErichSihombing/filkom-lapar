-- =====================================================================
-- Tahap 7: Ulasan & Rating (1 ulasan per pesanan selesai, auto-update
-- rating_rata_rata toko) dan Laporan Penjualan.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

-- ---------- 1) Tabel Ulasan ----------
create table if not exists public.ulasan (
  id uuid primary key default gen_random_uuid(),
  pesanan_id uuid not null unique references public.pesanan(id) on delete cascade,
  pembeli_id uuid not null references public.profiles(id) on delete cascade,
  toko_id uuid not null references public.toko(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  komentar varchar(500),
  created_at timestamptz not null default now()
);

create index if not exists ulasan_toko_idx on public.ulasan (toko_id, created_at desc);
create index if not exists ulasan_pembeli_idx on public.ulasan (pembeli_id, created_at desc);

alter table public.ulasan enable row level security;
alter table public.ulasan replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ulasan'
      and policyname = 'semua pengguna login baca ulasan'
  ) then
    create policy "semua pengguna login baca ulasan" on public.ulasan
      for select to authenticated
      using (true);
  end if;
end;
$$;

grant select on public.ulasan to authenticated;
grant all on public.ulasan to service_role;

-- ---------- 2) Fungsi Atomik tambah_ulasan() ----------
-- Hanya pembeli pemilik pesanan berstatus 'selesai' yang dapat memberi ulasan,
-- maksimal 1 kali per pesanan, sekaligus memperbarui toko.rating_rata_rata.
create or replace function public.tambah_ulasan(
  p_pesanan_id uuid,
  p_rating integer,
  p_komentar text default ''
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_pesanan record;
  v_komentar varchar(500);
  v_rata_baru real;
begin
  if v_user is null then
    raise exception 'Belum login.';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Pilih rating antara 1 sampai 5 bintang.';
  end if;

  v_komentar := left(trim(coalesce(p_komentar, '')), 500);

  select id, pembeli_id, toko_id, status_pesanan
    into v_pesanan
  from public.pesanan
  where id = p_pesanan_id
  for update;

  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;

  if v_pesanan.pembeli_id <> v_user then
    raise exception 'Anda tidak berhak mengulas pesanan ini.';
  end if;

  if v_pesanan.status_pesanan <> 'selesai' then
    raise exception 'Ulasan hanya dapat diberikan pada pesanan yang sudah berstatus Selesai.';
  end if;

  if exists (select 1 from public.ulasan where pesanan_id = p_pesanan_id) then
    raise exception 'Pesanan ini sudah pernah diulas.';
  end if;

  insert into public.ulasan (pesanan_id, pembeli_id, toko_id, rating, komentar)
  values (p_pesanan_id, v_user, v_pesanan.toko_id, p_rating, nullif(v_komentar, ''));

  select coalesce(round(avg(rating)::numeric, 2)::real, 0)
    into v_rata_baru
  from public.ulasan
  where toko_id = v_pesanan.toko_id;

  update public.toko
  set rating_rata_rata = v_rata_baru
  where id = v_pesanan.toko_id;

  return true;
end;
$$;

revoke execute on function public.tambah_ulasan(uuid, integer, text) from public, anon;
grant execute on function public.tambah_ulasan(uuid, integer, text) to authenticated, service_role;

-- ---------- 3) Daftarkan ulasan ke publikasi supabase_realtime ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ulasan'
  ) then
    alter publication supabase_realtime add table public.ulasan;
  end if;
end;
$$;
