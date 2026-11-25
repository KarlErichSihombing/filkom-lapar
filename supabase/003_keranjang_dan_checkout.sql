-- =====================================================================
-- Tahap 3: keranjang multi-toko, pembayaran, pesanan, detail pesanan,
-- serta fungsi ubah_keranjang() dan checkout().
-- Jalankan di Supabase -> SQL Editor (pilih "Run and enable RLS" bila diminta).
-- =====================================================================

-- ---------- 1) Keranjang ----------
-- Satu baris = satu menu di keranjang seorang pembeli. Boleh campur banyak stand.
create table public.keranjang_item (
  pembeli_id uuid not null references public.profiles(id) on delete cascade,
  menu_id uuid not null references public.menu(id) on delete cascade,
  jumlah smallint not null default 1 check (jumlah between 1 and 99),
  catatan varchar(200),
  created_at timestamptz not null default now(),
  primary key (pembeli_id, menu_id)
);

alter table public.keranjang_item enable row level security;

create policy "baca keranjang sendiri" on public.keranjang_item
  for select to authenticated using (pembeli_id = (select auth.uid()));
create policy "ubah catatan keranjang sendiri" on public.keranjang_item
  for update to authenticated
  using (pembeli_id = (select auth.uid()))
  with check (pembeli_id = (select auth.uid()));
create policy "hapus keranjang sendiri" on public.keranjang_item
  for delete to authenticated using (pembeli_id = (select auth.uid()));

-- Menambah/mengurangi jumlah hanya lewat fungsi ubah_keranjang() di bawah
grant select, delete on public.keranjang_item to authenticated;
grant update (catatan) on public.keranjang_item to authenticated;
grant all on public.keranjang_item to service_role;

-- ---------- 2) Pembayaran (satu pembayaran bisa menutup beberapa pesanan) ----------
create table public.pembayaran (
  id uuid primary key default gen_random_uuid(),
  pembeli_id uuid not null references public.profiles(id),
  total_bayar numeric(12,2) not null check (total_bayar >= 0),
  metode_pembayaran varchar(50) not null default 'QRIS',
  status_pembayaran varchar(30) not null default 'menunggu'
    check (status_pembayaran in ('menunggu', 'berhasil', 'gagal', 'kedaluwarsa')),
  external_id text unique,          -- diisi saat membuat QR di Xendit (Tahap 4)
  xendit_qr_id text,
  token_payment text,
  waktu_bayar timestamptz,          -- dasar timer pembatalan 10 detik
  expires_at timestamptz not null,  -- batas waktu bayar
  nominal_refund numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.pembayaran enable row level security;
create policy "baca pembayaran sendiri" on public.pembayaran
  for select to authenticated using (pembeli_id = (select auth.uid()));

grant select on public.pembayaran to authenticated;
grant all on public.pembayaran to service_role;

-- ---------- 3) Pesanan (satu per stand) ----------
create sequence public.pesanan_kode_seq;

