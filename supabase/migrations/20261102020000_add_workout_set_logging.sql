-- Actual set records live with the owned, immutable workout snapshot.
alter table public.gym_workout_exercises
  add column logged_sets jsonb not null default '[]'::jsonb,
  add column log_revision integer not null default 0 check (log_revision >= 0);

create function public.gym_validate_set_log()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare item jsonb; seen integer[] := '{}'; position integer;
begin
  if jsonb_typeof(new.logged_sets) is distinct from 'array' or jsonb_array_length(new.logged_sets) > 100 then raise exception 'Invalid set log'; end if;
  for item in select value from jsonb_array_elements(new.logged_sets) loop
    if jsonb_typeof(item) is distinct from 'object' or item - 'set' - 'reps' - 'weight' - 'completed' <> '{}'::jsonb
      or not (item ?& array['set','reps','weight','completed'])
      or jsonb_typeof(item->'set') is distinct from 'number'
      or (item->>'set')::numeric <> trunc((item->>'set')::numeric)
      or (item->>'set')::numeric not between 1 and 100
      or jsonb_typeof(item->'completed') is distinct from 'boolean'
      or jsonb_typeof(item->'reps') not in ('number','null')
      or jsonb_typeof(item->'weight') not in ('number','null') then raise exception 'Invalid set log'; end if;
    position := (item->>'set')::integer;
    if position = any(seen) then raise exception 'Duplicate set number'; end if;
    seen := array_append(seen, position);
    if item->'reps' <> 'null'::jsonb and ((item->>'reps')::numeric <> trunc((item->>'reps')::numeric) or (item->>'reps')::numeric not between 0 and 1000) then raise exception 'Invalid reps'; end if;
    if (item->>'completed')::boolean and (item->'reps' = 'null'::jsonb or (item->>'reps')::numeric < 1) then raise exception 'Enter reps for completed sets'; end if;
    if item->'weight' <> 'null'::jsonb and (item->>'weight')::numeric not between 0 and 100000 then raise exception 'Invalid weight'; end if;
  end loop;
  if tg_op = 'INSERT' then
    if new.log_revision <> 0 then raise exception 'Set revision is managed automatically'; end if;
  else
    if old.logged_sets <> '[]'::jsonb and new.logged_sets = old.logged_sets and (new.weight is distinct from old.weight or new.completed is distinct from old.completed) then raise exception 'Use the set logger to update recorded sets'; end if;
    if new.log_revision is distinct from old.log_revision then raise exception 'Set revision is managed automatically'; end if;
    if new.logged_sets is distinct from old.logged_sets then new.log_revision := old.log_revision + 1; end if;
  end if;
  return new;
end;
$$;
create trigger gym_workout_exercises_zz_guard_sets before insert or update on public.gym_workout_exercises
for each row execute function public.gym_validate_set_log();
revoke all on function public.gym_validate_set_log() from public;

create function public.gym_save_workout_sets(target_workout_id uuid, target_exercise_id uuid, expected_version integer, expected_revision integer, sets jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare parent_status text; snapshot public.gym_workout_exercises;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select status into parent_status from public.gym_workouts where id = target_workout_id and user_id = auth.uid() for update;
  if parent_status is null then raise exception 'Workout not found'; end if;
  if parent_status <> 'in_progress' then raise exception 'Workout is no longer in progress'; end if;
  select * into snapshot from public.gym_workout_exercises where id = target_exercise_id and workout_id = target_workout_id for update;
  if snapshot.id is null then raise exception 'Exercise not found'; end if;
  if expected_version is distinct from snapshot.substitution_version or expected_revision is distinct from snapshot.log_revision then raise exception 'Set log changed; refresh before saving'; end if;
  if jsonb_typeof(sets) is distinct from 'array' then raise exception 'Invalid set log'; end if;
  perform set_config('gym.snapshot_write', snapshot.id::text || ':' || expected_version::text, true);
  update public.gym_workout_exercises set logged_sets = sets,
    completed = jsonb_array_length(sets) > 0 and not exists(select 1 from jsonb_array_elements(sets) item where item->'completed' is distinct from 'true'::jsonb),
    weight = (select (item->>'weight')::numeric from jsonb_array_elements(sets) item where item->'completed' = 'true'::jsonb order by (item->>'set')::integer desc limit 1)
    where id = target_exercise_id;
  perform set_config('gym.snapshot_write', '', true);
  return target_exercise_id;
end;
$$;
revoke all on function public.gym_save_workout_sets(uuid, uuid, integer, integer, jsonb) from public;
grant execute on function public.gym_save_workout_sets(uuid, uuid, integer, integer, jsonb) to authenticated;

-- Substitution archives actual sets before clearing the replacement.
create or replace function public.gym_guard_workout_substitution()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  -- A template's ON DELETE SET NULL is not a substitution, including in history.
  if new.exercise_id is null and old.exercise_id is not null
    and (to_jsonb(new) - 'exercise_id' - 'updated_at') = (to_jsonb(old) - 'exercise_id' - 'updated_at') then return new; end if;

  if new.name is distinct from old.name or new.exercise_id is distinct from old.exercise_id
    or new.substitution_details is distinct from old.substitution_details then
    if old.completed then raise exception 'Completed exercises cannot be replaced'; end if;
    new.substitution_history := old.substitution_history || jsonb_build_array(jsonb_build_object(
      'name', old.name, 'exercise_id', old.exercise_id, 'weight', old.weight,
      'target_sets', old.target_sets, 'target_reps', old.target_reps,
      'logged_sets', old.logged_sets, 'details', old.substitution_details, 'swapped_at', clock_timestamp()));
    new.substitution_version := old.substitution_version + 1;
    new.exercise_id := null;
    new.weight := null;
    new.logged_sets := '[]'::jsonb;
    new.completed := false;
  else
    if new.substitution_history is distinct from old.substitution_history
      or new.substitution_version is distinct from old.substitution_version then
      raise exception 'Substitution history is managed automatically';
    end if;
    -- Old app tabs have no version token. They may not write progress onto a replacement.
    -- This transaction-local marker is a concurrency check; ownership is enforced by RLS.
    if old.substitution_version > 0 and (new.weight is distinct from old.weight or new.completed is distinct from old.completed)
      and current_setting('gym.snapshot_write', true) is distinct from old.id::text || ':' || old.substitution_version::text then
      raise exception 'Exercise changed; refresh the workout';
    end if;
  end if;
  return new;
end;
$$;
