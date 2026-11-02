-- Reversible session scope: snapshots and saved plans are never deleted.
alter table public.gym_workout_exercises add column deferred boolean not null default false;
alter table public.gym_workouts
  add column session_mode text not null default 'full' check (session_mode in ('full','short','comeback')),
  add column mode_minutes integer check (mode_minutes is null or mode_minutes in (15,20,30)),
  add column mode_revision integer not null default 0 check (mode_revision >= 0),
  add column session_adaptations jsonb not null default '[]'::jsonb check (jsonb_typeof(session_adaptations) = 'array');

create function public.gym_guard_deferred_exercise()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.deferred and (new.completed or new.logged_sets <> '[]'::jsonb) then raise exception 'Logged work cannot be deferred'; end if;
  -- Restore before editing; preserve template ON DELETE SET NULL compatibility.
  if old.deferred and new.deferred and
    (to_jsonb(new)-'exercise_id'-'updated_at') is distinct from (to_jsonb(old)-'exercise_id'-'updated_at') then
    raise exception 'Restore this exercise before logging or replacing it';
  end if;
  return new;
end;
$$;
create trigger gym_workout_exercises_guard_deferred before update on public.gym_workout_exercises
for each row execute function public.gym_guard_deferred_exercise();
revoke all on function public.gym_guard_deferred_exercise() from public;

create function public.gym_guard_session_adaptation()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.status <> 'in_progress' and (new.session_mode is distinct from old.session_mode or new.mode_minutes is distinct from old.mode_minutes or new.mode_revision is distinct from old.mode_revision or new.session_adaptations is distinct from old.session_adaptations) then raise exception 'Finished session scope cannot change'; end if;
  return new;
end;
$$;
create trigger gym_workouts_guard_adaptation before update on public.gym_workouts
for each row execute function public.gym_guard_session_adaptation();
revoke all on function public.gym_guard_session_adaptation() from public;

create function public.gym_adapt_workout(target_workout_id uuid, target_mode text, minutes integer, expected_revision integer, reviewed_exercises jsonb, keep_exercise_ids uuid[])
returns uuid language plpgsql security invoker set search_path = '' as $$
declare session public.gym_workouts; item public.gym_workout_exercises; review jsonb; deferred_ids uuid[];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if target_mode is null or target_mode not in ('full','short','comeback')
    or (target_mode='short' and (minutes is null or minutes not in (15,20,30)))
    or (target_mode<>'short' and minutes is not null)
    or keep_exercise_ids is null or jsonb_typeof(reviewed_exercises) is distinct from 'array' then raise exception 'Invalid session scope'; end if;
  select * into session from public.gym_workouts where id=target_workout_id and user_id=auth.uid() for update;
  if session.id is null then raise exception 'Workout not found'; end if;
  if session.status <> 'in_progress' then raise exception 'Workout is no longer in progress'; end if;
  if expected_revision is distinct from session.mode_revision then raise exception 'Session changed; review again'; end if;
  if jsonb_array_length(reviewed_exercises) <> (select count(*) from public.gym_workout_exercises where workout_id=target_workout_id)
    or exists(select 1 from unnest(keep_exercise_ids) as requested(id) where not exists(select 1 from public.gym_workout_exercises e where e.id=requested.id and e.workout_id=target_workout_id)) then raise exception 'Invalid session scope'; end if;
  for item in select * from public.gym_workout_exercises where workout_id=target_workout_id order by id for update loop
    select value into review from jsonb_array_elements(reviewed_exercises) where value->>'id'=item.id::text;
    if review is null or (review->>'updatedAt')::timestamptz is distinct from item.updated_at then raise exception 'Exercise changed; review again'; end if;
    if item.completed or item.logged_sets <> '[]'::jsonb then
      if not (item.id=any(keep_exercise_ids)) and target_mode<>'full' then raise exception 'Logged work must stay in the session'; end if;
    end if;
  end loop;
  update public.gym_workout_exercises set deferred=(target_mode<>'full' and not(id=any(keep_exercise_ids))) where workout_id=target_workout_id and deferred is distinct from (target_mode<>'full' and not(id=any(keep_exercise_ids)));
  select array_agg(id order by exercise_order,id) into deferred_ids from public.gym_workout_exercises where workout_id=target_workout_id and deferred;
  update public.gym_workouts set session_mode=target_mode, mode_minutes=minutes, mode_revision=mode_revision+1,
    session_adaptations=session_adaptations || jsonb_build_array(jsonb_build_object('mode',target_mode,'minutes',minutes,'deferred_ids',coalesce(deferred_ids,'{}'::uuid[]),'changed_at',clock_timestamp())) where id=target_workout_id;
  return target_workout_id;
end;
$$;
revoke all on function public.gym_adapt_workout(uuid,text,integer,integer,jsonb,uuid[]) from public;
grant execute on function public.gym_adapt_workout(uuid,text,integer,integer,jsonb,uuid[]) to authenticated;