create table public.pesanan (
  id uuid primary key default gen_random_uuid(),
  kode varchar(20) not null unique
    default ('FK-' || lpad(nextval('public.pesanan_kode_seq')::text, 4, '0')),
  pembeli_id uuid not null references public.profiles(id),
  toko_id uuid not null references public.toko(id) on delete restrict,
  pembayaran_id uuid not null references public.pembayaran(id),
  total_harga numeric(12,2) not null check (total_harga >= 0),
  status_pesanan varchar(30) not null default 'menunggu_pembayaran'
    check (status_pesanan in (
      'menunggu_pembayaran', 'dibayar', 'diproses', 'siap_diambil',
      'selesai', 'dibatalkan', 'kedaluwarsa')),
  alasan_pembatalan varchar(255),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pesanan_pembeli_idx on public.pesanan (pembeli_id, created_at desc);
create index pesanan_toko_idx on public.pesanan (toko_id, status_pesanan);
create index pesanan_pembayaran_idx on public.pesanan (pembayaran_id);

alter table public.pesanan enable row level security;

create policy "pembeli baca pesanan sendiri" on public.pesanan
  for select to authenticated using (pembeli_id = (select auth.uid()));

-- Penjual hanya melihat pesanan stand-nya yang sudah dibayar
create policy "penjual baca pesanan masuk" on public.pesanan
  for select to authenticated
  using (
    status_pesanan not in ('menunggu_pembayaran', 'kedaluwarsa')
    and exists (
      select 1 from public.toko t
      where t.id = pesanan.toko_id and t.penjual_id = (select auth.uid())
    )
  );

grant select on public.pesanan to authenticated;
grant all on public.pesanan to service_role;

-- ---------- 4) Detail pesanan (harga dan nama menu dicatat saat checkout) ----------
create table public.detail_pesanan (
  pesanan_id uuid not null references public.pesanan(id) on delete cascade,
  menu_id uuid not null references public.menu(id) on delete restrict,
  nama_menu varchar(100) not null,
  jumlah smallint not null check (jumlah > 0),
  harga_satuan numeric(12,2) not null check (harga_satuan >= 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  catatan varchar(200),
  primary key (pesanan_id, menu_id)
);

alter table public.detail_pesanan enable row level security;

-- Boleh dilihat oleh siapa pun yang boleh melihat pesanan induknya
create policy "baca detail lewat pesanan" on public.detail_pesanan
  for select to authenticated
  using (exists (select 1 from public.pesanan p where p.id = detail_pesanan.pesanan_id));

grant select on public.detail_pesanan to authenticated;
grant all on public.detail_pesanan to service_role;

-- ---------- 5) ubah_keranjang(): tambah / kurangi jumlah (1 panggilan) ----------
create function public.ubah_keranjang(p_menu_id uuid, p_delta integer)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_jumlah integer;
begin
  if v_user is null then raise exception 'Belum login'; end if;

  if p_delta > 0 and not exists (
    select 1
    from public.menu m join public.toko t on t.id = m.toko_id
    where m.id = p_menu_id and m.deleted_at is null and m.tersedia
      and t.aktif and t.buka
  ) then
    raise exception 'Menu tidak tersedia atau stand sedang tutup.';
  end if;

  select jumlah into v_jumlah
  from public.keranjang_item
  where pembeli_id = v_user and menu_id = p_menu_id;

  v_jumlah := coalesce(v_jumlah, 0) + p_delta;

  if v_jumlah <= 0 then
    delete from public.keranjang_item
    where pembeli_id = v_user and menu_id = p_menu_id;
    return 0;
  end if;

  v_jumlah := least(v_jumlah, 99);
  insert into public.keranjang_item (pembeli_id, menu_id, jumlah)
  values (v_user, p_menu_id, v_jumlah)
  on conflict (pembeli_id, menu_id) do update set jumlah = excluded.jumlah;

  return v_jumlah;
end;
$$;

-- ---------- 6) checkout(): satu transaksi atomik ----------
-- Membaca keranjang pembeli, memeriksa semua menu, membuat 1 pembayaran,
-- 1 pesanan per stand beserta detailnya (harga diambil dari database, bukan dari layar),
-- lalu mengosongkan keranjang. Mengembalikan id pembayaran.
create function public.checkout(p_metode text default 'QRIS')
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_pembayaran uuid;
  v_total numeric(12,2);
  v_toko record;
  v_pesanan uuid;
begin
  if v_user is null then raise exception 'Belum login'; end if;

  if not exists (select 1 from public.keranjang_item where pembeli_id = v_user) then
    raise exception 'Keranjang masih kosong.';
  end if;

  if exists (
    select 1
    from public.keranjang_item k
    join public.menu m on m.id = k.menu_id
    join public.toko t on t.id = m.toko_id
    where k.pembeli_id = v_user
      and (m.deleted_at is not null or not m.tersedia or not t.aktif or not t.buka)
  ) then
    raise exception 'Ada menu yang habis atau stand yang tutup. Periksa keranjang Anda.';
  end if;

  select sum(k.jumlah * m.harga) into v_total
  from public.keranjang_item k join public.menu m on m.id = k.menu_id
  where k.pembeli_id = v_user;

  insert into public.pembayaran (pembeli_id, total_bayar, metode_pembayaran, expires_at)
  values (v_user, v_total, coalesce(nullif(p_metode, ''), 'QRIS'), now() + interval '15 minutes')
  returning id into v_pembayaran;

  for v_toko in
    select m.toko_id, sum(k.jumlah * m.harga) as subtotal
    from public.keranjang_item k join public.menu m on m.id = k.menu_id
    where k.pembeli_id = v_user
    group by m.toko_id
  loop
    insert into public.pesanan (pembeli_id, toko_id, pembayaran_id, total_harga)
    values (v_user, v_toko.toko_id, v_pembayaran, v_toko.subtotal)
    returning id into v_pesanan;

    insert into public.detail_pesanan
      (pesanan_id, menu_id, nama_menu, jumlah, harga_satuan, subtotal, catatan)
    select v_pesanan, m.id, m.nama_menu, k.jumlah, m.harga, k.jumlah * m.harga, k.catatan
    from public.keranjang_item k join public.menu m on m.id = k.menu_id
    where k.pembeli_id = v_user and m.toko_id = v_toko.toko_id;
  end loop;

  delete from public.keranjang_item where pembeli_id = v_user;
  return v_pembayaran;
end;
$$;

-- Hanya pengguna login yang boleh memanggil kedua fungsi
revoke execute on function public.ubah_keranjang(uuid, integer) from public, anon;
revoke execute on function public.checkout(text) from public, anon;
grant execute on function public.ubah_keranjang(uuid, integer) to authenticated;
grant execute on function public.checkout(text) to authenticated;
