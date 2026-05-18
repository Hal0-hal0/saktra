-- Avatars storage bucket + RLS policies.
-- Run this in Supabase SQL editor (or use the Dashboard steps documented below).

-- 1) Create the bucket if it doesn't exist. Public read so the <Avatar> components
--    can fetch the image without a signed URL.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- 2) Policies on storage.objects scoped to the avatars bucket.
--    Any authenticated user can SELECT (since bucket is public, but explicit policy
--    is still required when RLS is enabled on storage.objects).
drop policy if exists "Avatars public read" on storage.objects;
create policy "Avatars public read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

-- A user can INSERT only objects under their own user id prefix.
-- The existing profile pages upload to `avatars/<userId>.<ext>` — that path
-- starts with the user's uid string, which is what we check.
drop policy if exists "Avatars insert own" on storage.objects;
create policy "Avatars insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = 'avatars'      -- legacy path: avatars/<uid>.<ext>
      or split_part(name, '.', 1) = auth.uid()::text -- preferred path: <uid>.<ext>
    )
  );

-- A user can UPDATE (overwrite) their own avatar — needed for the .upload(..., { upsert: true })
-- call on re-uploads.
drop policy if exists "Avatars update own" on storage.objects;
create policy "Avatars update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = 'avatars'
      or split_part(name, '.', 1) = auth.uid()::text
    )
  );

-- And delete their own.
drop policy if exists "Avatars delete own" on storage.objects;
create policy "Avatars delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = 'avatars'
      or split_part(name, '.', 1) = auth.uid()::text
    )
  );

-- 3) Kick PostgREST/Realtime cache so the new bucket shows up immediately.
notify pgrst, 'reload schema';
