create unique index gym_workouts_one_in_progress_per_user
  on public.gym_workouts (user_id)
  where status = 'in_progress';

create or replace function public.gym_start_workout(target_day_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_workout_id uuid;
  selected_plan_id uuid;
  selected_day_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select id into current_workout_id
  from public.gym_workouts
  where user_id = auth.uid() and status = 'in_progress'
  order by started_at desc
  limit 1;

  if current_workout_id is not null then
    return current_workout_id;
  end if;

  select p.id, d.name into selected_plan_id, selected_day_name
  from public.gym_workout_days d
  join public.gym_workout_plans p on p.id = d.plan_id
  where d.id = target_day_id
    and p.user_id = auth.uid()
    and p.is_active = true;

  if selected_plan_id is null then
    raise exception 'Workout day not found in active plan';
  end if;

  insert into public.gym_workouts (
    user_id, workout_day_id, plan_id, name, status, started_at
  ) values (
    auth.uid(), target_day_id, selected_plan_id, selected_day_name,
    'in_progress', now()
  )
  returning id into current_workout_id;

  insert into public.gym_workout_exercises (
    workout_id, exercise_id, name, target_sets, target_reps,
    weight, completed, exercise_order
  )
  select
    current_workout_id, e.id, e.name, e.sets, e.target_reps,
    e.default_weight, false, e.exercise_order
  from public.gym_exercises e
  where e.workout_day_id = target_day_id
  order by e.exercise_order;

  return current_workout_id;
exception
  when unique_violation then
    select id into current_workout_id
    from public.gym_workouts
    where user_id = auth.uid() and status = 'in_progress'
    order by started_at desc
    limit 1;
    if current_workout_id is null then raise; end if;
    return current_workout_id;
end;
$$;

revoke all on function public.gym_start_workout(uuid) from public;
grant execute on function public.gym_start_workout(uuid) to authenticated;
