-- Batch 6 migration: account setup overhaul.
-- Adds first_name/last_name columns and a phone_country_code column.
-- full_name remains as a denormalized convenience field.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone_country_code text default '+63';

-- Best-effort backfill: derive first_name/last_name from the existing full_name
-- so existing rows don't show blank fields after deployment.
update public.profiles
  set
    first_name = coalesce(first_name, split_part(full_name, ' ', 1)),
    last_name  = coalesce(last_name,  case
                                        when full_name like '% %'
                                        then trim(substring(full_name from position(' ' in full_name) + 1))
                                        else ''
                                      end)
  where full_name is not null and (first_name is null or last_name is null);

-- A username uniqueness constraint catches race conditions on top of client-side checks.
create unique index if not exists profiles_user_name_unique
  on public.profiles (lower(user_name))
  where user_name is not null and user_name <> 'Not Set';

notify pgrst, 'reload schema';
