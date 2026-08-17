alter table public.gym_exercises add column external_exercise_id text, add column exercise_provider text, add column muscle_group text, add column equipment text;
create index gym_exercises_external_id_idx on public.gym_exercises (exercise_provider, external_exercise_id) where external_exercise_id is not null;
alter table public.gym_workout_plans drop constraint gym_workout_plans_source_check;
alter table public.gym_workout_plans add constraint gym_workout_plans_source_check check (source in ('custom', 'recommended', 'generated'));

create or replace function public.gym_save_generated_plan(template jsonb, make_active boolean default false)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare new_plan_id uuid; new_day_id uuid; day jsonb; exercise jsonb; day_index integer := 0; exercise_index integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if nullif(trim(template->>'name'), '') is null or jsonb_typeof(template->'days') <> 'array' or jsonb_array_length(template->'days') not between 3 and 6 then raise exception 'Invalid generated plan'; end if;
  if make_active then update public.gym_workout_plans set is_active = false where user_id = auth.uid() and is_active; end if;
  insert into public.gym_workout_plans (user_id, name, description, is_active, source) values (auth.uid(), left(template->>'name', 120), left(template->>'description', 500), make_active, 'generated') returning id into new_plan_id;
  for day in select value from jsonb_array_elements(template->'days') loop
    if nullif(trim(day->>'name'), '') is null or jsonb_typeof(day->'exercises') <> 'array' or jsonb_array_length(day->'exercises') > 7 then raise exception 'Invalid workout day'; end if;
    insert into public.gym_workout_days (plan_id, name, day_order) values (new_plan_id, left(day->>'name', 120), day_index) returning id into new_day_id;
    exercise_index := 0;
    for exercise in select value from jsonb_array_elements(day->'exercises') loop
      if nullif(trim(exercise->>'name'), '') is null or (exercise->>'sets')::integer not between 1 and 10 or nullif(trim(exercise->>'reps'), '') is null then raise exception 'Invalid exercise'; end if;
      insert into public.gym_exercises (workout_day_id, name, sets, target_reps, exercise_order, external_exercise_id, exercise_provider, muscle_group, equipment)
      values (new_day_id, left(exercise->>'name', 160), (exercise->>'sets')::integer, left(exercise->>'reps', 40), exercise_index, nullif(exercise->>'id', ''), case when exercise->>'id' like 'fallback-%' then 'buff-me-up' else 'musclewiki' end, nullif(exercise->>'primaryMuscle', ''), nullif(exercise->>'equipment', ''));
      exercise_index := exercise_index + 1;
    end loop;
    day_index := day_index + 1;
  end loop;
  return new_plan_id;
end;
$$;
revoke all on function public.gym_save_generated_plan(jsonb, boolean) from public;
grant execute on function public.gym_save_generated_plan(jsonb, boolean) to authenticated;
