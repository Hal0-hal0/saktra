-- Batch 4 migration
-- Run in the Supabase SQL editor in order.

-- 1) event_rsvp: track QR check-ins + points awarded.
alter table public.event_rsvp
  add column if not exists checked_in_at timestamptz,
  add column if not exists points_awarded numeric not null default 0;

-- Helpful uniqueness so /api/check-in can upsert safely.
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='event_rsvp_user_event_uniq'
  ) then
    create unique index event_rsvp_user_event_uniq on public.event_rsvp (user_id, event_id);
  end if;
end$$;


-- 2) scores_history: archive snapshot of user_scores when scores are reset.
--    One row per (user, event) snapshotted within a reset cycle.
create table if not exists public.scores_history (
  id              uuid primary key default gen_random_uuid(),
  cycle_id        uuid not null,           -- groups all rows from a single reset
  cycle_label     text not null,           -- e.g. "2025 yearly reset" or "Manual reset by Jorich"
  cycle_year      int  not null,
  archived_at     timestamptz not null default now(),
  user_id         uuid not null,
  event_id        bigint,
  event_evaluation_score   numeric,
  member_evaluation_score  numeric,
  average_score            numeric,
  source_created_at        timestamptz
);

create index if not exists scores_history_user_idx on public.scores_history (user_id);
create index if not exists scores_history_cycle_idx on public.scores_history (cycle_id);
create index if not exists scores_history_year_idx on public.scores_history (cycle_year desc);

-- 3) scores_reset_log: one row per reset event for the UI "Scores History" listing.
create table if not exists public.scores_reset_log (
  id            uuid primary key default gen_random_uuid(),
  cycle_id      uuid not null,
  cycle_label   text not null,
  cycle_year    int  not null,
  trigger       text not null check (trigger in ('manual','yearly')),
  triggered_by  uuid,                       -- profiles.user_id of the BOD who clicked it (null for cron)
  archived_rows int  not null default 0,
  affected_users int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists scores_reset_log_year_idx on public.scores_reset_log (cycle_year desc);
create unique index if not exists scores_reset_log_cycle_uniq on public.scores_reset_log (cycle_id);


-- 4) (Optional but recommended) RLS: history visible to authenticated users; only service-role writes.
alter table public.scores_history    enable row level security;
alter table public.scores_reset_log  enable row level security;

drop policy if exists "scores_history read" on public.scores_history;
create policy "scores_history read" on public.scores_history
  for select to authenticated using (true);

drop policy if exists "scores_reset_log read" on public.scores_reset_log;
create policy "scores_reset_log read" on public.scores_reset_log
  for select to authenticated using (true);

-- Writes happen exclusively via the service-role key in /api/scores/reset, so no insert policy is needed.
