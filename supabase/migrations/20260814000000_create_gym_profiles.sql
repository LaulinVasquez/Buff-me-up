create table if not exists public.gym_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gym_profiles enable row level security;

create policy "gym_profiles_select_own"
on public.gym_profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "gym_profiles_insert_own"
on public.gym_profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "gym_profiles_update_own"
on public.gym_profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "gym_profiles_delete_own"
on public.gym_profiles for delete
to authenticated
using ((select auth.uid()) = id);

create or replace function public.gym_set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger gym_profiles_set_updated_at
before update on public.gym_profiles
for each row execute function public.gym_set_profile_updated_at();
