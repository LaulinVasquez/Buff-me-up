create table if not exists public.gym_reminders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  days smallint[] not null,
  local_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gym_reminders_days_not_empty check (array_length(days, 1) >= 1),
  constraint gym_reminders_days_valid check (
    days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  )
);

alter table public.gym_reminders enable row level security;

create policy "gym_reminders_select_own"
on public.gym_reminders for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "gym_reminders_insert_own"
on public.gym_reminders for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "gym_reminders_update_own"
on public.gym_reminders for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "gym_reminders_delete_own"
on public.gym_reminders for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.gym_set_reminder_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger gym_reminders_set_updated_at
before update on public.gym_reminders
for each row execute function public.gym_set_reminder_updated_at();
