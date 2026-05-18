-- Fix: user_scores was on a 0-5 scale but evaluations are 1-10.
-- This migration:
--   1) Widens score columns from DECIMAL(3,2) (max 9.99) to DECIMAL(5,2) so 10.00 fits.
--   2) Doubles all existing member_evaluation_score values (they were halved before insert).
--   3) Recreates the generated average_score column with the new precision.

begin;

-- 1) Drop the generated column so the underlying columns can be altered.
alter table public.user_scores drop column if exists average_score;

-- 2) Widen score precision (idempotent — alter to the same type is a no-op).
alter table public.user_scores
  alter column event_evaluation_score type numeric(5, 2),
  alter column member_evaluation_score type numeric(5, 2);

-- 3) One-time data fix: every member_evaluation_score on file was stored at half scale.
--    We multiply by 2 so existing rows match the new 0-10 convention. Capped at 10.00
--    just in case any row was already corrected (defensive).
update public.user_scores
  set member_evaluation_score = least(member_evaluation_score * 2, 10.00)
  where member_evaluation_score is not null;

-- 4) Re-add the generated average column. Uses coalesce so that a member-only or
--    event-only score still produces a meaningful average instead of NULL.
alter table public.user_scores
  add column average_score numeric(5, 2)
  generated always as (
    case
      when event_evaluation_score is null and member_evaluation_score is null then null
      when event_evaluation_score is null then member_evaluation_score
      when member_evaluation_score is null then event_evaluation_score
      else (event_evaluation_score + member_evaluation_score) / 2
    end
  ) stored;

-- 5) Recreate the index on average_score (it was dropped with the column).
create index if not exists idx_user_scores_average on public.user_scores (average_score);

-- 6) Refresh PostgREST cache.
notify pgrst, 'reload schema';

commit;
