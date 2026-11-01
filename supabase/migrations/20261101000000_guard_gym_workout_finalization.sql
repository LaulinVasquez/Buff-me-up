-- Serialize finalization with progress saves and preserve completed snapshots.
-- Apply to development/staging first; this migration does not rewrite stored rows.
create or replace function public.gym_guard_workout_exercise()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare parent_status text;
begin
  -- Deleting an exercise template clears this reference through ON DELETE SET
  -- NULL. Its saved name, targets, weight, and completion must remain untouched.
  if tg_op = 'UPDATE' and new.exercise_id is null and old.exercise_id is not null
    and (to_jsonb(new) - 'exercise_id' - 'updated_at') = (to_jsonb(old) - 'exercise_id' - 'updated_at') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select status into parent_status from public.gym_workouts where id = new.workout_id for update;
  else
    select status into parent_status from public.gym_workouts where id = old.workout_id for update;
  end if;

  -- A workout deletion already removed its parent before cascading to snapshots.
  if tg_op = 'DELETE' and parent_status is null then return old; end if;
  if parent_status is distinct from 'in_progress' then
    raise exception 'Workout is no longer in progress';
  end if;
  if tg_op = 'UPDATE' and new.workout_id is distinct from old.workout_id then
    raise exception 'Workout snapshot cannot move to another session';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger gym_workout_exercises_guard_progress
before insert or update or delete on public.gym_workout_exercises
for each row execute function public.gym_guard_workout_exercise();

create or replace function public.gym_guard_workout_finalization()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.status <> 'in_progress' and (
    new.status is distinct from old.status or
    new.started_at is distinct from old.started_at or
    new.completed_at is distinct from old.completed_at
  ) then
    raise exception 'Workout is already finalized';
  end if;
  if old.status = 'in_progress' and new.status in ('completed', 'cancelled') then
    -- Use database time, including for direct authenticated API updates.
    new.completed_at := case when new.status = 'completed' then clock_timestamp() else null end;
  end if;
  return new;
end;
$$;

create trigger gym_workouts_guard_finalization
before update of status, started_at, completed_at on public.gym_workouts
for each row execute function public.gym_guard_workout_finalization();

create or replace function public.gym_set_workout_status(target_workout_id uuid, target_status text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare current_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if target_status is null or target_status not in ('completed', 'cancelled') then
    raise exception 'Invalid workout status';
  end if;

  select status into current_status from public.gym_workouts
  where id = target_workout_id and user_id = auth.uid() for update;
  if current_status is null then raise exception 'Workout not found'; end if;
  -- A retry returns the saved result without changing the completion time.
  if current_status = target_status then return target_workout_id; end if;
  if current_status <> 'in_progress' then raise exception 'Workout is already finalized'; end if;

  update public.gym_workouts set status = target_status
  where id = target_workout_id and user_id = auth.uid();
  return target_workout_id;
end;
$$;

revoke all on function public.gym_guard_workout_exercise() from public;
revoke all on function public.gym_guard_workout_finalization() from public;
revoke all on function public.gym_set_workout_status(uuid, text) from public;
grant execute on function public.gym_set_workout_status(uuid, text) to authenticated;
