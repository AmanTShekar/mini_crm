-- Supabase Postgres schema (production persistence).
-- Run this in Supabase SQL editor, then set env vars from .env.example.
-- Demo mode works without this (in-memory store in src/lib/data.ts).

create extension if not exists "pgcrypto";

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  floor text,
  type text default 'Standard',
  capacity int default 2,
  status text default 'available',
  created_at timestamptz default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  address text,
  id_type text,
  id_number text,
  visit_count int default 0,
  last_stay_at date,
  created_at timestamptz default now()
);
create unique index if not exists clients_phone_uidx on clients (phone);
create index if not exists clients_email_idx on clients (lower(email));

create table if not exists stays (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  room_id uuid references rooms(id) on delete set null,
  room_number text not null,
  client_id uuid references clients(id) on delete set null,
  client_name text not null,
  client_phone text not null,
  client_email text,
  address text,
  city text,
  guest_age text,
  guest_dob date,
  id_type text,
  id_number text,
  id_proof_urls text[] default '{}',
  members jsonb default '[]',
  check_in_date date not null default current_date,
  check_out_date date,
  status text not null default 'pending',
  notes text,
  is_revisit boolean default false,
  created_at timestamptz default now()
);
create index if not exists stays_date_idx on stays (check_in_date desc);
create index if not exists stays_phone_idx on stays (client_phone);
create unique index if not exists stays_room_date_uidx on stays (room_number, check_in_date) where status <> 'checked_out';

-- Storage bucket for ID proofs (private recommended)
insert into storage.buckets (id, name, public)
values ('id-proofs', 'id-proofs', true)
on conflict (id) do nothing;
