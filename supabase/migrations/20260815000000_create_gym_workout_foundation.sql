create table public.gym_workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  is_active boolean not null default false,
  source text not null default 'custom' check (source in ('custom', 'recommended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index gym_workout_plans_one_active_per_user
  on public.gym_workout_plans (user_id) where is_active;
create index gym_workout_plans_user_id_idx on public.gym_workout_plans (user_id);

create table public.gym_workout_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.gym_workout_plans(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  day_order integer not null check (day_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gym_workout_days_plan_id_idx on public.gym_workout_days (plan_id);

create table public.gym_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references public.gym_workout_days(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  sets integer not null check (sets > 0),
  target_reps text not null check (char_length(trim(target_reps)) > 0),
  default_weight numeric check (default_weight is null or default_weight >= 0),
  exercise_order integer not null check (exercise_order >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gym_exercises_workout_day_id_idx on public.gym_exercises (workout_day_id);

create table public.gym_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_day_id uuid references public.gym_workout_days(id) on delete set null,
  plan_id uuid references public.gym_workout_plans(id) on delete set null,
  name text not null check (char_length(trim(name)) > 0),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'cancelled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gym_workouts_completion_time_check check (completed_at is null or completed_at >= started_at)
);
create index gym_workouts_user_id_idx on public.gym_workouts (user_id);
create index gym_workouts_user_started_at_idx on public.gym_workouts (user_id, started_at desc);

create table public.gym_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.gym_workouts(id) on delete cascade,
  exercise_id uuid references public.gym_exercises(id) on delete set null,
  name text not null check (char_length(trim(name)) > 0),
  target_sets integer check (target_sets is null or target_sets > 0),
  target_reps text,
  weight numeric check (weight is null or weight >= 0),
  completed boolean not null default false,
  exercise_order integer not null check (exercise_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gym_workout_exercises_workout_id_idx on public.gym_workout_exercises (workout_id);

alter table public.gym_workout_plans enable row level security;
alter table public.gym_workout_days enable row level security;
alter table public.gym_exercises enable row level security;
alter table public.gym_workouts enable row level security;
alter table public.gym_workout_exercises enable row level security;

revoke all on table public.gym_workout_plans, public.gym_workout_days, public.gym_exercises, public.gym_workouts, public.gym_workout_exercises from anon;
grant select, insert, update, delete on table public.gym_workout_plans, public.gym_workout_days, public.gym_exercises, public.gym_workouts, public.gym_workout_exercises to authenticated;

create policy "gym_workout_plans_select_own" on public.gym_workout_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "gym_workout_plans_insert_own" on public.gym_workout_plans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "gym_workout_plans_update_own" on public.gym_workout_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "gym_workout_plans_delete_own" on public.gym_workout_plans for delete to authenticated using ((select auth.uid()) = user_id);

create policy "gym_workout_days_select_own" on public.gym_workout_days for select to authenticated using (exists (select 1 from public.gym_workout_plans p where p.id = plan_id and p.user_id = (select auth.uid())));
create policy "gym_workout_days_insert_own" on public.gym_workout_days for insert to authenticated with check (exists (select 1 from public.gym_workout_plans p where p.id = plan_id and p.user_id = (select auth.uid())));
create policy "gym_workout_days_update_own" on public.gym_workout_days for update to authenticated using (exists (select 1 from public.gym_workout_plans p where p.id = plan_id and p.user_id = (select auth.uid()))) with check (exists (select 1 from public.gym_workout_plans p where p.id = plan_id and p.user_id = (select auth.uid())));
create policy "gym_workout_days_delete_own" on public.gym_workout_days for delete to authenticated using (exists (select 1 from public.gym_workout_plans p where p.id = plan_id and p.user_id = (select auth.uid())));

create policy "gym_exercises_select_own" on public.gym_exercises for select to authenticated using (exists (select 1 from public.gym_workout_days d join public.gym_workout_plans p on p.id = d.plan_id where d.id = workout_day_id and p.user_id = (select auth.uid())));
create policy "gym_exercises_insert_own" on public.gym_exercises for insert to authenticated with check (exists (select 1 from public.gym_workout_days d join public.gym_workout_plans p on p.id = d.plan_id where d.id = workout_day_id and p.user_id = (select auth.uid())));
create policy "gym_exercises_update_own" on public.gym_exercises for update to authenticated using (exists (select 1 from public.gym_workout_days d join public.gym_workout_plans p on p.id = d.plan_id where d.id = workout_day_id and p.user_id = (select auth.uid()))) with check (exists (select 1 from public.gym_workout_days d join public.gym_workout_plans p on p.id = d.plan_id where d.id = workout_day_id and p.user_id = (select auth.uid())));
create policy "gym_exercises_delete_own" on public.gym_exercises for delete to authenticated using (exists (select 1 from public.gym_workout_days d join public.gym_workout_plans p on p.id = d.plan_id where d.id = workout_day_id and p.user_id = (select auth.uid())));

create policy "gym_workouts_select_own" on public.gym_workouts for select to authenticated using ((select auth.uid()) = user_id);
create policy "gym_workouts_insert_own" on public.gym_workouts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "gym_workouts_update_own" on public.gym_workouts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "gym_workouts_delete_own" on public.gym_workouts for delete to authenticated using ((select auth.uid()) = user_id);

create policy "gym_workout_exercises_select_own" on public.gym_workout_exercises for select to authenticated using (exists (select 1 from public.gym_workouts w where w.id = workout_id and w.user_id = (select auth.uid())));
create policy "gym_workout_exercises_insert_own" on public.gym_workout_exercises for insert to authenticated with check (exists (select 1 from public.gym_workouts w where w.id = workout_id and w.user_id = (select auth.uid())));
create policy "gym_workout_exercises_update_own" on public.gym_workout_exercises for update to authenticated using (exists (select 1 from public.gym_workouts w where w.id = workout_id and w.user_id = (select auth.uid()))) with check (exists (select 1 from public.gym_workouts w where w.id = workout_id and w.user_id = (select auth.uid())));
create policy "gym_workout_exercises_delete_own" on public.gym_workout_exercises for delete to authenticated using (exists (select 1 from public.gym_workouts w where w.id = workout_id and w.user_id = (select auth.uid())));

create or replace function public.gym_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger gym_workout_plans_set_updated_at before update on public.gym_workout_plans for each row execute function public.gym_set_updated_at();
create trigger gym_workout_days_set_updated_at before update on public.gym_workout_days for each row execute function public.gym_set_updated_at();
create trigger gym_exercises_set_updated_at before update on public.gym_exercises for each row execute function public.gym_set_updated_at();
create trigger gym_workouts_set_updated_at before update on public.gym_workouts for each row execute function public.gym_set_updated_at();
create trigger gym_workout_exercises_set_updated_at before update on public.gym_workout_exercises for each row execute function public.gym_set_updated_at();

create or replace function public.gym_activate_workout_plan(target_plan_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.gym_workout_plans where id = target_plan_id and user_id = auth.uid()) then raise exception 'Plan not found'; end if;
  update public.gym_workout_plans set is_active = false where user_id = auth.uid() and is_active;
  update public.gym_workout_plans set is_active = true where id = target_plan_id and user_id = auth.uid();
end;
$$;

create or replace function public.gym_adopt_recommended_plan(template jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare new_plan_id uuid; day jsonb; exercise jsonb; new_day_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if nullif(trim(template->>'name'), '') is null or jsonb_typeof(template->'days') <> 'array' then raise exception 'Invalid template'; end if;
  update public.gym_workout_plans set is_active = false where user_id = auth.uid() and is_active;
  insert into public.gym_workout_plans (user_id, name, description, is_active, source)
    values (auth.uid(), template->>'name', template->>'description', true, 'recommended') returning id into new_plan_id;
  for day in select value from jsonb_array_elements(template->'days') loop
    insert into public.gym_workout_days (plan_id, name, day_order)
      values (new_plan_id, day->>'name', (day->>'order')::integer) returning id into new_day_id;
    for exercise in select value from jsonb_array_elements(day->'exercises') loop
      insert into public.gym_exercises (workout_day_id, name, sets, target_reps, default_weight, exercise_order, notes)
      values (new_day_id, exercise->>'name', (exercise->>'sets')::integer, exercise->>'targetReps',
        nullif(exercise->>'defaultWeight', '')::numeric, (exercise->>'order')::integer, exercise->>'notes');
    end loop;
  end loop;
  return new_plan_id;
end;
$$;

revoke all on function public.gym_activate_workout_plan(uuid) from public;
grant execute on function public.gym_activate_workout_plan(uuid) to authenticated;
revoke all on function public.gym_adopt_recommended_plan(jsonb) from public;
grant execute on function public.gym_adopt_recommended_plan(jsonb) to authenticated;
