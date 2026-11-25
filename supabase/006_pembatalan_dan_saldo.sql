-- =====================================================================
-- Tahap 6: Pembatalan Pesanan (Timer 10 Detik di Server), Saldo Toko,
-- Saldo Refund Pembeli, dan Riwayat Mutasi Saldo Real-Time.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

-- ---------- 1) Tambahkan kolom saldo pada tabel toko ----------
alter table public.toko
  add column if not exists saldo numeric(12,2) not null default 0;

-- ---------- 2) Tabel Riwayat Mutasi Saldo Toko ----------
create table if not exists public.mutasi_saldo (
  id uuid primary key default gen_random_uuid(),
  toko_id uuid not null references public.toko(id) on delete cascade,
  pesanan_id uuid references public.pesanan(id) on delete set null,
  pembeli_id uuid references public.profiles(id) on delete set null,
  jenis varchar(40) not null
    check (jenis in ('pembayaran_masuk', 'pembatalan_pembeli', 'pembatalan_penjual')),
  nominal numeric(12,2) not null, -- positif (+) untuk masuk, negatif (-) untuk pemotongan/refund
  saldo_sebelum numeric(12,2) not null,
  saldo_sesudah numeric(12,2) not null,
  keterangan varchar(255) not null,
  created_at timestamptz not null default now()
);

create index if not exists mutasi_saldo_toko_idx
  on public.mutasi_saldo (toko_id, created_at desc);
create index if not exists mutasi_saldo_pembeli_idx
  on public.mutasi_saldo (pembeli_id, created_at desc);

alter table public.mutasi_saldo enable row level security;
alter table public.mutasi_saldo replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mutasi_saldo'
      and policyname = 'penjual baca mutasi stand sendiri'
  ) then
    create policy "penjual baca mutasi stand sendiri" on public.mutasi_saldo
      for select to authenticated
      using (
        exists (
          select 1 from public.toko t
          where t.id = mutasi_saldo.toko_id and t.penjual_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mutasi_saldo'
      and policyname = 'pembeli baca mutasi pesanan sendiri'
  ) then
    create policy "pembeli baca mutasi pesanan sendiri" on public.mutasi_saldo
      for select to authenticated
      using (pembeli_id = (select auth.uid()));
  end if;
end;
$$;

grant select on public.mutasi_saldo to authenticated;
grant all on public.mutasi_saldo to service_role;

-- ---------- 3) Tabel Saldo Refund / Kredit Pembeli per Toko ----------
create table if not exists public.saldo_pembeli (
  pembeli_id uuid not null references public.profiles(id) on delete cascade,
  toko_id uuid not null references public.toko(id) on delete cascade,
  saldo numeric(12,2) not null default 0 check (saldo >= 0),
  updated_at timestamptz not null default now(),
  primary key (pembeli_id, toko_id)
);

alter table public.saldo_pembeli enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'saldo_pembeli'
      and policyname = 'pembeli baca saldo sendiri'
  ) then
    create policy "pembeli baca saldo sendiri" on public.saldo_pembeli
      for select to authenticated
      using (pembeli_id = (select auth.uid()));
  end if;
end;
$$;

grant select on public.saldo_pembeli to authenticated;
grant all on public.saldo_pembeli to service_role;

