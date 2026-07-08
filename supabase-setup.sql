-- Boarding Pass to Forever · RSVP table setup
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table if not exists public.rsvps (
  id            bigint generated always as identity primary key,
  name          text not null,
  attending     text not null default 'yes' check (attending in ('yes', 'no')),
  guests        int  not null default 1 check (guests between 1 and 2),
  plus_one_name text,
  message       text,
  lang          text check (lang in ('en', 'sq')),
  created_at    timestamptz not null default now()
);

-- Row Level Security: the anon key embedded in the public page may ONLY
-- insert new RSVPs. It can never read, edit, or delete the guest list —
-- you view responses in the Supabase dashboard (Table Editor), which uses
-- your logged-in account, not the anon key.
alter table public.rsvps enable row level security;

drop policy if exists "public can rsvp" on public.rsvps;
create policy "public can rsvp"
  on public.rsvps
  for insert
  to anon
  with check (
    char_length(name) between 1 and 200
    and (plus_one_name is null or char_length(plus_one_name) <= 200)
    and (message is null or char_length(message) <= 2000)
  );

-- No select/update/delete policies for anon: reads are dashboard-only.
