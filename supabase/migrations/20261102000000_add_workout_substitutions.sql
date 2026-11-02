-- Session-only substitutions. Apply in development/staging before the app update.
alter table public.gym_workout_exercises
  add column substitution_version integer not null default 0 check (substitution_version >= 0),
  add column substitution_details jsonb,
  add column substitution_history jsonb not null default '[]'::jsonb check (jsonb_typeof(substitution_history) = 'array');

create function public.gym_guard_workout_substitution()
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
      'details', old.substitution_details, 'swapped_at', clock_timestamp()));
    new.substitution_version := old.substitution_version + 1;
    new.exercise_id := null;
    new.weight := null;
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
create trigger gym_workout_exercises_guard_substitution before update on public.gym_workout_exercises
for each row execute function public.gym_guard_workout_substitution();
revoke all on function public.gym_guard_workout_substitution() from public;

create function public.gym_update_workout_progress(target_workout_id uuid, target_exercise_id uuid, expected_version integer, changes jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare current_status text; snapshot public.gym_workout_exercises;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if changes is null or jsonb_typeof(changes) <> 'object' or changes = '{}'::jsonb
    or changes - 'weight' - 'completed' <> '{}'::jsonb then raise exception 'Invalid progress'; end if;
  if changes ? 'weight' and (jsonb_typeof(changes->'weight') not in ('number', 'null')
    or (changes->>'weight')::numeric < 0) then raise exception 'Invalid weight'; end if;
  if changes ? 'completed' and jsonb_typeof(changes->'completed') <> 'boolean' then raise exception 'Invalid completion'; end if;
  select status into current_status from public.gym_workouts where id = target_workout_id and user_id = auth.uid() for update;
  if current_status is null then raise exception 'Workout not found'; end if;
  if current_status <> 'in_progress' then raise exception 'Workout is no longer in progress'; end if;
  select * into snapshot from public.gym_workout_exercises where id = target_exercise_id and workout_id = target_workout_id for update;
  if snapshot.id is null then raise exception 'Exercise not found'; end if;
  if expected_version is distinct from snapshot.substitution_version then raise exception 'Exercise changed; refresh the workout'; end if;
  perform set_config('gym.snapshot_write', snapshot.id::text || ':' || expected_version::text, true);
  update public.gym_workout_exercises set
    weight = case when changes ? 'weight' then (changes->>'weight')::numeric else weight end,
    completed = case when changes ? 'completed' then (changes->>'completed')::boolean else completed end
    where id = target_exercise_id;
  perform set_config('gym.snapshot_write', '', true);
  return target_exercise_id;
end;
$$;
revoke all on function public.gym_update_workout_progress(uuid, uuid, integer, jsonb) from public;
grant execute on function public.gym_update_workout_progress(uuid, uuid, integer, jsonb) to authenticated;

create function public.gym_swap_workout_exercise(target_workout_id uuid, target_exercise_id uuid,
  expected_version integer, expected_updated_at timestamptz, source_muscle text, replacement jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare current_status text; snapshot public.gym_workout_exercises; known_muscle text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if replacement is null or jsonb_typeof(replacement) <> 'object'
    or length(replacement::text) > 20000
    or replacement - 'id' - 'name' - 'primaryMuscle' - 'equipment' - 'instructions' - 'mechanic' <> '{}'::jsonb
    or jsonb_typeof(replacement->'id') is distinct from 'string'
    or jsonb_typeof(replacement->'name') is distinct from 'string'
    or jsonb_typeof(replacement->'equipment') is distinct from 'string'
    or coalesce(length(trim(replacement->>'id')), 0) not between 1 and 160
    or coalesce(length(trim(replacement->>'name')), 0) not between 1 and 160
    or coalesce(length(trim(replacement->>'equipment')), 0) not between 1 and 120
    or source_muscle is null or source_muscle not in ('Chest','Back','Shoulders','Biceps','Triceps','Quadriceps','Hamstrings','Glutes','Calves','Abs/Core')
    or (replacement->>'primaryMuscle') is distinct from source_muscle
    or jsonb_typeof(replacement->'instructions') is distinct from 'array' then raise exception 'Invalid replacement'; end if;
  if replacement ? 'mechanic' and replacement->'mechanic' <> 'null'::jsonb
    and replacement->>'mechanic' not in ('compound', 'isolation') then raise exception 'Invalid replacement'; end if;
  if jsonb_array_length(replacement->'instructions') > 12 or exists (select 1 from jsonb_array_elements(replacement->'instructions') step
    where jsonb_typeof(step) <> 'string' or length(step #>> '{}') > 1000) then raise exception 'Invalid instructions'; end if;

  select status into current_status from public.gym_workouts where id = target_workout_id and user_id = auth.uid() for update;
  if current_status is null then raise exception 'Workout not found'; end if;
  if current_status <> 'in_progress' then raise exception 'Workout is no longer in progress'; end if;
  select * into snapshot from public.gym_workout_exercises where id = target_exercise_id and workout_id = target_workout_id for update;
  if snapshot.id is null then raise exception 'Exercise not found'; end if;
  if snapshot.completed then raise exception 'Completed exercises cannot be replaced'; end if;
  if expected_version is distinct from snapshot.substitution_version or expected_updated_at is distinct from snapshot.updated_at then
    raise exception 'Exercise changed; refresh the workout'; end if;
  known_muscle := snapshot.substitution_details->>'primaryMuscle';
  if known_muscle is null then select muscle_group into known_muscle from public.gym_exercises where id = snapshot.exercise_id; end if;
  if known_muscle is not null and known_muscle <> source_muscle then raise exception 'Replacement must keep the primary muscle'; end if;
  if exists (select 1 from public.gym_workout_exercises e where e.workout_id = target_workout_id and
    (lower(trim(e.name)) = lower(trim(replacement->>'name')) or e.substitution_details->>'id' = replacement->>'id')) then
    raise exception 'Exercise is already in this workout'; end if;
  update public.gym_workout_exercises set name = replacement->>'name', substitution_details = replacement
    where id = target_exercise_id;
  return target_exercise_id;
end;
$$;
revoke all on function public.gym_swap_workout_exercise(uuid, uuid, integer, timestamptz, text, jsonb) from public;
grant execute on function public.gym_swap_workout_exercise(uuid, uuid, integer, timestamptz, text, jsonb) to authenticated;