-- ---------- 4) Perbarui konfirmasi_pembayaran() agar menambah saldo toko & mencatat mutasi ----------
create or replace function public.konfirmasi_pembayaran(p_pembayaran_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status varchar(30);
  v_pesanan record;
  v_saldo_lama numeric(12,2);
  v_saldo_baru numeric(12,2);
begin
  select status_pembayaran into v_status
  from public.pembayaran
  where id = p_pembayaran_id
  for update;

  if not found then return false; end if;
  if v_status = 'berhasil' then return true; end if;
  if v_status <> 'menunggu' then return false; end if;

  update public.pembayaran
  set status_pembayaran = 'berhasil',
      waktu_bayar = coalesce(waktu_bayar, now())
  where id = p_pembayaran_id;

  for v_pesanan in
    select id, kode, toko_id, pembeli_id, total_harga
    from public.pesanan
    where pembayaran_id = p_pembayaran_id
      and status_pesanan = 'menunggu_pembayaran'
    for update
  loop
    update public.pesanan
    set status_pesanan = 'dibayar',
        updated_at = now()
    where id = v_pesanan.id;

    select saldo into v_saldo_lama
    from public.toko
    where id = v_pesanan.toko_id
    for update;

    v_saldo_lama := coalesce(v_saldo_lama, 0);
    v_saldo_baru := v_saldo_lama + v_pesanan.total_harga;

    update public.toko
    set saldo = v_saldo_baru
    where id = v_pesanan.toko_id;

    insert into public.mutasi_saldo (
      toko_id, pesanan_id, pembeli_id, jenis, nominal,
      saldo_sebelum, saldo_sesudah, keterangan
    ) values (
      v_pesanan.toko_id,
      v_pesanan.id,
      v_pesanan.pembeli_id,
      'pembayaran_masuk',
      v_pesanan.total_harga,
      v_saldo_lama,
      v_saldo_baru,
      'Pembayaran pesanan #' || v_pesanan.kode
    );
  end loop;

  return true;
end;
$$;

revoke execute on function public.konfirmasi_pembayaran(uuid) from public, anon, authenticated;
grant execute on function public.konfirmasi_pembayaran(uuid) to service_role;

-- ---------- 5) Fungsi Pembatalan oleh Pembeli (Wajib <= 10 Detik di Server) ----------
create or replace function public.batalkan_pesanan_pembeli(
  p_pesanan_id uuid,
  p_alasan text default 'Ingin mengubah pesanan'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_pesanan record;
  v_waktu_bayar timestamptz;
  v_selisih_detik numeric;
  v_alasan varchar(255);
  v_saldo_lama numeric(12,2);
  v_saldo_baru numeric(12,2);
begin
  if v_user is null then
    raise exception 'Belum login.';
  end if;

  select p.id, p.kode, p.pembeli_id, p.toko_id, p.pembayaran_id,
         p.total_harga, p.status_pesanan, b.waktu_bayar
    into v_pesanan
  from public.pesanan p
  join public.pembayaran b on b.id = p.pembayaran_id
  where p.id = p_pesanan_id
  for update of p;

  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;

  if v_pesanan.pembeli_id <> v_user then
    raise exception 'Anda tidak berhak membatalkan pesanan ini.';
  end if;

  if v_pesanan.status_pesanan = 'dibatalkan' then
    raise exception 'Pesanan ini sudah dibatalkan.';
  end if;

  if v_pesanan.status_pesanan <> 'dibayar' then
    raise exception 'Pesanan sudah diproses oleh penjual dan tidak dapat dibatalkan.';
  end if;

  v_waktu_bayar := v_pesanan.waktu_bayar;
  if v_waktu_bayar is null then
    raise exception 'Pesanan belum memiliki waktu konfirmasi pembayaran.';
  end if;

  -- Validasi Timer Boundary Event 10 detik di sisi server (Postgres clock)
  v_selisih_detik := extract(epoch from (now() - v_waktu_bayar));
  if v_selisih_detik > 10 then
    raise exception 'Batas waktu pembatalan 10 detik telah habis (lewat % detik). Pesanan tidak dapat dibatalkan.',
      round(v_selisih_detik, 1);
  end if;

  v_alasan := coalesce(nullif(trim(p_alasan), ''), 'Dibatalkan oleh pembeli (<= 10 detik)');

  update public.pesanan
  set status_pesanan = 'dibatalkan',
      alasan_pembatalan = v_alasan,
      updated_at = now()
  where id = v_pesanan.id;

  update public.pembayaran
  set nominal_refund = nominal_refund + v_pesanan.total_harga
  where id = v_pesanan.pembayaran_id;

  -- Pemotongan / Credit Adjustment Saldo Toko secara real-time
  select saldo into v_saldo_lama
  from public.toko
  where id = v_pesanan.toko_id
  for update;

  v_saldo_lama := coalesce(v_saldo_lama, 0);
  v_saldo_baru := greatest(0, v_saldo_lama - v_pesanan.total_harga);

  update public.toko
  set saldo = v_saldo_baru
  where id = v_pesanan.toko_id;

  insert into public.mutasi_saldo (
    toko_id, pesanan_id, pembeli_id, jenis, nominal,
    saldo_sebelum, saldo_sesudah, keterangan
  ) values (
    v_pesanan.toko_id,
    v_pesanan.id,
    v_pesanan.pembeli_id,
    'pembatalan_pembeli',
    -v_pesanan.total_harga,
    v_saldo_lama,
    v_saldo_baru,
    'Refund pembatalan pembeli #' || v_pesanan.kode || ' (' || v_alasan || ')'
  );

  -- Tambahkan dana ke saldo toko pembeli
  insert into public.saldo_pembeli (pembeli_id, toko_id, saldo, updated_at)
  values (v_pesanan.pembeli_id, v_pesanan.toko_id, v_pesanan.total_harga, now())
  on conflict (pembeli_id, toko_id)
  do update set
    saldo = public.saldo_pembeli.saldo + excluded.saldo,
    updated_at = now();

  return true;
end;
$$;

revoke execute on function public.batalkan_pesanan_pembeli(uuid, text) from public, anon;
grant execute on function public.batalkan_pesanan_pembeli(uuid, text) to authenticated, service_role;

-- ---------- 6) Fungsi Pembatalan oleh Penjual (Sebelum Status Selesai) ----------
create or replace function public.batalkan_pesanan_penjual(
  p_pesanan_id uuid,
  p_alasan text default 'Stok menu habis'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_pesanan record;
  v_alasan varchar(255);
  v_saldo_lama numeric(12,2);
  v_saldo_baru numeric(12,2);
begin
  if v_user is null then
    raise exception 'Belum login.';
  end if;

  select p.id, p.kode, p.pembeli_id, p.toko_id, p.pembayaran_id,
         p.total_harga, p.status_pesanan, t.penjual_id
    into v_pesanan
  from public.pesanan p
  join public.toko t on t.id = p.toko_id
  where p.id = p_pesanan_id
  for update of p;

  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;

  if v_pesanan.penjual_id <> v_user then
    raise exception 'Anda tidak berhak membatalkan pesanan stand lain.';
  end if;

  if v_pesanan.status_pesanan in ('selesai', 'dibatalkan', 'menunggu_pembayaran', 'kedaluwarsa') then
    raise exception 'Pesanan dengan status "%" tidak dapat dibatalkan.', v_pesanan.status_pesanan;
  end if;

  v_alasan := coalesce(nullif(trim(p_alasan), ''), 'Dibatalkan oleh penjual (stok habis)');

  update public.pesanan
  set status_pesanan = 'dibatalkan',
      alasan_pembatalan = v_alasan,
      updated_at = now()
  where id = v_pesanan.id;

  update public.pembayaran
  set nominal_refund = nominal_refund + v_pesanan.total_harga
  where id = v_pesanan.pembayaran_id;

  -- Pemotongan / Credit Adjustment Saldo Toko
  select saldo into v_saldo_lama
  from public.toko
  where id = v_pesanan.toko_id
  for update;

  v_saldo_lama := coalesce(v_saldo_lama, 0);
  v_saldo_baru := greatest(0, v_saldo_lama - v_pesanan.total_harga);

  update public.toko
  set saldo = v_saldo_baru
  where id = v_pesanan.toko_id;

  insert into public.mutasi_saldo (
    toko_id, pesanan_id, pembeli_id, jenis, nominal,
    saldo_sebelum, saldo_sesudah, keterangan
  ) values (
    v_pesanan.toko_id,
    v_pesanan.id,
    v_pesanan.pembeli_id,
    'pembatalan_penjual',
    -v_pesanan.total_harga,
    v_saldo_lama,
    v_saldo_baru,
    'Refund pembatalan penjual #' || v_pesanan.kode || ' (' || v_alasan || ')'
  );

  -- Kembalikan dana ke saldo toko pembeli
  insert into public.saldo_pembeli (pembeli_id, toko_id, saldo, updated_at)
  values (v_pesanan.pembeli_id, v_pesanan.toko_id, v_pesanan.total_harga, now())
  on conflict (pembeli_id, toko_id)
  do update set
    saldo = public.saldo_pembeli.saldo + excluded.saldo,
    updated_at = now();

  return true;
end;
$$;

revoke execute on function public.batalkan_pesanan_penjual(uuid, text) from public, anon;
grant execute on function public.batalkan_pesanan_penjual(uuid, text) to authenticated, service_role;

-- ---------- 7) Daftarkan mutasi_saldo ke publikasi supabase_realtime ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mutasi_saldo'
  ) then
    alter publication supabase_realtime add table public.mutasi_saldo;
  end if;
end;
$$;
