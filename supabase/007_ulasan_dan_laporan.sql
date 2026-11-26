-- =====================================================================
-- Tahap 7: Ulasan & Rating Langsung pada Stand Kantin (tanpa harus
-- menunggu pesanan selesai) + Auto-update rating_rata_rata toko.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

-- ---------- 1) Tabel Ulasan ----------
create table if not exists public.ulasan (
  id uuid primary key default gen_random_uuid(),
  pesanan_id uuid unique references public.pesanan(id) on delete set null,
  pembeli_id uuid not null references public.profiles(id) on delete cascade,
  toko_id uuid not null references public.toko(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  komentar varchar(500),
  created_at timestamptz not null default now()
);

-- Jika tabel ulasan sudah terlanjur dibuat dengan pesanan_id NOT NULL, longgarkan menjadi NULLABLE
alter table public.ulasan alter column pesanan_id drop not null;

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

-- ---------- 2) Fungsi Atomik tambah_ulasan_toko() ----------
-- Pembeli bisa langsung memberi rating (1-5) & ulasan ke stand kantin mana pun
-- dari halaman stand tanpa harus memesan sampai selesai terlebih dahulu.
create or replace function public.tambah_ulasan_toko(
  p_toko_id uuid,
  p_rating integer,
  p_komentar text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_komentar varchar(500);
  v_ulasan_id uuid;
  v_rata_baru real;
begin
  if v_user is null then
    raise exception 'Belum login.';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Pilih rating antara 1 sampai 5 bintang.';
  end if;

  if not exists (select 1 from public.toko where id = p_toko_id and aktif) then
    raise exception 'Stand kantin tidak ditemukan.';
  end if;

  v_komentar := left(trim(coalesce(p_komentar, '')), 500);

  insert into public.ulasan (toko_id, pembeli_id, rating, komentar)
  values (p_toko_id, v_user, p_rating, nullif(v_komentar, ''))
  returning id into v_ulasan_id;

  select coalesce(round(avg(rating)::numeric, 2)::real, 0)
    into v_rata_baru
  from public.ulasan
  where toko_id = p_toko_id;

  update public.toko
  set rating_rata_rata = v_rata_baru
  where id = p_toko_id;

  return v_ulasan_id;
end;
$$;

revoke execute on function public.tambah_ulasan_toko(uuid, integer, text) from public, anon;
grant execute on function public.tambah_ulasan_toko(uuid, integer, text) to authenticated, service_role;

-- ---------- 3) Fungsi tambah_ulasan() dari kartu pesanan (tanpa wajib selesai) ----------
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

  select id, pembeli_id, toko_id
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

  insert into public.ulasan (pesanan_id, pembeli_id, toko_id, rating, komentar)
  values (p_pesanan_id, v_user, v_pesanan.toko_id, p_rating, nullif(v_komentar, ''))
  on conflict (pesanan_id) do update
    set rating = excluded.rating,
        komentar = excluded.komentar,
        created_at = now();

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

-- ---------- 4) Daftarkan ulasan ke publikasi supabase_realtime ----------
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
