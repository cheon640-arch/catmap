create extension if not exists pgcrypto;

create table if not exists public.cats (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  place text not null,
  note text not null default '',
  spotted_by text not null default '익명의 친구',
  spotted_at timestamptz not null default now(),
  lat double precision not null,
  lng double precision not null,
  coat text not null check (coat in ('gray', 'orange', 'calico', 'black', 'white')),
  cover_photo_url text,
  personality text not null default '',
  likes text not null default '',
  favorite_spot text not null default '',
  caution text not null default '',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.cat_photos (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id) on delete cascade,
  photo_url text not null,
  storage_path text,
  caption text not null default '',
  spotted_at timestamptz not null default now(),
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  uploader_name text not null default '익명의 친구',
  created_at timestamptz not null default now()
);

alter table public.cats add column if not exists personality text not null default '';
alter table public.cats add column if not exists likes text not null default '';
alter table public.cats add column if not exists favorite_spot text not null default '';
alter table public.cats add column if not exists caution text not null default '';

create index if not exists idx_cats_created_at on public.cats(created_at desc);
create index if not exists idx_cat_photos_cat_spotted on public.cat_photos(cat_id, spotted_at desc);

alter table public.cats enable row level security;
alter table public.cat_photos enable row level security;

drop policy if exists "cats are readable by everyone" on public.cats;
create policy "cats are readable by everyone" on public.cats for select using (true);
drop policy if exists "signed in users create cats" on public.cats;
create policy "signed in users create cats" on public.cats for insert to authenticated with check (auth.uid() = created_by);
drop policy if exists "owners update cats" on public.cats;
drop policy if exists "signed in users update cat profiles" on public.cats;
create policy "signed in users update cat profiles" on public.cats for update to authenticated using (true) with check (true);

drop policy if exists "cat photos are readable by everyone" on public.cat_photos;
create policy "cat photos are readable by everyone" on public.cat_photos for select using (true);
drop policy if exists "signed in users add cat photos" on public.cat_photos;
create policy "signed in users add cat photos" on public.cat_photos for insert to authenticated with check (auth.uid() = uploaded_by);

insert into storage.buckets (id, name, public)
values ('cat-photos', 'cat-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "cat photo files are public" on storage.objects;
create policy "cat photo files are public" on storage.objects for select using (bucket_id = 'cat-photos');
drop policy if exists "signed in users upload cat photos" on storage.objects;
create policy "signed in users upload cat photos" on storage.objects for insert to authenticated
with check (bucket_id = 'cat-photos' and (storage.foldername(name))[1] = auth.uid()::text);
