-- =========================================================
-- KUROBOOTH SUPABASE SCHEMA & TABLES
-- =========================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Sessions Table (Menyimpan riwayat foto strip)
create table if not exists public.sessions (
  id uuid default uuid_generate_v4() primary key,
  template_id text not null,
  image_url text not null,
  share_code text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Templates Table (Menyimpan template Canva & kustom)
create table if not exists public.templates (
  id text primary key,
  name text not null,
  description text default '',
  photo_count int default 4,
  strip_width int default 600,
  strip_height int default 1800,
  background_color text default '#FFFFFF',
  accent_color text default '#0D3B24',
  text_color text default '#0C1E14',
  frame_image_url text,
  frame_mode text default 'overlay',
  slots jsonb default '[]'::jsonb,
  decorations jsonb default '[]'::jsonb,
  tags text[] default array['custom'],
  print_size text default '2x6',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_active boolean default true
);

-- 4. Enable Row Level Security (RLS)
alter table public.sessions enable row level security;
alter table public.templates enable row level security;

-- Policies for sessions
drop policy if exists "Allow public read sessions" on public.sessions;
create policy "Allow public read sessions" on public.sessions for select using (true);

drop policy if exists "Allow public insert sessions" on public.sessions;
create policy "Allow public insert sessions" on public.sessions for insert with check (true);

drop policy if exists "Allow public delete sessions" on public.sessions;
create policy "Allow public delete sessions" on public.sessions for delete using (true);

-- Policies for templates
drop policy if exists "Allow public read templates" on public.templates;
create policy "Allow public read templates" on public.templates for select using (true);

drop policy if exists "Allow public insert templates" on public.templates;
create policy "Allow public insert templates" on public.templates for insert with check (true);

drop policy if exists "Allow public update templates" on public.templates;
create policy "Allow public update templates" on public.templates for update using (true);

drop policy if exists "Allow public delete templates" on public.templates;
create policy "Allow public delete templates" on public.templates for delete using (true);

-- =========================================================
-- 5. Storage Bucket & Policies for photobooth-results
-- =========================================================
insert into storage.buckets (id, name, public)
values ('photobooth-results', 'photobooth-results', true)
on conflict (id) do update set public = true;

-- Policy upload ke bucket photobooth-results
drop policy if exists "Allow public uploads to photobooth-results" on storage.objects;
create policy "Allow public uploads to photobooth-results"
on storage.objects for insert
with check ( bucket_id = 'photobooth-results' );

-- Policy baca/view dari bucket photobooth-results
drop policy if exists "Allow public read from photobooth-results" on storage.objects;
create policy "Allow public read from photobooth-results"
on storage.objects for select
using ( bucket_id = 'photobooth-results' );

-- Policy hapus dari bucket photobooth-results
drop policy if exists "Allow public delete from photobooth-results" on storage.objects;
create policy "Allow public delete from photobooth-results"
on storage.objects for delete
using ( bucket_id = 'photobooth-results' );

-- Policy update ke bucket photobooth-results
drop policy if exists "Allow public update to photobooth-results" on storage.objects;
create policy "Allow public update to photobooth-results"
on storage.objects for update
using ( bucket_id = 'photobooth-results' );