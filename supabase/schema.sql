create table if not exists public.sessions (
  id text primary key,
  user_id text not null,
  user_email text,
  data jsonb not null,
  overall numeric,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_created_idx
  on public.sessions (user_id, created_at desc);

alter table public.sessions enable row level security;

-- No policies on purpose: the app reads and writes this table only from
-- server routes using the Supabase service role key, which bypasses RLS.
-- The anon and authenticated keys must never be used for this table.
