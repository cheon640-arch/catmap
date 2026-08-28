-- Run once in Supabase SQL Editor for an existing meow map database.
revoke all on table public.cats from anon, authenticated;
revoke all on table public.cat_photos from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on table public.cats, public.cat_photos to anon, authenticated;
grant insert, update on table public.cats to authenticated;
grant insert on table public.cat_photos to authenticated;
